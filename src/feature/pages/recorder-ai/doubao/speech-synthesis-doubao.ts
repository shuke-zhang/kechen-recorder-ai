import { DoubaoResponse } from './doubao-response'
import { Header } from './header '
import { Optional } from './optional '
import { SimpleTextDecoder } from './simple-text-decoder'
import { SimpleTextEncoder } from './simple-text-encoder'
import type { DoubaoSpeechSynthesisOptions } from './types'
import { WebSocket } from '@/store/modules/socket/webSocket-plus'

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
  /** 发音人 */
  private speaker = 'zh_female_shuangkuaisisi_moon_bigtts'
  private socketInstance: WebSocket | null = null
  private socketUrl = ''
  private hasReceivedFirstMessage = false
  /** socket 是否正在初始化中 */
  public isSocketRunning = false

  constructor(options: DoubaoSpeechSynthesisOptions) {
    super()
    this.APPID = options.APPID || this.APPID
    this.AccessToken = options.AccessToken || this.AccessToken
    this.SecretKey = options.SecretKey || this.SecretKey
    this.url = options.url || this.url
    this.host = options.host || this.host
    this.speaker = options.speaker || this.speaker
    this.initSocket()
    this.emit('test', '初始化完成')
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
    console.log(1111)

    await this.startConnection()
    console.log(2222)

    const event = await this.recvOnce()
    console.log(3333, event, Object.prototype.toString.call(event), event)
    const res = this.parserResponse(event)

    if (res.optional.event !== 50) {
      console.log('启动连接失败505050', res.optional.event)
      this.emit('error', `启动连接失败: ${res.optional.event}`)
      return false
    }
    // 步骤2 发起会话

    console.log(5555)
    const sessionId = this.genSessionId()
    console.log(6666, sessionId)
    await this.startSession(this.speaker, sessionId)
    console.log(7777)
    console.log(8888)
    const sessionEvent = await this.recvOnce()
    console.log(9999, sessionEvent)
    const sessionRes = this.parserResponse(new Uint8Array(sessionEvent))
    console.log(10000, sessionRes)
    if (sessionRes.optional.event !== 150) {
      this.emit('error', `启动会话失败: ${sessionRes.optional.event}`)
      return false
    }
    // // 步骤3 发送文本
    console.log('!!!!!!!!')
    await this.sendText(text, sessionId)
    console.log('@@@@@@@@@')
    // // // 告知服务端本次任务发送完毕
    await this.finishSession(sessionId)
    console.log('##########')

    // await this.finishConnection()
  }

  /**
   * 发送文本
   */
  private async sendText(text: string, sessionId: string) {
    const header = new Header({
      message_type: 0b0001, // FULL_CLIENT_REQUEST
      message_type_specific_flags: 0b0100, // MsgTypeFlagWithEvent
      serial_method: 0b0001, // JSON
    }).asBytes()
    const optional = new Optional({
      event: 200, // EVENT_TaskRequest
      sessionId,
    }).asBytes()

    const payload = this.getPayloadBytes('1234', 200, text)

    await this.sendEvent(header, optional, payload)
  }

  private async finishSession(sessionId: string) {
    const header = new Header({
      message_type: 0b0001, // FULL_CLIENT_REQUEST
      message_type_specific_flags: 0b0100, // MsgTypeFlagWithEvent
      serial_method: 0b0001, // JSON
    }).asBytes()

    const optional = new Optional({
      event: 102, // EVENT_FinishSession
      sessionId,
    }).asBytes()

    const payload = new SimpleTextEncoder().encode('{}')

    await this.sendEvent(header, optional, payload)
  }

  private async finishConnection() {
    const header = new Header({
      message_type: 0b0001, // FULL_CLIENT_REQUEST
      message_type_specific_flags: 0b0100, // MsgTypeFlagWithEvent
      serial_method: 0b0001, // JSON
    }).asBytes()

    const optional = new Optional({
      event: 2, // EVENT_FinishConnection
    }).asBytes()

    const payload = new SimpleTextEncoder().encode('{}')

    await this.sendEvent(header, optional, payload)
  }

  /**
   * 获取  payload
   */
  private getPayloadBytes(uid = '1234', event = 0, text = '', speaker = this.speaker) {
    const payload = {
      user: { uid },
      event,
      namespace: 'BidirectionalTTS',
      req_params: {
        text,
        speaker,
        audio_params: {
          format: 'pcm',
          sample_rate: 16000,
          speech_rate: 50, // 语速
          loudness_rate: 50, // 音量
        },
      },
    }

    console.log(payload, 'payload-getPayloadBytes')

    const bytes = new SimpleTextEncoder().encode(JSON.stringify(payload))

    return bytes
  }

  private onSocketMessage(text: Uint8Array) {
    // console.log('收到消息:', text)
    if (!this.hasReceivedFirstMessage) {
      console.log('👋 跳过 recvOnce 的第一条消息')
      return
    }
    const base64 = this.uint8ArrayToBase64(text)
    this.emit('audio', base64)
  }

  private initSocket() {
    this.socketUrl = this.getWebSocketUrl().baseUrl
    const header = this.getWebSocketUrl().header
    this.isSocketRunning = true
    this.socketInstance = new WebSocket(this.socketUrl, header, false, true)
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
      console.error('❌ WebSocket 错误:', err)
      this.emit('log', '🔌 WebSocket 错误')
      this.isSocketRunning = false
    })
  }

  private recvOnce(): Promise<Uint8Array > {
    return new Promise((resolve) => {
      const handler = (event: Uint8Array) => {
        this.socketInstance?.off('message', handler)
        this.hasReceivedFirstMessage = true
        resolve(event)
      }
      this.socketInstance?.on('message', handler)
    })
  }

  /**
   * @description 启动连接事件
   */
  private async startConnection() {
    // 构造请求头部对象，指定消息类型为 FULL_CLIENT_REQUEST，请求中带事件标识
    const header = new Header({
      message_type: 0b0001,
      message_type_specific_flags: 0b0100,
    }).asBytes()
    // 构造可选字段对象，设置事件为“启动连接”，即 EVENT_Start_Connection
    const optional = new Optional({ event: 1 }).asBytes()

    const payload = new SimpleTextEncoder().encode('{}')
    return await this.sendEvent(header, optional, payload)
  }

  /**
   * @description 诉服务器我要开始一段语音合成任务
   */
  private async startSession(speaker = this.speaker, sessionId: string) {
    const header = new Header({
      message_type: 0b0001, // FULL_CLIENT_REQUEST
      message_type_specific_flags: 0b0100, // MsgTypeFlagWithEvent
      serial_method: 0b0001, // JSON
    }).asBytes()

    const optional = new Optional({
      event: 100, // EVENT_StartSession
      sessionId,
    }).asBytes()

    const payload = this.getPayloadBytes('1234', 100, '', speaker)
    console.log('获取到了payload')

    await this.sendEvent(header, optional, payload)
  }

  /**
   * @description 发送事件到服务器
   */
  private async sendEvent(header: Uint8Array<ArrayBufferLike>, optional: Uint8Array | null, payload?: Uint8Array,
  ) {
    const fullClientRequest: number[] = []
    fullClientRequest.push(...header)
    if (optional) {
      fullClientRequest.push(...optional)
    }
    // 如果有 Payload，则添加其长度（4字节） + 内容
    if (payload) {
      const payloadLength = payload.length
      const lengthBytes = new Uint8Array(4)
      const view = new DataView(lengthBytes.buffer)
      view.setInt32(0, payloadLength) // 大端默认
      fullClientRequest.push(...lengthBytes)
      fullClientRequest.push(...payload)
    }
    console.log(fullClientRequest, 'sendMessage---发送消息')

    await this.socketInstance?.sendMessage(new Uint8Array(fullClientRequest), false)
  }

  private parserResponse(res: Uint8Array | string) {
    if (typeof res === 'string') {
      throw new TypeError(res)
    }
    console.log('📌 typeof res:', typeof res)
    console.log('📌 res instanceof Uint8Array:', res instanceof Uint8Array)
    console.log('📌 Object.prototype.toString.call(res):', Object.prototype.toString.call(res))

    const response = new DoubaoResponse(new Header(), new Optional())
    const header = response.header
    const num = 0b00001111

    header.protocol_version = (res[0] >> 4) & num
    header.header_size = res[0] & 0x0F
    header.message_type = (res[1] >> 4) & num
    header.message_type_specific_flags = res[1] & 0x0F
    header.serial_method = res[2] >> 4
    header.compression_type = res[2] & 0x0F
    header.reserved_data = res[3]
    console.log('📦 header:', header)
    let offset = 4
    const optional = response.optional

    if (
      header.message_type === 0b1001
      || header.message_type === 0b1011
    ) {
      console.log('🎯 进入 message_type 分支', 0b1011, 0b1001)
      if (header.message_type_specific_flags === 0b100) {
        optional.event = this.readInt32(res, offset)
        offset += 4

        if (optional.event === 0)
          return response

        if (optional.event === 50) {
          [optional.connectionId, offset] = this.readResContent(res, offset)
        }
        else if (optional.event === 51) {
          [optional.response_meta_json, offset] = this.readResContent(res, offset)
        }
        else if (
          optional.event === 150
          || optional.event === 153
          || optional.event === 152
        ) {
          [optional.sessionId, offset] = this.readResContent(res, offset);
          [optional.response_meta_json, offset] = this.readResContent(res, offset)
        }
        else if (optional.event === 352) {
          [optional.sessionId, offset] = this.readResContent(res, offset);
          [response.payload, offset] = this.readResPayload(res, offset)
        }
        else if (
          optional.event === 351
          || optional.event === 350
        ) {
          [optional.sessionId, offset] = this.readResContent(res, offset);
          [response.payload_json, offset] = this.readResContent(res, offset)
        }
      }
    }
    else if (header.message_type === 0b1111) {
      console.log('🎯 进入 message_type 分支', 0b1111)

      optional.errorCode = this.readInt32(res, offset)
      offset += 4;
      [response.payload, offset] = this.readResPayload(res, offset)
    }

    return response
  }

  private readInt32(buffer: Uint8Array, offset: number): number {
    return new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength).getInt32(offset, false)
  }

  private readResContent(buffer: Uint8Array, offset: number): [string, number] {
    const size = this.readInt32(buffer, offset)
    offset += 4
    const bytes = buffer.slice(offset, offset + size)
    const content = new SimpleTextDecoder().decode(bytes)
    offset += size
    return [content, offset]
  }

  private readResPayload(buffer: Uint8Array, offset: number): [Uint8Array, number] {
    const size = this.readInt32(buffer, offset)
    offset += 4
    const payload = buffer.slice(offset, offset + size)
    offset += size
    return [payload, offset]
  }

  /**
   * 生成为一个 16 进制的 sessionId
   */
  private genSessionId() {
    return Date.now().toString(16) + Math.random().toString(16).slice(2, 10)
  }

  private uint8ArrayToBase64(u8arr: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < u8arr.length; i++) {
      binary += String.fromCharCode(u8arr[i])
    }
    return btoa(binary)
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
      'content-type': 'application/json',
    }

    return {
      baseUrl,
      header,
    }
  }
}
