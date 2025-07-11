import RecorderCoreManager from '../xunfei/recorder-core'
import usePlayAudio from './usePlayAudio'
import type { UploadFileModel } from '@/model/chat'

const APPID = 'f9b52f87'
const APISecret = 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl'
const APIKey = '287ae449056d33e0f4995f480737564a'
const url = 'wss://iat-api.xfyun.cn/v2/iat'
const host = 'iat-api.xfyun.cn'

/**
 * 发送消息的逻辑
 */
interface RecorderVoid {
  sendMessage: () => void
  recorderAddText: (text: string) => { id: number }
  userAudioUploadSuccess: (res: UploadFileModel & { id: number, userInputTime: string }) => void

}

export default function useRecorder(options: AnyObject & RecorderVoid) {
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

  const { playAudioInit, uploadFileAudio } = usePlayAudio(RecordApp)
  /** 识别是否关闭 */
  const isRunning = ref(false)
  /** 输入框内容 */
  const content = ref('')

  /** 是否触发焦点 */
  const isFocus = ref(false)
  /** 显示录音按钮 */
  const showRecordingButton = ref(true)
  /** 录音识别结果 */
  const textRes = ref<string | null>(null)

  let silenceTimer: ReturnType<typeof setTimeout> | null = null
  let restartTimer: ReturnType<typeof setTimeout> | null = null
  const isAutoStop = ref(false) // 用于标记是否是自动停止
  /** 是否开启自动识别 */
  const isAutoRecognize = ref(false)
  const hasInsertedPlaceholder = ref(false)
  /** 存储流式响应数据 */
  const recorderBufferList = ref<ArrayBuffer[]>([])
  /** 是否是第一次初始化 */
  const isFirstRecorderText = ref(true)

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
        recorderBufferList.value.push(arrayBuffer)
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
    console.log('handleStop11111111')

    if (silenceTimer) {
      console.log('handleStop222222')

      clearTimeout(silenceTimer)
      silenceTimer = null
    }
    console.log('333333')

    return RecorderCoreClass.stop().then(() => {
      console.log('关闭成功666666666666666')
    })
  }

  /**
   * 录音按钮按下
   */
  function handleRecorderTouchStart() {
    try {
      isAutoRecognize.value = true
      recStart()
    }
    catch (error: any) {
      showToastError(error)
    }
  }

  /**
   * 取消录音
   */
  function handleRecorderClose(id: number, userInputTime: string) {
    // 是否是取消录音
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      silenceTimer = null
    }
    if (restartTimer) {
      clearTimeout(restartTimer)
      restartTimer = null
    }
    handleStop().then(() => {
      const { wavBuffer } = playAudioInit(recorderBufferList.value)
      uploadFileAudio({
        wavBuffer,
        fileType: 'wav',
        fileNamePre: 'user-audio',
      }).then((res) => {
        options.userAudioUploadSuccess({ ...res, id, userInputTime })
      })

      // 若是自动停止，则1秒后自动重启
      if (isAutoStop.value) {
        restartTimer = setTimeout(() => {
          // 这一步主要是为了实现对话效果
          // 同时在ai消息回复后立即开始语音识别
          console.log('🔁 自动重启语音识别')

          handleStart()
        }, 1000)
      }
      isAutoStop.value = false // 重置标记
    })
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

  function normalizeText(text = '') {
    return text.replace(/[，。？！、“”‘’…—【】《》]/g, '') // 去除常见中文标点
  }

  watch(() => textRes.value, (newVal, oldVal) => {
  // 每次识别有新内容，就清除旧的定时器，重置2秒倒计时
    if (silenceTimer) {
      clearTimeout(silenceTimer)
    }
    if (!isAutoRecognize.value) {
      return
    }

    const normNew = normalizeText(newVal || '')
    const normOld = normalizeText(oldVal || '')

    // 插入新消息，具体判断逻辑在 recorderAddText
    const { id } = options.recorderAddText(newVal || '')

    // 如果识别内容发生变化，说明是新内容，重新设置定时器
    if (normNew !== normOld) {
      const userInputTime = formatTime({ type: 'YYYY-MM-DD HH:mm:ss' })
      console.log('进入了')

      silenceTimer = setTimeout(() => {
        console.warn('⏱️ 2秒内无新内容，自动停止录音', normNew, normOld)
        isAutoStop.value = true // ⭐ 标记为自动停止

        options.sendMessage()
        handleRecorderClose(id, userInputTime)
        // 重置标志，允许下一轮识别重新插入占位
        hasInsertedPlaceholder.value = false
      }, 2000)
    }
  })
  return {

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
    /** 是否开启自动识别功能 */
    isAutoRecognize,
    /** 是否是第一次初始化 */
    isFirstRecorderText,
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
    /** 录音按钮按下 */
    handleRecorderTouchStart,
    /** pcm */
    pushPcmData,
  }
}
