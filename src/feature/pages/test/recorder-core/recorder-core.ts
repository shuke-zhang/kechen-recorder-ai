import { Base64 } from 'js-base64'
import CryptoJS from 'crypto-js'
import type { XunFeiRecorderOptions } from '../xunfei/types'
import { WebSocket } from '@/store/modules/socket/webSocket'

export default class RecorderCoreManager extends EventEmitter {
  private APPID = ''
  private APISecret = ''
  private APIKey = ''
  private url: string | undefined = ''
  private host: string | undefined = ''
  private onTextChange?: (text: string) => void

  private socketTask: WebSocket | null = null
  private handlerInterval: NodeJS.Timeout | null = null
  private audioDataList: ArrayBuffer[] = []
  private hasSentLastFrame = false

  public socketUrl = ''
  public resultText = ''
  public resultTextTemp = ''
  public isRunning = false
  public isReady = false

  constructor(
    options: XunFeiRecorderOptions,
    onTextChange?: (text: string) => void,
  ) {
    super()
    this.APPID = options.APPID
    this.APISecret = options.APISecret
    this.APIKey = options.APIKey
    this.url = options.url
    this.host = options.host
    this.onTextChange = onTextChange
  }

  /** 初始化识别流程 */
  public start() {
    if (this.isRunning)
      return
    console.log('开始录音-class-start')
    this.reset()
    this.isRunning = true
    this.resultText = ''
    this.resultTextTemp = ''
    this.audioDataList = []
    this.hasSentLastFrame = false
    this.initSocket()
  }

  /** 关闭识别流程 */
  public stop() {
    if (!this.isRunning)
      return
    this.isRunning = false
    this.sendLastFrame()
    this.clearHandlerInterval()
    this.socketTask?.closeSocket('手动关闭')
    this.socketTask = null
  }

  /** 销毁识别器，彻底释放资源 */
  public destroy() {
    this.stop()
    this.reset()
  }

  /** 推送一帧音频数据 */
  public pushAudioData(data: ArrayBuffer) {
    if (!this.isRunning || this.hasSentLastFrame)
      return
    this.audioDataList.push(data)
  }

  /** 初始化 WebSocket 连接 */
  private initSocket() {
    try {
      this.socketUrl = this.getWebSocketUrl() as string
      if (!this.socketUrl)
        return
      console.log('初始化Socket-class')

      this.socketTask = new WebSocket(this.socketUrl, false)
      this.socketTask.reset()
      this.socketTask.initSocket()

      this.socketTask.on('open', () => {
        console.log('✅ WebSocket已连接')

        this.emit('log', '✅ WebSocket已连接')
        setTimeout(() => this.sendAudioData(), 100)
      })

      this.socketTask.on('message', msg => this.handleResult(msg))

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

  /** 持续发送音频数据帧 */
  private sendAudioData() {
    if (!this.socketTask?.isConnect)
      return
    const firstAudio = this.audioDataList.shift()
    if (!firstAudio)
      return

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
        audio: this.toBase64(firstAudio),
      },
    }

    this.socketTask.sendMessage(firstFrame)
    this.emit('log', '📤 发送第一帧')

    this.handlerInterval = setInterval(() => {
      if (!this.socketTask?.isConnect || this.hasSentLastFrame) {
        this.clearHandlerInterval()
        return
      }

      if (this.audioDataList.length === 0) {
        if (!this.isRunning) {
          this.sendLastFrame()
          this.clearHandlerInterval()
        }
        return
      }

      const buffer = this.audioDataList.shift()
      if (!buffer)
        return

      const midFrame = {
        data: {
          status: 1,
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: this.toBase64(buffer),
        },
      }

      this.socketTask.sendMessage(midFrame)
      this.emit('log', '📤 发送中间帧')
    }, 40)
  }

  /** 发送结束帧，通知识别完成 */
  private sendLastFrame() {
    if (this.hasSentLastFrame || !this.socketTask?.isConnect)
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
    this.emit('log', '📤 发送最后一帧')
    this.hasSentLastFrame = true
  }

  /** 处理识别返回结果 */
  private handleResult(data: string) {
    try {
      const json = JSON.parse(data)
      if (json.code !== 0) {
        console.error('❌ 识别错误:', json)
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
      console.log('识别结果:', this.resultText)

      this.onTextChange?.(this.resultTextTemp || this.resultText)

      if (json.data.status === 2) {
        this.sendLastFrame()
        this.socketTask?.closeSocket('识别完成')
      }
    }
    catch (err) {
      console.error('❌ JSON解析失败:', err)
    }
  }

  /** 生成鉴权后的 WS URL */
  private getWebSocketUrl(): string | Error {
    const date = (new Date() as any).toGMTString()
    if (!this.url || !this.host || !this.APIKey || !this.APISecret) {
      return new Error('WebSocket 参数不完整')
    }

    const originStr = `host: ${this.host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`
    const sha = CryptoJS.HmacSHA256(originStr, this.APISecret)
    const signature = CryptoJS.enc.Base64.stringify(sha)
    const auth = `api_key="${this.APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
    const authorization = Base64.encode(auth)

    return `${this.url}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(this.host)}`
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
