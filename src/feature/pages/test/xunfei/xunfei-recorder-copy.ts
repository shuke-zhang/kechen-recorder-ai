import CryptoJS from 'crypto-js'
import { Base64 } from 'js-base64'
import { RecorderCoreManager } from '../recorder-core/index'
import type { XunFeiRecorderOptions } from './types'
import { WebSocket } from '@/store/modules/socket/webSocket'

export default class XunfeiRecorder extends EventEmitter {
  private recorder: RecorderCoreManager | null = null
  private socketTask: WebSocket | null = null
  private isRunning = false
  private audioDataList: ArrayBuffer[] = []
  private handlerInterval: NodeJS.Timeout | null = null

  private APPID = ''
  private APISecret = ''
  private APIKey = ''
  private url: string | undefined = ''
  private host: string | undefined = ''
  private onTextChange?: (text: string) => void
  private ctx: any = null

  public resultText = ''
  public resultTextTemp = ''
  public socketUrl = ''

  constructor(
    options: XunFeiRecorderOptions,
    ctx: any,
    onTextChange?: (text: string) => void,
  ) {
    super()
    this.APPID = options.APPID
    this.APISecret = options.APISecret
    this.APIKey = options.APIKey
    this.url = options.url
    this.host = options.host
    this.ctx = ctx
    this.onTextChange = onTextChange
  }

  public get isRecording() {
    return this.isRunning
  }

  public start() {
    console.log('开始录音-start')
    if (this.isRunning)
      return
    this.isRunning = true
    this.initRecorder()
    this.recorder?.start()
  }

  public stop() {
    if (!this.isRunning)
      return
    this.isRunning = false
    this.recorder?.stop()
    this.clearHandlerInterval()
    this.sendLastFrame()
    this.socketTask?.closeSocket('手动停止')
    this.recorder = null
  }

  public destroy() {
    this.stop()
    this.socketTask = null
  }

  private initRecorder() {
    this.recorder = new RecorderCoreManager(this.ctx)
    this.recorder.on('onStart', () => {
      setTimeout(() => this.initSocket(), 100)
    })
    this.recorder.on('onFrameRecorded', ({ buffers }) => {
      if (!this.isRunning)
        return
      this.audioDataList.push(buffers)
    })
    this.recorder.on('onStop', () => {})
  }

  private initSocket() {
    try {
      this.socketUrl = this.getWebSocketUrl() as string
      if (!this.socketUrl)
        return

      this.socketTask = new WebSocket(this.socketUrl)
      this.socketTask.reset()
      this.socketTask.initSocket()

      this.socketTask.on('open', () => {
        setTimeout(() => this.sendAudioData(), 100)
      })
      this.socketTask.on('message', msg => this.handleResult(msg))
      this.socketTask.on('close', () => {
        this.emit('log', '🔌 WebSocket 已关闭')
      })
      this.socketTask.on('error', (err) => {
        console.error('WS错误:', err)
      })
    }
    catch (error) {
      this.emit('log', error)
    }
  }

  private sendAudioData() {
    if (!this.socketTask?.isConnect)
      return
    const firstAudio = this.audioDataList.shift()
    const firstFrame = {
      common: { app_id: this.APPID },
      business: {
        language: 'zh_cn',
        domain: 'iat',
        accent: 'mandarin',
        vad_eos: 5000,
        dwa: 'wpgs',
      },
      data: {
        status: 0,
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: this.toBase64(firstAudio!),
      },
    }
    this.socketTask.sendMessage(firstFrame)
    this.emit('log', '🔊 开始发送第一帧')
    this.handlerInterval = setInterval(() => {
      if (!this.socketTask?.isConnect)
        return this.clearHandlerInterval()

      if (this.audioDataList.length === 0) {
        if (this.isRunning)
          return
        this.sendLastFrame()
        this.emit('log', '🔊 sendAudioData-发送最后一帧')
        this.clearHandlerInterval()
        return
      }

      const buffer = this.audioDataList.shift()
      const base64 = this.toBase64(buffer!)

      const midFrame = {
        data: {
          status: 1,
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: base64,
        },
      }
      this.socketTask.sendMessage(midFrame)
      this.emit('log', '🔊 发送中间帧')
    }, 40)
  }

  private sendLastFrame() {
    if (!this.socketTask?.isConnect)
      return
    const lastFrame = {
      data: {
        status: 2,
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: '',
      },
    }
    this.socketTask.sendMessage(lastFrame)
    this.emit('log', '🔊 发送最后一帧')
  }

  private handleResult(data: string) {
    console.log('handleResult-服务器接收到结果:', data)

    try {
      const json = JSON.parse(data)
      if (json.code !== 0) {
        console.error('识别错误:', json)
        return
      }

      const result = json.data?.result
      if (!result)
        return

      const ws = result.ws || []
      let text = ''
      for (const seg of ws) text += seg.cw[0].w

      if (result.pgs === 'apd') {
        this.resultText = this.resultTextTemp
        this.resultTextTemp += text
      }
      else {
        this.resultText += text
      }

      this.onTextChange?.(this.resultTextTemp || this.resultText)

      if (json.data.status === 2) {
        this.socketTask?.closeSocket('识别完成')
      }
    }
    catch (err) {
      console.error('解析失败', err)
    }
  }

  private getWebSocketUrl(): string | Error {
    const date = (new Date() as any).toGMTString()

    // 参数完整性检查
    if (!this.url || !this.host || !this.APIKey || !this.APISecret) {
      console.error('❌ WebSocket 参数缺失：', {
        url: this.url,
        host: this.host,
        APIKey: this.APIKey,
        APISecret: this.APISecret,
      })
      return new Error('WebSocket 参数不完整')
    }

    const originStr = `host: ${this.host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`
    const sha = CryptoJS.HmacSHA256(originStr, this.APISecret)
    const signature = CryptoJS.enc.Base64.stringify(sha)

    const auth = `api_key="${this.APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
    const authorization = Base64.encode(auth)

    // ⚠️ 重要：参数需要编码，避免 WebSocket 真机报错
    const encodedAuthorization = encodeURIComponent(authorization)
    const encodedDate = encodeURIComponent(date)
    const encodedHost = encodeURIComponent(this.host)

    const finalUrl = `${this.url}?authorization=${encodedAuthorization}&date=${encodedDate}&host=${encodedHost}`

    console.log('📡 最终 WebSocket URL:', finalUrl)
    return finalUrl
  }

  private toBase64(buffer: ArrayBuffer) {
    return uni.arrayBufferToBase64(buffer)
  }

  private clearHandlerInterval() {
    if (this.handlerInterval) {
      clearInterval(this.handlerInterval)
      this.handlerInterval = null
    }
  }
}
