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
  private audioChunks: Uint8Array[] = []
  private socketTask: WebSocket | null = null
  private socketUrl = ''
  private audio: any = null // 用于控制播放的音频对象
  /**
   * @description 音频实例
   */
  private audioInstance: UniNamespace.InnerAudioContext | null = null
  public isPlaying = false

  constructor(options: XunFeiSpeechSynthesisOptions) {
    super()
    this.APPID = options.APPID
    this.APISecret = options.APISecret
    this.APIKey = options.APIKey
    this.url = options.url
    this.host = options.host
    this.audioInstance = uni.createInnerAudioContext()
  }

  // 用于转化单次文本为语音
  public synthesizeText(text: string) {
    this.convertTextToSpeech(text)
  }

  public convertTextToSpeech(text: string) {
    // 每次调用时都初始化 socket
    this.initSocket(() => {
      this.sendMessage(text) // WebSocket 连接成功后再发送消息
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
        callback() // 连接成功后执行回调，发送消息
      })

      this.socketTask.on('message', (message) => {
        this.onSocketMessage(message)
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
        aue: 'lame',
        sfl: 1,
        auf: 'audio/L16;rate=16000',
        vcn: 'x4_lingxiaoying_em_v2',
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

    console.log(this.socketTask?.isConnect, 'socket是否连接')
    if (this.socketTask && this.socketTask.isConnect) {
      this.socketTask.sendMessage(params)
      console.log('发送消息：', params)
    }
    else {
      console.error('WebSocket 未连接，无法发送消息')
    }
  }

  // 暂停播放
  public pause() {
    if (this.audio && this.isPlaying) {
      this.audio.pause()
      this.isPlaying = false
      this.emit('log', '✅ 暂停播放')
    }
  }

  // 停止播放并清除缓存
  public stop() {
    if (this.audio) {
      this.audio.stop()
      this.isPlaying = false
      this.audioChunks = [] // 清空缓冲数据
      this.emit('log', '✅ 停止播放并清除缓存')

      // 停止 WebSocket
      if (this.socketTask && this.socketTask.isConnect) {
        this.socketTask.closeSocket()
        this.emit('log', '✅ WebSocket已关闭')
      }
    }
  }

  // 继续播放
  public resume() {
    if (this.audio && !this.isPlaying) {
      this.audio.play()
      this.isPlaying = true
      this.emit('log', '✅ 继续播放')
    }
  }

  private onSocketMessage(data: string) {
    const message = JSON.parse(data)
    console.log('接收消息', message)
    if (!this.audioInstance) {
      this.emit('log', 'audioInstance尚未初始化')
      return
    }

    if (message.data?.status !== undefined) {
      if (message.code !== 0) {
        this.emit('log', `❌ 合成失败: ${message.message}`)
        return
      }

      const audioChunk = Base64.toUint8Array(message.data.audio)
      this.audioChunks.push(audioChunk)

      if (message.data.status === 2) {
        const fullAudio = this.concatUint8Arrays(this.audioChunks)
        const base64 = uni.arrayBufferToBase64(fullAudio.buffer as ArrayBuffer)

        this.audioInstance.src = `data:audio/mp3;base64,${base64}`
        this.audioInstance.play()

        this.isPlaying = true
        this.audioChunks = [] // 清空缓存

        // 设置事件处理
        this.audioInstance.onEnded(() => {
          this.isPlaying = false
          this.emit('log', '✅ 播放完成')

          // 播放完成后关闭WebSocket并停止播放
          if (this.socketTask && this.socketTask.isConnect) {
            this.socketTask.closeSocket()
            this.emit('log', '✅ WebSocket已关闭')
          }

          this.stop() // 调用stop停止播放
        })

        this.audioInstance.onError((err: Error) => {
          console.error('播放出错：', err)
          this.emit('log', '❌ 音频播放失败')
        })
      }
    }
  }

  private concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    return result
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
