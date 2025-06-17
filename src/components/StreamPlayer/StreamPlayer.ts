export default class StreamAudioPlayer {
  private audioContext: AudioContext | null = null
  private inputSampleRate: number
  private numChannels: number
  private bitDepth: number
  private littleEndian: boolean
  private pcmType: 'int' | 'float'

  private decodeQueue: {
    buffer: ArrayBuffer
    text?: string
    id?: number
  }[] = []

  private isDecoding = false
  private isPlaying = false
  private isPlayingLocked = false
  private isPendingEnd = false
  private isForceStop = false
  private currentSource: AudioBufferSourceNode | null = null
  private _onStart: (() => void) | null = null
  private _onEnd: (() => void) | null = null
  private incompleteBuffer: Uint8Array | null = null
  private audioBufferMap: Map<number, { buffer: AudioBuffer, text?: string, id: number }> = new Map()
  private nextPlayId: number = 0
  private lastStopPromise: Promise<void> = Promise.resolve()
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

  private async ensureAudioContextRunning() {
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume()
        console.log('✅ AudioContext resumed')
      }
      catch (e) {
        console.warn('⚠️ AudioContext resume failed:', e)
      }
    }
  }

  async appendSmartChunk(options: { buffer: ArrayBuffer, text?: string, id?: number }) {
    // 等待上一次 stop 执行完
    await this.lastStopPromise
    // if (options.id === 0 && ) {
    //   this.isForceStop = true
    //   this.audioBufferMap.clear()
    //   this.isPlaying = false
    //   this.isPlayingLocked = false
    //   this.isPendingEnd = false
    // }
    await this.ensureAudioContextRunning()
    const format = this.detectFormat(options.buffer)
    if (format === 'mp3') {
      await this.appendMP3Chunk(options)
    }
    else {
      this.appendPCMChunk(options)
    }
  }

  appendPCMChunk(options: { buffer: ArrayBuffer, text?: string, id?: number }) {
    const bytesPerSample = this.bitDepth / 8
    const frameSize = bytesPerSample * this.numChannels
    let u8 = new Uint8Array(options.buffer)

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
    this.decodeQueue.push({ buffer: validBuffer, text: options.text, id: options.id })
    this.isPendingEnd = true
    this.isForceStop = false

    if (!this.isDecoding) {
      this._processDecodeQueue()
    }
  }

  async appendMP3Chunk(options: { buffer: ArrayBuffer, text?: string, id?: number }) {
    if (!this.audioContext)
      return
    await this.ensureAudioContextRunning()
    console.log('添加音频到任务队列', options.text, options.id)

    try {
      const buffer = await this.audioContext.decodeAudioData(options.buffer.slice(0))
      const id = options.id
      if (id == null)
        return

      this.audioBufferMap.set(id, { buffer, text: options.text, id })
      this._tryPlayNextBuffer()
      this.isPendingEnd = true
      this.isForceStop = false
    }
    catch (err) {
      console.error('❌ MP3 解码失败:', err)
    }
  }

  private async _tryPlayNextBuffer() {
    if (this.isPlayingLocked || this.isPlaying)
      return

    while (this.audioBufferMap.has(this.nextPlayId)) {
      const data = this.audioBufferMap.get(this.nextPlayId)

      if (!data) {
        console.error('❌ 无法获取音频数据:', this.nextPlayId)
        this.nextPlayId++
        continue
      }
      const { buffer, text, id } = data
      this.audioBufferMap.delete(this.nextPlayId)
      await this._playOneBuffer(buffer, text, id)
      this.nextPlayId++
    }

    if (
      this.audioBufferMap.size === 0
      && this.decodeQueue.length === 0
      && !this.isPlaying
      && !this.isPlayingLocked
      && !this.isPendingEnd
    ) {
      this.stop()
      this._onEnd?.()
    }
  }

  private async _playOneBuffer(buffer: AudioBuffer, text?: string, id?: number) {
    if (!this.audioContext)
      return
    await this.ensureAudioContextRunning()

    this.isPlayingLocked = true
    if (!this.isPlaying) {
      this._onStart?.()
    }
    this.isPlaying = true

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(this.audioContext.destination)

    const onEnded = new Promise<void>((resolve) => {
      source.onended = () => resolve()
    })

    this.currentSource = source
    source.start()
    await onEnded

    this.currentSource = null
    this.isPlaying = false
    this.isPlayingLocked = false

    if (this.isPendingEnd && !this.isForceStop && this.decodeQueue.length === 0 && this.audioBufferMap.size === 0) {
      this._onEnd?.()
      this.isPendingEnd = false
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
      const { buffer, text, id } = this._convertPCM(rawPCM)
      if (id == null)
        continue

      this.audioBufferMap.set(id, { buffer, text, id })
      this._tryPlayNextBuffer()
    }

    this.isDecoding = false
  }

  stop(): Promise<void> {
    console.log('触发stop 停止播放')

    this.lastStopPromise = new Promise((resolve) => {
      this.isForceStop = true
      this.nextPlayId = 0
      this.decodeQueue = []
      this.isPlaying = false
      this.isPendingEnd = false
      this.audioBufferMap.clear()
      if (this.currentSource) {
        try {
          this.currentSource.stop(0)
        }
        catch (e) {}
        this.currentSource = null
      }
      resolve()
    })

    return this.lastStopPromise
  }

  destroy() {
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

  private _convertPCM(options: { buffer: ArrayBuffer, text?: string, id?: number }) {
    const ctx = this.audioContext!
    const bytesPerSample = this.bitDepth / 8
    const sampleCount = options.buffer.byteLength / bytesPerSample / this.numChannels
    const audioBuffer = ctx.createBuffer(this.numChannels, sampleCount, this.inputSampleRate)
    const view = new DataView(options.buffer)

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

    return { buffer: audioBuffer, text: options.text, id: options.id }
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
