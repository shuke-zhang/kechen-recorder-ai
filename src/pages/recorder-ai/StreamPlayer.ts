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
  private isPendingEnd = false // ✅ 是否正在等待播放全部结束
  private currentSource: AudioBufferSourceNode | null = null

  private _onStart: (() => void) | null = null
  private _onEnd: (() => void) | null = null

  constructor({
    inputSampleRate = 16000,
    numChannels = 1,
    bitDepth = 16,
    littleEndian = true,
    pcmType = 'float',
  } = {}) {
    if (![16, 32].includes(bitDepth))
      throw new Error('bitDepth 必须是 16 或 32')
    if (inputSampleRate <= 0)
      throw new Error('采样率必须大于 0')
    if (!['int', 'float'].includes(pcmType))
      throw new Error('pcmType 必须是 int 或 float')

    this.audioContext = new window.AudioContext()
    this.inputSampleRate = inputSampleRate
    this.numChannels = numChannels
    this.bitDepth = bitDepth
    this.littleEndian = littleEndian
    this.pcmType = pcmType as 'int' | 'float'
  }

  /** 注册播放开始回调 */
  onStart(callback: () => void) {
    this._onStart = callback
  }

  /** 注册完整播放结束回调（所有片段播完才触发） */
  onEnd(callback: () => void) {
    this._onEnd = callback
  }

  /** 添加 PCM 数据块 */
  appendChunk(pcmData: ArrayBuffer) {
    this.decodeQueue.push(pcmData)
    this.isPendingEnd = true // ✅ 有新数据，说明还没结束
    if (!this.isDecoding) {
      this._processDecodeQueue()
    }
  }

  private async _processDecodeQueue() {
    if (!this.audioContext)
      return
    this.isDecoding = true

    while (this.decodeQueue.length > 0) {
      const rawPCM = this.decodeQueue.shift()
      if (!rawPCM)
        continue
      const audioBuffer = this._convertPCM(rawPCM)
      this.audioQueue.push(audioBuffer)
    }

    this.isDecoding = false
    if (!this.isPlaying) {
      this._playNext()
    }
  }

  private _playNext() {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false

      // ✅ 所有播放完成，才触发 onEnd
      if (this.isPendingEnd) {
        this._onEnd?.()
        this.isPendingEnd = false
      }

      return
    }

    const nextBuffer = this.audioQueue.shift()
    const source = this.audioContext.createBufferSource()
    source.buffer = nextBuffer!
    source.connect(this.audioContext.destination)

    source.start()
    if (!this.isPlaying) {
      this._onStart?.()
    }
    this.isPlaying = true
    this.currentSource = source

    source.onended = () => {
      this.currentSource = null
      this._playNext()
    }
  }

  /** 销毁播放器 */
  destroy() {
    this.audioQueue = []
    this.decodeQueue = []
    this.currentSource?.stop()
    this.audioContext?.close()
    this.audioContext = null
    this.isPendingEnd = false
  }

  /** PCM 解码 */
  private _convertPCM(buffer: ArrayBuffer): AudioBuffer {
    const ctx = this.audioContext
    if (!ctx)
      throw new Error('AudioContext not initialized')

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

  /** 去直流偏移 + 淡入淡出 */
  private _applyFades(channel: Float32Array) {
    const fadeLength = Math.min(100, channel.length)
    for (let i = 0; i < fadeLength; i++) {
      channel[i] *= i / fadeLength
    }
    for (let i = channel.length - fadeLength; i < channel.length; i++) {
      channel[i] *= (channel.length - i) / fadeLength
    }
  }
}
