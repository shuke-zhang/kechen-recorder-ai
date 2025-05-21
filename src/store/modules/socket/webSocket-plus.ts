/**
 * WebSocket 类，用于管理 WebSocket 连接和消息的发送和接收。
 * @param url WebSocket 服务器的 URL。
 * @param header 可选的 WebSocket 连接头信息。
 * @param autoReconnect 可选的布尔值，指示是否启用自动重连功能。默认为 true。
 * @param isRawResponse 可选的布尔值，指示收到的服务器消息是否直接返回，不用再解析。默认为 false。
 */
export class WebSocket extends EventEmitter<{
  connect: () => void
  message: (messageData: any) => void
  open: (open: UniApp.OnSocketOpenCallbackResult) => void
  close: (reason: string) => void
  error: (error?: string) => void
  log: (msg: string) => void
}> {
  url: string
  header: object
  isCreate: boolean
  isConnect: boolean
  isInitiative: boolean
  socketInstance: null | UniNamespace.SocketTask = null
  reconnectTimer: NodeJS.Timeout | null = null
  retryTime = 5
  /** 当关闭后是否自动重连 */
  autoReconnect = true // ✅ 是否启用自动重连（默认开启）
  /** 是否保留服务器返回的原始消息 */
  isRawResponse = false
  constructor(url = 'ws://192.168.3.117:8899/demo', header = {}, autoReconnect = true, isRawResponse = false) {
    super()
    this.url = url
    this.header = header

    this.autoReconnect = autoReconnect
    this.isRawResponse = isRawResponse
    this.isCreate = false
    this.isConnect = false
    this.isInitiative = false
  }

  // 初始化连接
  initSocket = debounce(() => {
    this.isCreate = false
    this.isConnect = false
    this.isInitiative = false
    this.socketInstance = null
    this.emit('log', '🛜 初始化websocket')

    this.socketInstance = uni.connectSocket({
      url: this.url,
      header: this.header,
      success: () => {
        this.isCreate = true
        this.emit('connect')
        // #ifdef APP
        this.createSocket() // ✅ 成功之后再注册监听器
        // #endif
      },
      fail: (err) => {
        console.error(err)
        this.emit('log', '🛜 初始化失败!')
        this.isCreate = false
      },
    })
    // #ifdef MP-WEIXIN
    this.createSocket() // ✅ 成功之后再注册监听器
    // #endif
  })

  createSocket() {
    if (!this.isCreate || !this.socketInstance) {
      this.emit('log', '🛜 createSocket 被跳过，未成功创建')
      return
    }

    try {
      this.emit('log', '🛜 WebSocket 开始初始化')

      this.socketInstance.onOpen((res) => {
        this.emit('log', '🛜 WebSocket 连接成功真实的成功')
        console.log('WebSocket 连接成功真实的成功')
        this.isConnect = true
        this.emit('open', res)
      })

      this.socketInstance.onMessage((res) => {
        if (this.isRawResponse) {
          if (res.data instanceof ArrayBuffer) {
            const buffer = new Uint8Array(res.data)
            this.emit('log', `✉️ 收到二进制消息（length=${buffer.length}）`)
            this.emit('message', buffer)
          }
          else {
            this.emit('message', res.data)

            this.emit('log', '⚠️ isRawResponse 为 true，但数据不是 ArrayBuffer')
          }
        }
        else {
          try {
            const json = JSON.parse(res.data)
            console.log('📄 解析后的 JSON:', json)
            this.emit('log', '✉️ 收到 JSON 消息')
            this.emit('message', json)
          }
          catch (err) {
            console.error('❌ JSON 解析失败:', err)
            this.emit('log', '❌ JSON 解析失败')
            this.emit('message', err)
          }
        }
      })

      this.socketInstance.onClose((e) => {
        this.emit('log', `🛜 WebSocket 关闭，reason: ${e.reason}`)
        console.log('WebSocket 关闭了', e)

        this.isInitiative = false
        this.isConnect = false
        this.socketInstance = null

        if (this.autoReconnect) {
          this.emit('log', '🛜 自动重连中...')
          this.reconnect()
        }

        this.emit('close', e.reason)
      })

      this.socketInstance.onError((e) => {
        this.emit('log', `🛜 WebSocket 错误：${e.errMsg}`)
        this.isInitiative = false
        this.isConnect = false

        if (this.autoReconnect) {
          this.emit('log', '🛜 连接错误后尝试重连')
          this.reconnect()
        }

        this.emit('error', e.errMsg)
      })
    }
    catch (error) {
      this.emit('log', '🛜 创建出错了')
      console.warn(error)
    }
  }

  /**
   * @description 发送消息
   */
  sendMessage(value: any, isJson = true) {
    const param = isJson ? JSON.stringify(value) : value
    this.emit('log', `🛜 sendMessage 触发`)
    return new Promise((resolve, reject) => {
      this.socketInstance?.send({
        data: param,
        success() {
          resolve(true)
        },
        fail(error) {
          console.log('消息发送失败')
          reject(error)
        },
      })
    })
  }

  /**
   * @description 手动重连
   */
  reconnect = debounce(() => {
    if (!this.autoReconnect) {
      this.emit('log', '🛜 autoReconnect=false，阻止自动重连')
      return
    }
    this.emit('log', '🛜 reconnect 被触发')
    this.initSocket()
  }, 300)

  /**
   * @description 关闭连接
   * @param reason 关闭原因
   */
  closeSocket(reason = '手动关闭') {
    this.emit('log', `🛜 正在关闭 WebSocket，原因：${reason}`)
    this.isInitiative = true

    if (!this.socketInstance || !this.isCreate)
      return

    this.socketInstance.close({
      reason,
      success: () => {
        this.onClose(reason)
      },
      fail: (e) => {
        this.emit('log', '🛜 WebSocket 关闭失败，强制关闭并尝试重连')
        console.log(e)
        this.emit('error', `${JSON.stringify(e)}`)
        this.onClose('关闭失败 强制断开')
      },
    })
  }

  /**
   * @description 手动处理关闭后的清理
   */
  onClose(reason: string) {
    this.emit('log', `🛜 onClose 清理状态: ${reason}`)
    this.isCreate = false
    this.isConnect = false
    this.socketInstance = null
  }

  /**
   * @description 设置是否自动重连
   */
  enableAutoReconnect(enable: boolean) {
    this.autoReconnect = enable
    this.emit('log', `🛜 设置 autoReconnect=${enable}`)
  }

  /**
   * @description 完全重置所有状态
   */
  reset() {
    this.emit('log', `🛜 重置 WebSocket 状态`)
    this.isCreate = false
    this.isConnect = false
    this.isInitiative = false
    this.socketInstance = null
  }
}
