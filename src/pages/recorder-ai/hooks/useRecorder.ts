import RecorderCoreManager from '../xunfei/recorder-core'

const APPID = 'f9b52f87'
const APISecret = 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl'
const APIKey = '287ae449056d33e0f4995f480737564a'
const url = 'wss://iat-api.xfyun.cn/v2/iat'
const host = 'iat-api.xfyun.cn'

export default function useRecorder(options: AnyObject) {
  const isFirstVisit = ref(true)
  const {
    RecordApp,
    Recorder,
    vueInstance,
  } = options || {}
  /**
   * @description 语音识别的class
   */
  const RecorderCoreClass = new RecorderCoreManager({
    APPID,
    APISecret,
    APIKey,
    url,
    host,
  }, onTextChanged)
  /** 识别是否关闭 */
  const isRunning = ref(false)
  /** 输入框内容 */
  const content = ref('')
  /** 是否已经按下了录音按钮 */
  const iseRecorderTouchStart = ref(false)
  /** 是否是取消操作 */
  const isRecorderClose = ref(false)
  /** 是否触发焦点 */
  const isFocus = ref(false)
  /** 显示录音按钮 */
  const showRecordingButton = ref(true)
  /** 录音识别结果 */
  const textRes = ref<string | null>(null)

  /**
   * 请求录音权限
   */
  function recReq() {
    return new Promise((resolve, reject) => {
      RecordApp.UniWebViewActivate(vueInstance) // App环境下必须先切换成当前页面WebView
      RecordApp.RequestPermission(
        () => {
          console.log('✅ 已获得录音权限，可以开始录音了')
          resolve(true)
        },
        (msg: string, isUserNotAllow: boolean) => {
          const errMsg = `请求录音权限失败：${msg} - ${isUserNotAllow ? '用户拒绝' : '其他原因'}`
          console.error(errMsg)
          reject(new Error(errMsg))
        },
      )
    })
  }

  /**
   * 开始录音
   */
  function recStart() {
    let lastIdx = 1e9
    let chunk: any = null
    const set = {
      type: 'pcm',
      sampleRate: 16000,
      bitRate: 16, // mp3格式，指定采样率hz、比特率kbps，其他参数使用默认配置；注意：是数字的参数必须提供数字，不要用字符串；需要使用的type类型，需提前把格式支持文件加载进来，比如使用wav格式需要提前加载wav.js编码引擎
      onProcess: (buffers: ArrayBuffer[], powerLevel: any, duration: any, sampleRate: number, _newBufferIdx: any, _asyncEnd: any) => {
        if (lastIdx > _newBufferIdx) {
          chunk = null // 重新录音了，重置环境
        }
        lastIdx = _newBufferIdx
        // 借用SampleData函数进行数据的连续处理，采样率转换是顺带的，得到新的pcm数据
        chunk = Recorder.SampleData(buffers, sampleRate, 16000, chunk)
        const pcmInt16 = new Int16Array(chunk.data)
        const arrayBuffer = pcmInt16.buffer // ✅ 得到最终的 ArrayBuffer
        // 在这儿可以进行语音识别的操作，如果更换语音识别，那么可以把这个arrayBuffer发送给语音识别的接口
        arrayBuffer ? RecorderCoreClass.pushAudioData(arrayBuffer) : null

        // #ifdef H5 || MP-WEIXIN
        if (vueInstance?.waveView)
          vueInstance.waveView.input(buffers[buffers.length - 1], powerLevel, sampleRate)
          // #endif
      },
      onProcess_renderjs: `function(buffers,powerLevel,duration,sampleRate,_newBufferIdx,_asyncEnd){
              if (this.lastIdx > _newBufferIdx) {
                this.chunk = null // 重新录音了，重置环境
              }
              this.lastIdx = _newBufferIdx
              this.chunk = Recorder.SampleData(buffers, sampleRate, 16000, this.chunk)
              const pcmInt16 = new Int16Array(this.chunk.data)
              const arrayBuffer = pcmInt16.buffer
              this.$ownerInstance.callMethod("pushPcmData", { array: Array.from(pcmInt16) })
  
              if(this.waveView) this.waveView.input(buffers[buffers.length-1],powerLevel,sampleRate);
            }`,

      takeoffEncodeChunk: true
        ? null
        : (chunkBytes: any) => {
            console.log('chunkBytes', chunkBytes)
          },
      takeoffEncodeChunk_renderjs: true
        ? null
        : `function(chunkBytes){
                //App中这里可以做一些仅在renderjs中才生效的事情，不提供也行，this是renderjs模块的this（也可以用This变量）
            }`,

      start_renderjs: `function(){
                //App中可以放一个函数，在Start成功时renderjs中会先调用这里的代码，this是renderjs模块的this（也可以用This变量）
                //放一些仅在renderjs中才生效的事情，比如初始化，不提供也行
            }`,
      stop_renderjs: `function(arrayBuffer,duration,mime){
                //App中可以放一个函数，在Stop成功时renderjs中会先调用这里的代码，this是renderjs模块的this（也可以用This变量）
                //放一些仅在renderjs中才生效的事情，不提供也行
            }`,
    }

    RecordApp.UniWebViewActivate(vueInstance) // App环境下必须先切换成当前页面WebView

    RecordApp.Start(set, () => {
      textRes.value = ''

      handleStart()
      RecorderCoreClass.on('log', (msg) => {
        console.log(msg)
      })
      // 创建音频可视化图形绘制，App环境下是在renderjs中绘制，H5、小程序等是在逻辑层中绘制，因此需要提供两段相同的代码
    }, (msg: any) => {
      console.error(`开始录音失败：${msg}`)
    })
  }
  /**
   * 停止录音
   */
  function recStop() {
    RecordApp.Stop((arrayBuffer: ArrayBuffer, duration: any, mime: any) => {
      if (typeof (Blob) != 'undefined' && typeof (window) == 'object') {
        const blob = new Blob([arrayBuffer], { type: mime })
        console.log(blob, (window.URL || webkitURL).createObjectURL(blob))
      }
    }, (msg: any) => {
      console.error(`结束录音失败：${msg}`)
    })
  }

  /**
   * 语音识别开启操作
   */
  function handleStart() {
    RecorderCoreClass.start()
    if (RecorderCoreClass.isRunning) {
      isRunning.value = true
    }
  }
  /**
   * 语音识别关闭操作
   */
  function handleStop() {
    return RecorderCoreClass.stop()
  }

  /**
   * 录音按钮切换 主要用于获取录音权限
   */
  function handleShowRecorder() {
    if (isFirstVisit.value) {
      recReq().then(() => {
        showRecordingButton.value = true
        isFirstVisit.value = false // 更新标志，后续不再请求录音权限
      }).catch((err: any) => {
        showRecordingButton.value = false
        showToastError(err)
      })
    }
    else {
      // 直接显示录音按钮
      showRecordingButton.value = true
    }
  }

  /**
   * 录音按钮按下
   */
  function handleRecorderTouchStart() {
    try {
      iseRecorderTouchStart.value = true
      isRecorderClose.value = false

      recStart()
    }
    catch (error: any) {
      showToastError(error)
    }
  }

  /**
   * 录音按钮松开
   */
  function handleRecorderTouchEnd() {
    return RecorderCoreClass.stop().then(() => {
      if (!RecorderCoreClass.isRunning) {
        isRunning.value = false
        recStop()
      }
    })
  }

  /**
   * 录音按钮取消录音
   */
  function handleRecorderClose() {
    // 是否是取消录音
    isRecorderClose.value = true
    handleStop()
  }
  /**
   * 录音按钮发送录音
   */
  function handleRecorderConfirm() {
  }

  /**
   * 识别结果实时返回
   */
  function onTextChanged(text: string) {
    textRes.value = text
  }

  function pushPcmData({ array }: any) {
    const pcmInt16 = new Int16Array(array)
    const buffer = pcmInt16.buffer
    RecorderCoreClass.pushAudioData(buffer)
  }
  return {
    /** 是否按下录音按钮 */
    iseRecorderTouchStart,
    /** 是否是取消操作 */
    isRecorderClose,
    /** 语音识别的class */
    RecorderCoreClass,
    /** 输入框内容 */
    content,
    /** 是否触发焦点 */
    isFocus,
    /** 显示录音按钮 */
    showRecordingButton,
    /** 录音识别结果 */
    textRes,
    /** 是否正在录音 */
    isRunning,
    /** 是否第一次访问 */
    isFirstVisit,
    /** 录音权限函数 */
    recReq,
    /** 开始录音函数 */
    recStart,
    /** 停止录音函数 */
    recStop,
    /** 语音识别开启操作 */
    handleStart,
    /** 语音识别关闭操作 */
    handleStop,
    /** 录音按钮切换 主要用于获取录音权限 */
    handleShowRecorder,
    /** 录音按钮按下 */
    handleRecorderTouchStart,
    /** 录音按钮松开 */
    handleRecorderTouchEnd,
    /** 录音按钮取消录音 */
    handleRecorderClose,
    /** 右侧录音按钮发送录音 */
    handleRecorderConfirm,
    /** pcm */
    pushPcmData,
  }
}
