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

  constructor(options: XunFeiSpeechSynthesisOptions) {
    super()
    this.APPID = options.APPID
    this.APISecret = options.APISecret
    this.APIKey = options.APIKey
    this.url = options.url
    this.host = options.host
  }

  // 用于转化单次文本为语音
  public synthesizeText(text: string) {
    this.convertTextToSpeech(text)
  }

  /**
   * @description: 转化文本为语音
   */
  public convertTextToSpeech(text: string) {
    this.initSocket(() => {
      this.sendMessage(text) // WebSocket 连接成功后再发送消息
      this.emit('play', `语音合成开始: ${text}`)
      console.log('语音合成开始:', text)
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
        // this.initStreamPlay() // 使用自己的播放器
        callback() // 连接成功后执行回调，发送消息
      })
      this.socketTask.on('message', (message) => {
        this.onSocketMessage(message)
      })
      this.socketTask.on('close', () => {
        this.emit('log', '🔌 WebSocket 已关闭')
      })

      this.socketTask.on('error', (err) => {
        console.error('❌ WebSocket 错误:', err)
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
        vcn: 'xiaoyan', // aisjinger
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

    // 处理音频数据 - 播放
    if (message.data.audio) {
      // this.streamPlay(message.data.audio, 16000, message.data.status === 2)
      // const buffer = this.base64ToArrayBuffer(message.data.audio)
      this.emit('audio', message.data.audio)
    }
  }

  // 停止播放并清除缓存
  public stop() {
    // this.destroyStreamPlay()
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
    return base64Text
  }

  public base64ToArrayBuffer(base64Data: string) {
    // 1. 解码Base64为二进制字符串
    const binaryString = atob(base64Data)

    // 2. 创建一个新的Uint8Array来保存解码后的数据
    const arrayBuffer = new ArrayBuffer(binaryString.length)
    const uint8Array = new Uint8Array(arrayBuffer)

    // 3. 将二进制字符串中的每个字符转换为Uint8Array的相应值
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i)
    }

    return arrayBuffer
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
