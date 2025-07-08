import { Base64 } from 'js-base64'
import CryptoJS from 'crypto-js'
import type { XunFeiRecorderOptions } from './types'
import { WebSocket } from '@/store/modules/socket/webSocket'

/**
 * @description 讯飞语音识别class --- https://www.xfyun.cn/doc/asr/voicedictation/API.html#%E6%8E%A5%E5%8F%A3%E8%AF%B4%E6%98%8E
 */
export default class RecorderCoreManager extends EventEmitter {
  private APPID = ''
  private APISecret = ''
  private APIKey = ''
  private url = ''
  private host = ''
  private onTextChange?: (text: string) => void

  private socketTask: WebSocket | null = null
  private handlerInterval: NodeJS.Timeout | null = null
  private audioDataList: ArrayBuffer[] = []
  private hasSentLastFrame = false

  public socketUrl = ''
  public resultText = ''
  public resultTextTemp = ''
  // 是否正在录音
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
    return new Promise((resolve, reject) => {
      try {
        // ❗ 无论如何都尝试停止识别（不要依赖 isRunning 判断）
        this.isRunning = false
        this.sendLastFrame()
        this.clearHandlerInterval()

        // 延迟关闭 WebSocket，确保最后一帧发送完成
        setTimeout(() => {
          this.socketTask?.closeSocket('手动关闭')
          this.socketTask = null
          resolve('stop')
        }, 300) // 可以减到 300ms 提升响应
      }
      catch (error) {
        reject(error)
      }
    })
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
      console.log('讯飞socketUrl', this.socketUrl)

      if (!this.socketUrl)
        return

      this.socketTask = new WebSocket(this.socketUrl, false)
      this.socketTask.reset()
      this.socketTask.initSocket()

      this.socketTask.on('open', () => {
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
        audio: '',
      },
    }

    this.socketTask.sendMessage(firstFrame)

    this.emit('log', '📤 发送第一帧')

    this.handlerInterval = setInterval(() => {
      if (!this.socketTask?.isConnect || this.hasSentLastFrame) {
        this.clearHandlerInterval()
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
      // this.emit('log', '📤 发送中间帧')
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
      if (json.code === 10165) {
        console.warn('暂无完整的音频内容--=10165')

        // 停止录音识别并重新开始
        this.stop().then(() => {
          this.start()
        })
        return
      }
      if (json.code !== 0) {
        console.error('❌ 识别错误:', json)
        return
      }

      const result = json.data?.result

      if (!result)
        return

      const ws = result.ws || []
      let text = ''
      for (const seg of ws) {
        if (seg.cw && seg.cw[0]) {
          text += seg.cw[0].w
        }
      }

      // 空内容不处理
      if (!text.trim())
        return

      const pgs = result.pgs
      const rg = result.rg || []

      if (pgs === 'apd') {
        // 当前结果是最终追加文本，可确认保存
        this.resultText = this.resultTextTemp || ''
      }

      // 动态修正逻辑：无论是 apd 还是 rpl 都应作用于 resultText
      if (pgs === 'rpl' || pgs === 'rlt') {
        const [start, end] = rg
        const oldChars = (this.resultText || '').split('')
        oldChars.splice(start, end - start + 1, ...text.split(''))
        this.resultTextTemp = oldChars.join('')
      }
      else {
        // 默认处理：直接追加到 resultText（用于非动态修正场景）
        this.resultTextTemp = (this.resultText || '') + text
      }

      // 实时触发变更回调
      this.onTextChange?.(this.resultTextTemp || this.resultText || '')

      // 最后一帧
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
      return new Error(`以下字段缺失：${missingKeys.join(', ')}`)
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
