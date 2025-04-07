/**
 * @description 录音
 */
export default class Recorder extends EventEmitter {
  /** 录音实例 */
  public recorderInstance: UniApp.RecorderManager | null = null
  /** 录音配置 */
  private recorderOptions: UniApp.RecorderManagerStartOptions

  /**
   * @description 录音状态
   * stop: 停止
   * pause: 暂停
   * resume: 继续
   * start: 开始
   */
  public status: 'stop' | 'pause' | 'resume' | 'start' = 'stop'

  constructor(recorderOptions: UniApp.RecorderManagerStartOptions = {
    duration: 60000,
    sampleRate: 16000,
    numberOfChannels: 1,
    format: 'PCM',
    frameSize: 1,
  }) {
    super()
    this.recorderOptions = recorderOptions
    this.recorderInstance = uni.getRecorderManager()
    this.createRecorder()
  }

  /**
   * @description 初始化录音事件
   */
  private createRecorder() {
    this.recorderInstance?.onStart(() => {
      this.status = 'start'
      this.emit('log', '🔊 初始化录音')
      this.emit('onStart')
    })

    this.recorderInstance?.onPause(() => {
      this.status = 'pause'
      this.emit('log', '🔊 录音暂停')
      this.emit('onPause', { tempFilePath: '' }) // 假设返回的文件路径是空的
    })

    this.recorderInstance?.onStop((res) => {
      this.status = 'stop'
      this.emit('log', '🔊 录音停止')
      this.emit('onStop', res)
    })
    this.recorderInstance?.onFrameRecorded((res) => {
      this.emit('onFrameRecorded', res)
      this.emit('log', `🔊 录音帧onFrameRecorded类触发的数据: ${res.frameBuffer} bytes`)
    })

    this.recorderInstance?.onError((e) => {
      this.status = 'stop'
      this.emit('log', `🔊 录音出错: ${e.errMsg}`)
      this.emit('onError', e)
    })
  }

  /**
   * @description 开始录音
   */
  start() {
    if (this.status !== 'stop') {
      console.warn('录音已经开始或暂停')
      return
    }
    this.emit('log', '🔊 开始录音')
    this.recorderInstance?.start(this.recorderOptions)
  }

  /**
   * @description 暂停录音
   */
  pause() {
    if (this.status !== 'start') {
      console.warn('没有正在进行的录音')
      return
    }
    this.emit('log', '⏸️ 暂停录音')
    this.recorderInstance?.pause()
  }

  /**
   * @description 继续录音
   */
  resume() {
    if (this.status !== 'pause') {
      console.warn('没有暂停的录音')
      return
    }
    this.emit('log', '▶️ 继续录音')
    this.recorderInstance?.resume()
  }

  /**
   * @description 停止录音
   */
  stop() {
    if (this.status === 'stop') {
      console.warn('录音已经停止')
      return
    }
    this.emit('log', '🛑 停止录音')
    this.recorderInstance?.stop()
  }

  /**
   * @description 关闭录音实例，释放资源
   */
  destroy() {
    if (this.recorderInstance) {
      this.recorderInstance = null
      this.emit('log', '🗑️ 销毁录音实例')
    }
  }
}
