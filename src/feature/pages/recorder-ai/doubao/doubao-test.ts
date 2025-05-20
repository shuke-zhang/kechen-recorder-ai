import { WebSocket } from '@/store/modules/socket/webSocket'

const PROTOCOL_VERSION = 0b0001
const DEFAULT_HEADER_SIZE = 0b0001

const FULL_CLIENT_REQUEST = 0b0001
const AUDIO_ONLY_RESPONSE = 0b1011

const MsgTypeFlagWithEvent = 0b100
const JSON = 0b0001
const NO_COMPRESSION = 0b0000

const EVENT = {
  NONE: 0,
  StartConnection: 1,
  FinishConnection: 2,
  ConnectionStarted: 50,
  ConnectionFailed: 51,
  ConnectionFinished: 52,
  StartSession: 100,
  FinishSession: 102,
  SessionStarted: 150,
  SessionFinished: 152,
  SessionFailed: 153,
  TaskRequest: 200,
  TTSSentenceStart: 350,
  TTSSentenceEnd: 351,
  TTSResponse: 352,
}

interface DoubaoSpeechSynthesisOptions {
  APPID: string
  AccessToken: string
  url?: string // 可选自定义 URL
}

export class SpeechSynthesisDoubao extends EventEmitter {
  private APPID: string
  private AccessToken: string
  private socket: WebSocket | null = null
  private sessionId: string = ''
  private connectId: string = ''
  private text: string = ''
  private speaker: string = 'zh_female_shuangkuaisisi_moon_bigtts'
  private audioBuffer: Uint8Array[] = []

  constructor(options: DoubaoSpeechSynthesisOptions) {
    super()
    this.APPID = options.APPID
    this.AccessToken = options.AccessToken
    this.connectId = this.genSessionId()
  }

  public start(text: string, speaker = 'zh_female_shuangkuaisisi_moon_bigtts') {
    this.text = text
    this.speaker = speaker
    this.sessionId = this.genSessionId()

    const { url, header } = this.getWebSocketConfig()
    this.socket = new WebSocket(url, header, false)
    this.socket.reset()
    this.socket.initSocket()

    this.socket.on('open', () => {
      this.emit('log', '✅ WebSocket已连接')
      this.startConnection()
    })

    this.socket.on('message', (data) => {
      this.handleMessage(data)
    })

    this.socket.on('close', () => {
      this.emit('log', '🔌 WebSocket已关闭')
    })

    this.socket.on('error', (e) => {
      console.error('❌ WebSocket错误:', e)
      this.emit('log', '❌ WebSocket错误')
    })
  }

  private handleMessage(buffer: ArrayBuffer) {
    const view = new DataView(buffer)
    const header = new Uint8Array(buffer.slice(0, 4))
    const messageType = (header[1] >> 4) & 0x0F
    const event = view.getInt32(4)

    let offset = 8

    if (event === EVENT.ConnectionStarted) {
      this.emit('log', '连接成功，开始 Session')
      this.startSession()
    }
    else if (event === EVENT.SessionStarted) {
      this.emit('log', 'Session 已建立，发送文本')
      this.sendText()
    }
    else if (event === EVENT.TTSResponse && messageType === AUDIO_ONLY_RESPONSE) {
      const payloadSize = view.getInt32(offset)
      offset += 4
      const audio = buffer.slice(offset, offset + payloadSize)
      this.audioBuffer.push(new Uint8Array(audio))
      this.emit('audio', audio)
    }
    else if (event === EVENT.SessionFinished) {
      this.emit('log', 'Session 结束，关闭连接')
      this.finishConnection()
    }
    else if (event === EVENT.ConnectionFinished) {
      this.emit('log', '连接已彻底关闭')
    }
  }

  private startConnection() {
    const header = this.buildHeader(FULL_CLIENT_REQUEST, MsgTypeFlagWithEvent)
    const optional = this.buildOptional(EVENT.StartConnection)
    const payload = this.buildPayload({})
    this.sendFrame(header, optional, payload)
  }

  private startSession() {
    const header = this.buildHeader(FULL_CLIENT_REQUEST, MsgTypeFlagWithEvent, JSON)
    const optional = this.buildOptional(EVENT.StartSession, this.sessionId)
    const payload = this.buildPayload({
      user: { uid: '1234' },
      event: EVENT.StartSession,
      namespace: 'BidirectionalTTS',
      req_params: {
        speaker: this.speaker,
        audio_params: { format: 'mp3', sample_rate: 24000 },
      },
    })
    this.sendFrame(header, optional, payload)
  }

  private sendText() {
    const header = this.buildHeader(FULL_CLIENT_REQUEST, MsgTypeFlagWithEvent, JSON)
    const optional = this.buildOptional(EVENT.TaskRequest, this.sessionId)
    const payload = this.buildPayload({
      user: { uid: '1234' },
      event: EVENT.TaskRequest,
      namespace: 'BidirectionalTTS',
      req_params: {
        text: this.text,
        speaker: this.speaker,
        audio_params: { format: 'mp3', sample_rate: 24000 },
      },
    })
    this.sendFrame(header, optional, payload)
    this.finishSession()
  }

  private finishSession() {
    const header = this.buildHeader(FULL_CLIENT_REQUEST, MsgTypeFlagWithEvent, JSON)
    const optional = this.buildOptional(EVENT.FinishSession, this.sessionId)
    const payload = this.buildPayload({})
    this.sendFrame(header, optional, payload)
  }

  private finishConnection() {
    const header = this.buildHeader(FULL_CLIENT_REQUEST, MsgTypeFlagWithEvent, JSON)
    const optional = this.buildOptional(EVENT.FinishConnection)
    const payload = this.buildPayload({})
    this.sendFrame(header, optional, payload)
  }

  private sendFrame(header: Uint8Array, optional: Uint8Array, payload: Uint8Array) {
    const total = new Uint8Array(header.length + optional.length + payload.length)
    total.set(header, 0)
    total.set(optional, header.length)
    total.set(payload, header.length + optional.length)
    this.socket?.sendMessage(total.buffer)
  }

  private buildHeader(type: number, flag: number, serialMethod = JSON, compression = NO_COMPRESSION): Uint8Array {
    return new Uint8Array([
      (PROTOCOL_VERSION << 4) | DEFAULT_HEADER_SIZE,
      (type << 4) | flag,
      (serialMethod << 4) | compression,
      0x00,
    ])
  }

  private buildOptional(event: number, sessionId?: string): Uint8Array {
    const arr: number[] = []
    arr.push(...this.int32ToBytes(event))
    if (sessionId) {
      const sidBytes = new TextEncoder().encode(sessionId)
      arr.push(...this.int32ToBytes(sidBytes.length))
      arr.push(...sidBytes)
    }
    return new Uint8Array(arr)
  }

  private buildPayload(obj: object): Uint8Array {
    const json = new TextEncoder().encode(JSON.stringify(obj))
    const size = this.int32ToBytes(json.length)
    return new Uint8Array([...size, ...json])
  }

  private int32ToBytes(n: number): number[] {
    return [(n >> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF]
  }

  private genSessionId(): string {
    return Date.now().toString(16) + Math.random().toString(16).slice(2, 10)
  }

  private getWebSocketConfig(): { url: string, header: Record<string, string> } {
    const url = 'wss://openspeech.bytedance.com/api/v3/tts/bidirection'
    const header = {
      'X-Api-App-Key': this.APPID,
      'X-Api-Access-Key': this.AccessToken,
      'X-Api-Resource-Id': 'volc.service_type.10029',
      'X-Api-Connect-Id': this.connectId,
    }
    return { url, header }
  }
}
