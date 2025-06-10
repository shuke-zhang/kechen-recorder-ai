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
  /**
   * 用于缓存所有已解码、但还未播放的音频片段。
   * 键为每个音频片段的顺序 id（如 0, 1, 2, ...），值为包含音频数据和附加信息的对象。
   * 播放时会按 id 顺序查找并移除，保证音频流按正确顺序播放。
   */
  private audioBufferMap: Map<number, { buffer: AudioBuffer, text?: string, id: number }> = new Map()
  /**
   * 下一个需要播放的音频片段的 id。
   * 只有当 audioBufferMap 中存在 nextPlayId 时，才会继续播放；
   * 如果中间某个 id 缺失，则等待该 id 的片段到达，后续所有更大 id 的片段将继续缓存等待。
   */
  private nextPlayId: number = 0
  /**
   * 当前正在播放的音频片段的 id。
   * 如果没有音频在播放，则为 null。
   * 可用于外部或调试判断当前正在播放的片段序号。
   */
  // private playingId: number | null = null
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
    console.log('创建StreamAudioPlayer实例')
  }

  onStart(callback: () => void) {
    this._onStart = callback
  }

  onEnd(callback: () => void) {
    this._onEnd = callback
  }

  // ✅ 支持两个参数：data 为 ArrayBuffer，text 仅用于日志展示
  async appendSmartChunk(options: { buffer: ArrayBuffer, text?: string, id?: number }) {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume()
    }

    const format = this.detectFormat(options.buffer)
    console.log(`检测到音频格式为：${format}`)

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

    this.decodeQueue.push({
      buffer: validBuffer,
      text: options.text,
      id: options.id,
    })
    this.isPendingEnd = true
    this.isForceStop = false

    if (!this.isDecoding) {
      this._processDecodeQueue()
    }
  }

  async appendMP3Chunk(options: { buffer: ArrayBuffer, text?: string, id?: number }) {
    if (!this.audioContext)
      return
    try {
      const buffer = await this.audioContext.decodeAudioData(options.buffer.slice(0))
      const id = options.id
      if (id == null)
        return
      this.audioBufferMap.set(id, { buffer, text: options.text, id })
      console.log('添加数据进audioBufferMap————————————————', id, options.text)

      this._tryPlayNextBuffer()
      this.isPendingEnd = true
      this.isForceStop = false
    }
    catch (err) {
      console.error('❌ MP3 解码失败:', err)
    }
  }

  private async _tryPlayNextBuffer() {
  // 如果正在播放，直接返回
    if (this.isPlayingLocked || this.isPlaying)
      return
    console.log('this.nextPlayId', this.nextPlayId)

    // 检查 Map 里是否有当前要播放的 nextPlayId
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
    // === 【新增】播放队列空时自动 stop 或 onEnd ===
    if (
      this.audioBufferMap.size === 0
      && this.decodeQueue.length === 0
      && !this.isPlaying
      && !this.isPlayingLocked
      && !this.isPendingEnd // 播放完最后一段才走这里
    ) {
    // 播放全部结束，自动调用 stop 或触发回调
      this.stop()
      if (typeof this._onEnd === 'function') {
        this._onEnd()
      }
    }
  }

  private async _playOneBuffer(buffer: AudioBuffer, text?: string, id?: number) {
    if (!this.audioContext)
      return

    this.isPlayingLocked = true

    // 播放前回调
    if (!this.isPlaying) {
      this._onStart?.()
    }
    this.isPlaying = true
    // this.playingId = id ?? null
    // https://developer.mozilla.org/zh-CN/docs/Web/API/BaseAudioContext/createBufferSource
    // createBufferSource() 方法用于创建一个新的AudioBufferSourceNode接口，该接口可以通过AudioBuffer 对象来播放音频数据。AudioBuffer对象可以通过AudioContext.createBuffer 来创建或者通过 AudioContext.decodeAudioData成功解码音轨后获取。
    const source = this.audioContext.createBufferSource()
    //  在 AudioBufferSourceNode 中设置缓冲区（音频数据）。
    source.buffer = buffer
    // 将 AudioBufferSourceNode 连接到输出（destination），这样我们才能听到声音。
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

    // 播放结束后检查下一个
    // 下一个片段如果已经准备好，会在 _tryPlayNextBuffer 的 while 里自动顺序播放
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
        continue // id 必须存在
      // 缓存到 Map
      this.audioBufferMap.set(id, { buffer, text, id })
      // 每有新片段就尝试顺序播放
      this._tryPlayNextBuffer()
    }

    this.isDecoding = false
  }

  stop() {
    console.log('触发stop 停止播放')
    this.isForceStop = true
    this.nextPlayId = 0
    this.decodeQueue = []
    this.isPlaying = false
    this.isPendingEnd = false
    this.audioBufferMap.clear()
    // 核心补充，立即停止当前播放节点
    if (this.currentSource) {
      try {
        this.currentSource.stop(0) // 立即终止当前正在播放的音频
      }
      catch (e) {
      // 可能已经停止，忽略异常
      }
      this.currentSource = null
    }
  }

  destroy() {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close() // 关闭一个音频环境，释放任何正在使用系统资源的音频。
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

    return {
      buffer: audioBuffer,
      text: options.text,
      id: options.id,
    }
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
