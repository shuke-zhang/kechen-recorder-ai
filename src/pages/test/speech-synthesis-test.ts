import { WebSocket } from '@/store/modules/socket/webSocket-plus'

export class SpeechSynthesisTest extends EventEmitter {
  private socketInstance: WebSocket | null = null
  private socketUrl = ''
  /** socket 是否正在初始化中 */
  public isSocketRunning = false

  constructor() {
    super()
    this.initSocket()
    console.log('初始化k开始')
  }

  public synthesizeSpeechStream() {
    this.emit('audio', 'synthesizeSpeechStream触发了')
  }

  /**
   * @description 发送流式文本
   */
  public async sendTextStream(text: string) {
    //  步骤1：启动连接事件（发送 EVENT_Start_Connection）
    console.log(text, '触发sendTextStream')
    this.socketInstance?.sendMessage({ text })
  }

  private onSocketMessage(text: Uint8Array) {
    console.log('收到消息:', text)
  }

  private initSocket() {
    this.socketUrl = 'http://192.168.3.111:5000'
    this.isSocketRunning = true
    this.socketInstance = new WebSocket(this.socketUrl, {}, false, true)
    this.socketInstance.reset()
    this.socketInstance.initSocket()
    this.socketInstance.on('open', () => {
      this.emit('log', '✅ WebSocket已连接')
      this.isSocketRunning = false
    })
    this.socketInstance.on('message', (message) => {
      this.emit('log', '✅ WebSocket收到消息')
      this.onSocketMessage(message)
    })
    this.socketInstance.on('close', () => {
      this.emit('log', '🔌 WebSocket 已关闭')
      this.isSocketRunning = false
    })

    this.socketInstance.on('error', (err) => {
      console.error('❌ WebSocket 错误！！！！！！！！！！:', err)
      this.emit('log', '🔌 WebSocket 错误')
      this.isSocketRunning = false
    })
  }
}
