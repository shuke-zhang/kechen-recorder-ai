import type { DoubaoSpeechSynthesisOptions } from './types'
import { WebSocket } from '@/store/modules/socket/webSocket'

const APPID = '3810425215'
const AccessToken = 'mHT8sdy_o3wVHNSIw9jfJqCawEu0Aq5s'
const SecretKey = 'WcH7__6VXDbmzKbXaNkLt9PN9kFCyFy0'
const url = 'wss://openapi.xf-yun.com/v1/private/s453a306'
const host = 'openapi.xf-yun.com'

export class SpeechSynthesisDoubao extends EventEmitter {
  private APPID = APPID
  private AccessToken = AccessToken
  private SecretKey = SecretKey
  private url = url
  private host = host
  private socketInstance: WebSocket | null = null
  private socketUrl = ''

  /** socket 是否正在初始化中 */
  public isSocketRunning = false

  constructor(options: DoubaoSpeechSynthesisOptions) {
    super()
    this.APPID = options.APPID
    this.AccessToken = options.AccessToken
    this.SecretKey = options.SecretKey
    this.url = options.url
    this.host = options.host
    this.initSocket()
    this.emit('test', '初始化完成')
  }

  public synthesizeSpeechStream() {
    this.emit('audio', 'synthesizeSpeechStream触发了')
  }

  private onSocketMessage(text: string) {
    const message = JSON.parse(text) as any
    console.log('收到消息:', message)
  }

  private initSocket() {
    this.socketUrl = this.getWebSocketUrl().baseUrl
    const header = this.getWebSocketUrl().header
    this.isSocketRunning = true
    this.socketInstance = new WebSocket(this.socketUrl, header, false)
    this.socketInstance.reset()
    this.socketInstance.initSocket()
    this.socketInstance.on('open', () => {
      this.emit('log', '✅ WebSocket已连接')
      this.isSocketRunning = false
    })
    this.socketInstance.on('message', (message) => {
      this.onSocketMessage(message)
    })
    this.socketInstance.on('close', () => {
      this.emit('log', '🔌 WebSocket 已关闭')
      this.isSocketRunning = false
    })

    this.socketInstance.on('error', (err) => {
      console.error('❌ WebSocket 错误:', err)
      this.emit('log', '🔌 WebSocket 错误')
      this.isSocketRunning = false
    })
  }

  private genSessionId() {
    return Date.now().toString(16) + Math.random().toString(16).slice(2, 10)
  }

  private getWebSocketUrl(): {
    baseUrl: string
    header: object
  } {
    const appId = this.APPID
    const token = this.AccessToken
    const resourceId = 'volc.service_type.10029'
    const baseUrl = 'wss://openspeech.bytedance.com/api/v3/tts/bidirection'

    if (!appId || !token) {
      throw new Error('appId 或 token 缺失')
    }

    const connectId = this.genSessionId()
    const header = {
      'X-Api-App-Key': appId,
      'X-Api-Access-Key': token,
      'X-Api-Resource-Id': resourceId,
      'X-Api-Connect-Id': connectId,
    }

    return {
      baseUrl,
      header,
    }
  }
}
