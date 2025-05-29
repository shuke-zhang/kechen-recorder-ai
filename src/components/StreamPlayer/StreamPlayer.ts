export default class StreamAudioPlayer {
  private audioContext: AudioContext | null = null
  private inputSampleRate: number
  private numChannels: number
  private bitDepth: number
  private littleEndian: boolean
  private pcmType: 'int' | 'float'

  private decodeQueue: ArrayBuffer[] = []
  private audioQueue: AudioBuffer[] = []
  private isDecoding = false
  private isPlaying = false
  private isPlayingLocked = false
  private isPendingEnd = false
  private isForceStop = false
  private currentSource: AudioBufferSourceNode | null = null
  private _onStart: (() => void) | null = null
  private _onEnd: (() => void) | null = null
  private incompleteBuffer: Uint8Array | null = null

  constructor({
    inputSampleRate = 16000,
    numChannels = 1,
    bitDepth = 16,
    littleEndian = true,
    pcmType = 'float',
  } = {}) {
    this.audioContext = new window.AudioContext()
    this.inputSampleRate = inputSampleRate
    this.numChannels = numChannels
    this.bitDepth = bitDepth
    this.littleEndian = littleEndian
    this.pcmType = pcmType as 'int' | 'float'
  }

  onStart(callback: () => void) {
    this._onStart = callback
  }

  onEnd(callback: () => void) {
    this._onEnd = callback
  }

  // ✅ 支持两个参数：data 为 ArrayBuffer，text 仅用于日志展示
  async appendSmartChunk(data: ArrayBuffer, text?: string) {
    if (text) {
      console.log('📢 播放文本：', text)
    }

    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume()
    }

    const format = this.detectFormat(data)
    if (format === 'mp3') {
      await this.appendMP3Chunk(data)
    }
    else {
      this.appendPCMChunk(data)
    }

    this._safePlay()
  }

  appendPCMChunk(pcmData: ArrayBuffer) {
    const bytesPerSample = this.bitDepth / 8
    const frameSize = bytesPerSample * this.numChannels
    let u8 = new Uint8Array(pcmData)

    if (this.incompleteBuffer) {
      const combined = new Uint8Array(this.incompleteBuffer.length + u8.length)
      combined.set(this.incompleteBuffer)
      combined.set(u8, this.incompleteBuffer.length)
      u8 = combined
      this.incompleteBuffer = null
    }

    const remainder = u8.length % frameSize
    if (remainder !== 0) {
      this.incompleteBuffer = u8.slice(u8.length - remainder)
      u8 = u8.slice(0, u8.length - remainder)
    }

    if (u8.length === 0)
      return

    const validBuffer = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
    this.decodeQueue.push(validBuffer)
    this.isPendingEnd = true
    this.isForceStop = false

    if (!this.isDecoding) {
      this._processDecodeQueue()
    }
  }

  async appendMP3Chunk(mp3Data: ArrayBuffer) {
    if (!this.audioContext)
      return
    try {
      const buffer = await this.audioContext.decodeAudioData(mp3Data.slice(0))
      this.audioQueue.push(buffer)
      this.isPendingEnd = true
      this.isForceStop = false
    }
    catch (err) {
      console.error('❌ MP3 解码失败:', err)
    }
  }

  private async _processDecodeQueue() {
    if (this.isDecoding)
      return
    this.isDecoding = true

    while (this.decodeQueue.length > 0) {
      const rawPCM = this.decodeQueue.shift()
      if (!rawPCM)
        continue
      const buffer = this._convertPCM(rawPCM)
      this.audioQueue.push(buffer)
    }

    this.isDecoding = false
    this._safePlay()
  }

  private async _playLoop() {
    this.isPlayingLocked = true

    while (this.audioQueue.length > 0 && !this.isForceStop) {
      const next = this.audioQueue.shift()
      if (!next || !this.audioContext)
        continue

      const source = this.audioContext.createBufferSource()
      source.buffer = next
      source.connect(this.audioContext.destination)

      const onEnded = new Promise<void>((resolve) => {
        source.onended = () => resolve()
      })

      if (!this.isPlaying) {
        this._onStart?.()
      }

      this.isPlaying = true
      this.currentSource = source
      source.start()

      await onEnded

      this.currentSource = null
      this.isPlaying = false
    }

    if (this.isPendingEnd && !this.isForceStop && this.decodeQueue.length === 0) {
      this._onEnd?.()
      this.isPendingEnd = false
    }

    this.isPlayingLocked = false
  }

  private _safePlay() {
    if (!this.isPlayingLocked && !this.isPlaying && this.audioQueue.length > 0) {
      this._playLoop()
    }
  }

  stop() {
    this.isForceStop = true
    this.audioQueue = []
    this.decodeQueue = []
    if (this.currentSource) {
      this.currentSource.stop()
      this.currentSource = null
    }
    this.isPlaying = false
    this.isPendingEnd = false
  }

  destroy() {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }

  private detectFormat(data: ArrayBuffer): 'mp3' | 'pcm' {
    const u8 = new Uint8Array(data)
    const header = new TextDecoder().decode(u8.slice(0, 3))
    if (header === 'ID3')
      return 'mp3'
    for (let i = 0; i < Math.min(4, u8.length - 1); i++) {
      if (u8[i] === 0xFF && (u8[i + 1] & 0xE0) === 0xE0)
        return 'mp3'
    }
    return 'pcm'
  }

  private _convertPCM(buffer: ArrayBuffer): AudioBuffer {
    const ctx = this.audioContext!
    const bytesPerSample = this.bitDepth / 8
    const sampleCount = buffer.byteLength / bytesPerSample / this.numChannels
    const audioBuffer = ctx.createBuffer(this.numChannels, sampleCount, this.inputSampleRate)
    const view = new DataView(buffer)

    for (let ch = 0; ch < this.numChannels; ch++) {
      const channel = audioBuffer.getChannelData(ch)
      for (let i = 0; i < sampleCount; i++) {
        const index = (i * this.numChannels + ch) * bytesPerSample
        let sample = 0
        if (this.bitDepth === 16) {
          sample = view.getInt16(index, this.littleEndian) / 32768
        }
        else if (this.pcmType === 'int') {
          sample = view.getInt32(index, this.littleEndian) / 2147483648
        }
        else {
          sample = view.getFloat32(index, this.littleEndian)
        }
        channel[i] = sample
      }
      this._applyFades(channel)
    }

    return audioBuffer
  }

  private _applyFades(channel: Float32Array) {
    const fadeLen = Math.min(100, channel.length)
    for (let i = 0; i < fadeLen; i++) {
      channel[i] *= i / fadeLen
    }
    for (let i = channel.length - fadeLen; i < channel.length; i++) {
      channel[i] *= (channel.length - i) / fadeLen
    }
  }
}
