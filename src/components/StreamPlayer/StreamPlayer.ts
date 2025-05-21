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
  private isForceStop = false
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
    console.log('✅ 接收到新的 PCM 数据块', pcmData)

    if (!(pcmData instanceof ArrayBuffer)) {
      throw new TypeError(
        `❌ appendChunk: 传入的不是 ArrayBuffer，而是 ${Object.prototype.toString.call(pcmData)}`,
      )
    }

    if (pcmData.byteLength === 0) {
      throw new Error('❌ appendChunk: 传入的 PCM 数据为空（byteLength = 0）')
    }

    const bytesPerSample = this.bitDepth / 8
    const frameSize = bytesPerSample * this.numChannels

    let u8 = new Uint8Array(pcmData)

    // 拼接上次残余数据
    if (this.incompleteBuffer) {
      const combined = new Uint8Array(this.incompleteBuffer.length + u8.length)
      combined.set(this.incompleteBuffer, 0)
      combined.set(u8, this.incompleteBuffer.length)
      u8 = combined
      this.incompleteBuffer = null
    }

    const totalBytes = u8.length
    const remainder = totalBytes % frameSize

    // 处理剩余不能整除的部分（留到下次）
    if (remainder !== 0) {
      this.incompleteBuffer = u8.slice(totalBytes - remainder)
      u8 = u8.slice(0, totalBytes - remainder)
    }

    if (u8.length === 0) {
      console.warn('⚠️ appendChunk: 当前数据不足一帧，等待下次拼接')
      return
    }

    const validBuffer = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)

    console.log(`✅ PCM 数据验证通过，byteLength = ${validBuffer.byteLength}，加入播放队列`)
    this.decodeQueue.push(validBuffer)
    this.isPendingEnd = true
    this.isForceStop = false
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
      if (this.isPendingEnd && !this.isForceStop) {
        this._onEnd?.()
        this.isForceStop = false
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

  public stop() {
    this.isForceStop = true
    this.audioQueue = []
    this.decodeQueue = []
    this.currentSource?.stop()
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
