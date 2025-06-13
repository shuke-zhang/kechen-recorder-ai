import { WebSocket } from '@/store/modules/socket/webSocket'

export default class DoubaoRecorderCoreManager extends EventEmitter {
  private socketTask: WebSocket | null = null
  private handlerInterval: NodeJS.Timeout | null = null
  private audioDataList: ArrayBuffer[] = []
  private hasSentLastFrame = false
  private onTextChange?: (text: string) => void

  public socketUrl = 'ws://192.168.3.22:8765'
  public resultText = ''
  public resultTextTemp = ''
  // 是否正在录音
  public isRunning = false
  public isReady = false

  constructor(
    onTextChange?: (text: string) => void,
  ) {
    super()
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
        this.sendLastData()
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
      if (!this.socketUrl)
        return

      this.socketTask = new WebSocket(this.socketUrl, false)
      this.socketTask.reset()
      this.socketTask.initSocket()
      console.log('初始化Socket', this.socketUrl)

      this.socketTask.on('open', () => {
        this.emit('log', '✅ WebSocket已连接')
        console.log('WebSocket已连接-0DoubaoRecorderCoreManager')

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
    this.handlerInterval = setInterval(() => {
      if (!this.socketTask?.isConnect || this.hasSentLastFrame) {
        this.clearHandlerInterval()
        return
      }
      const buffer = this.audioDataList.shift()
      if (!buffer)
        return
      // 发送第一帧

      // if (this.audioDataList.length === 0) {
      //   // 发送最后一帧
      //   const endPcmData = {
      //     data: {
      //       data: buffer, // 空帧
      //       isEnd: true,
      //     },
      //   }
      //   console.log('发送最后一帧', endPcmData)

      //   // this.socketTask.sendMessage(endPcmData)
      //   return
      // }

      const pcmData = {
        data: {
          data: this.toBase64(buffer),
          isEnd: false,
        },
      }

      this.socketTask.sendMessage(pcmData)
      console.log('发送音频数据-中间帧', pcmData)
      this.emit('log', '📤 发送中间帧')
    }, 40)
  }

  /** 发送结束帧，通知识别完成 */
  private sendLastData() {
    if (this.hasSentLastFrame || !this.socketTask?.isConnect)
      return
    const emptyOneSample = new Int16Array([0]) // 一个 16 位的 0
    // 将 Int16Array 转为 base64 格式
    const buffer = emptyOneSample.buffer
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const lastFrameData = btoa(binary)
    const lastFrame = {
      data: {
        data: lastFrameData,
        isEnd: true,
      },
    }
    this.socketTask.sendMessage(lastFrame)
    console.log('发送最后一帧', lastFrame)

    this.emit('log', '📤 发送最后一帧')
    this.hasSentLastFrame = true
  }

  /** 处理识别返回结果 */
  private handleResult(data: string) {
    console.log('获取到豆包语音识别socket结果', data)
    // this.onTextChange?.(data)
  }

  private toBase64(buffer: ArrayBuffer) {
    return uni.arrayBufferToBase64(buffer)
  }

  private encodeInt16ToDHexString(data: Int16Array, prefix = 'd'): string {
    let result = prefix
    for (let i = 0; i < data.length; i++) {
      const val = data[i]
      const low = val & 0xFF // 小端：低字节在前
      const high = (val >> 8) & 0xFF
      result += `\\x${low.toString(16).padStart(2, '0')}`
      result += `\\x${high.toString(16).padStart(2, '0')}`
    }
    return result
  }

  private clearHandlerInterval() {
    if (this.handlerInterval) {
      clearInterval(this.handlerInterval)
      this.handlerInterval = null
    }
  }
}
