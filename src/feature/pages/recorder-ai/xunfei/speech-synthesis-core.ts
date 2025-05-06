import { Base64 } from 'js-base64'
import CryptoJS from 'crypto-js'
import type { XunFeiSpeechSynthesisOptions } from './types'
import { WebSocket } from '@/store/modules/socket/webSocket'

export default class SpeechSynthesisCore extends EventEmitter {
  private APPID = ''
  private APISecret = ''
  private APIKey = ''
  private url = ''
  private host = ''
  private socketTask: WebSocket | null = null
  private socketUrl = ''
  /**
   * @description: 用于接收音频数据的回调函数
   */
  private streamPlay: (pcm: string, sampleRate: number) => void = () => {} // 用于接收音频数据的回调函数
  /**
   * @description: 销毁音频数据的回调函数
   */
  private destroyStreamPlay: () => void = () => {} // 用于销毁音频数据的回调函数
  /**
   * @description: 初始化音频数据的回调函数
   */
  private initStreamPlay: () => void = () => {} // 初始化播放器

  constructor(options: XunFeiSpeechSynthesisOptions, fetchOptions: {
    streamPlay: (pcm: string, sampleRate: number) => void
    destroyStreamPlay: () => void
    initStreamPlay: () => void
  }) {
    super()
    this.APPID = options.APPID
    this.APISecret = options.APISecret
    this.APIKey = options.APIKey
    this.url = options.url
    this.host = options.host
    this.streamPlay = fetchOptions.streamPlay
    this.destroyStreamPlay = fetchOptions.destroyStreamPlay
    this.initStreamPlay = fetchOptions.initStreamPlay
  }

  // 用于转化单次文本为语音
  public synthesizeText(text: string) {
    this.convertTextToSpeech(text)
  }

  /**
   * @description: 转化文本为语音
   */
  public convertTextToSpeech(text: string) {
    // 每次调用时都初始化 socket
    this.initSocket(() => {
      this.sendMessage(text) // WebSocket 连接成功后再发送消息
      this.emit('play', `语音合成开始: ${text}`)
    })
  }

  private initSocket(callback: () => void) {
    try {
      this.socketUrl = this.getWebSocketUrl() as string
      if (!this.socketUrl)
        return

      // 重新初始化 WebSocket
      this.socketTask = new WebSocket(this.socketUrl, false)
      this.socketTask.reset()
      this.socketTask.initSocket()

      this.socketTask.on('open', () => {
        this.emit('log', '✅ WebSocket已连接')
        this.initStreamPlay()
        callback() // 连接成功后执行回调，发送消息
      })
      this.socketTask.on('message', (message) => {
        this.onSocketMessage(message)
      })
      this.socketTask.on('close', () => {
        this.emit('log', '🔌 WebSocket 已关闭')
        this.destroyStreamPlay()
      })

      this.socketTask.on('error', (err) => {
        console.error('❌ WebSocket 错误:', err)
        this.destroyStreamPlay()
      })
    }
    catch (error) {
      this.emit('log', `❌ 初始化Socket失败: ${error}`)
    }
  }

  private sendMessage(text: string) {
    const params = {
      common: { app_id: this.APPID },
      business: {
        aue: 'raw',
        sfl: 1,
        auf: 'audio/L16;rate=16000',
        vcn: 'aisjinger',
        speed: 50,
        volume: 50,
        pitch: 50,
        tte: 'UTF8',
      },
      data: {
        status: 2,
        text: this.textToBase64(text),
      },
    }
    if (this.socketTask && this.socketTask.isConnect) {
      this.socketTask.sendMessage(params)
    }
    else {
      console.error('WebSocket 未连接，无法发送消息')
    }
  }

  private onSocketMessage(data: string) {
    const message = JSON.parse(data)
    console.log('接收消息', message)
    // 处理音频数据 - 播放
    this.streamPlay(message.data.audio, 16000)
  }

  // 停止播放并清除缓存
  public stop() {
    this.destroyStreamPlay()
    this.emit('log', '✅ 停止播放并清除缓存')
    // 停止 WebSocket
    if (this.socketTask && this.socketTask.isConnect) {
      this.socketTask.closeSocket()
      this.emit('log', '✅ WebSocket已关闭')
    }
    this.emit('stop', '停止播放并清除缓存')
  }

  private textToBase64(text: string): string {
    const codeUnits = new Uint8Array(text.length * 3)
    let length = 0

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i)
      if (code < 0x80) {
        codeUnits[length++] = code
      }
      else if (code < 0x800) {
        codeUnits[length++] = 0xC0 | (code >> 6)
        codeUnits[length++] = 0x80 | (code & 0x3F)
      }
      else {
        codeUnits[length++] = 0xE0 | (code >> 12)
        codeUnits[length++] = 0x80 | ((code >> 6) & 0x3F)
        codeUnits[length++] = 0x80 | (code & 0x3F)
      }
    }

    const utf8 = codeUnits.subarray(0, length)
    const base64Text = uni.arrayBufferToBase64(utf8.buffer as ArrayBuffer)
    console.log(base64Text, 'Base64编码的文本')
    return base64Text
  }

  private getWebSocketUrl(): string | Error {
    const date = (new Date() as any).toGMTString()
    const missingKeys: string[] = []

    if (!this.url)
      missingKeys.push('url')
    if (!this.host)
      missingKeys.push('host')
    if (!this.APIKey)
      missingKeys.push('APIKey')
    if (!this.APISecret)
      missingKeys.push('APISecret')
    if (!this.APPID)
      missingKeys.push('APPID')

    if (missingKeys.length > 0) {
      throw new Error(`以下字段缺失：${missingKeys.join(', ')}`)
    }

    const originStr = `host: ${this.host}
date: ${date}
GET /v2/tts HTTP/1.1`
    const sha = CryptoJS.HmacSHA256(originStr, this.APISecret)
    const signature = CryptoJS.enc.Base64.stringify(sha)
    const auth = `api_key="${this.APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
    const authorization = Base64.encode(auth)

    return `${this.url}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${this.host}`
  }
}
