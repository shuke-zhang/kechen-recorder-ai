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

  // 全局缓存变量
  let lastPowerLevel = 0
  let keepCount = 0

  const { playAudioInit, uploadFileAudio } = usePlayAudio(RecordApp)
  /** 识别是否关闭 */
  const isRunning = ref(false)
  /** 输入框内容 */
  const content = ref('')

  /** 录音识别结果 */
  const textRes = ref<string | null>(null)
  /** 标识 标识是否往数组里面推送数据 true表示录音结束了 false表示录音开始 */
  const isRecorderStopped = ref(false)

  let silenceTimer: ReturnType<typeof setTimeout> | null = null
  let restartTimer: ReturnType<typeof setTimeout> | null = null
  const isAutoStop = ref(false) // 用于标记是否是自动停止
  /** 是否开启自动识别 */
  const isAutoRecognize = ref(false)
  /** 全局开关：是否允许自动重启/自动启动语音识别 */
  const isAutoRecognizerEnabled = ref(true)
  /** 存储流式响应数据-主要是用于合成文件后上传至后端 */
  const recorderBufferList = ref<ArrayBuffer[]>([])
  // 静音监控变量
  let silentStartTime: number | null = null
  const hasWarnedSilence = ref(false)
  let lastSilentWarnedSecond = 0

  /**
   * 请求录音权限
   */
  function recReq() {
    return new Promise((resolve, reject) => {
      RecordApp.UniAppUseLicense = `我已获得UniAppID=__UNI__8F99B58的商用授权`
      RecordApp.UniWebViewActivate(vueInstance) // App环境下必须先切换成当前页面WebView
      RecordApp.RequestPermission(
        () => {
          console.log('✅ 已获得录音权限，可以开始录音了')
          resolve(true)
          fileLog('已获得录音权限，可以开始录音了---RecordApp.RequestPermission')
        },
        (msg: string, isUserNotAllow: boolean) => {
          const errMsg = `请求录音权限失败：${msg} - ${isUserNotAllow ? '用户拒绝' : '其他原因'}`
          console.error(errMsg)
          fileLog(`请求录音权限失败：${msg} - ${isUserNotAllow ? '用户拒绝' : '其他原因'}`)
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
      bitRate: 16,
      onProcess: (buffers: ArrayBuffer[], powerLevel: number, duration: any, sampleRate: number, _newBufferIdx: any, _asyncEnd: any) => {
        if (lastIdx > _newBufferIdx) {
          chunk = null // 重新录音了，重置环境
        }
        fileLog(`onProcess... buffers.length: ${buffers.length}`)
        fileLog(`录音中... 音量：${powerLevel}`)
        fileLog(`录音中... duration：${duration}`)
        lastIdx = _newBufferIdx

        // 连续采样处理
        chunk = Recorder.SampleData(buffers, sampleRate, 16000, chunk)
        const pcmInt16 = new Int16Array(chunk.data)
        const arrayBuffer = pcmInt16.buffer

        const keep = shouldKeepAudio(powerLevel)
        if (keep) {
          console.warn('✅ 音量合适，上传数据')
          RecorderCoreClass.pushAudioData(arrayBuffer)
          silentStartTime = null
          hasWarnedSilence.value = false
          lastSilentWarnedSecond = 0
          if (!isRecorderStopped.value && arrayBuffer && !isBufferSilent(arrayBuffer)) {
            recorderBufferList.value.push(arrayBuffer)
          }
        }
        else {
          handleRecorderBuffer(arrayBuffer)
        }

        // ⚠️ 保留这部分逻辑，不受音量影响，确保语音识别控制流程完整

        // #ifdef H5 || MP-WEIXIN
        if (vueInstance?.waveView) {
          vueInstance.waveView.input(buffers[buffers.length - 1], powerLevel, sampleRate)
        }
        // #endif
      },
      audioTrackSet: {
        echoCancellation: true, // 回声消除（AEC）开关，不设置时由浏览器控制（一般为默认自动打开），设为true明确打开，设为false明确关闭
        noiseSuppression: true, // 降噪（ANS）开关，取值和回声消除开关一样
        autoGainControl: true, // 自动增益（AGC）开关，取值和回声消除开关一样
      },
      onProcess_renderjs: `function(buffers,powerLevel,duration,sampleRate,newBufferIdx,asyncEnd){
                //App中在这里修改buffers会改变生成的音频文件，但注意：buffers会先转发到逻辑层onProcess后才会调用本方法，因此在逻辑层的onProcess中需要重新修改一遍
                //本方法可以返回true，renderjs中的onProcess将开启异步模式，处理完后调用asyncEnd结束异步，注意：这里异步修改的buffers一样的不会在逻辑层的onProcess中生效
                //App中是在renderjs中进行的可视化图形绘制，因此需要写在这里，this是renderjs模块的this（也可以用This变量）；如果代码比较复杂，请直接在renderjs的methods里面放个方法xxxFunc，这里直接使用this.xxxFunc(args)进行调用
                if(this.waveView) this.waveView.input(buffers[buffers.length-1],powerLevel,sampleRate);
                
                /*和onProcess中一样进行释放清理内存，用于支持长时间录音
                if(this.clearBufferIdx>newBufferIdx){ this.clearBufferIdx=0 } //重新录音了就重置
                for(var i=this.clearBufferIdx||0;i<newBufferIdx;i++) buffers[i]=null;
                this.clearBufferIdx=newBufferIdx; */
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

      handleRecognitionStart()
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
   * 传入的音频数据是否是静音的 true 表示静音
   *
   */
  function isBufferSilent(arrayBuffer: ArrayBuffer, threshold = 20) {
    const pcm = new Int16Array(arrayBuffer)
    for (let i = 0; i < pcm.length; i++) {
      if (Math.abs(pcm[i]) > threshold)
        return false
    }
    return true
  }

  /**
   * 语音识别开启操作
   */
  function handleRecognitionStart() {
    console.log('handleRecognitionStart', isAutoRecognizerEnabled.value)

    if (!isAutoRecognizerEnabled.value) {
      return console.warn('语音识别功能已被禁用')
    }

    RecorderCoreClass.start() // 在这儿开始会发送第一帧
    isRecorderStopped.value = false // ② 开始录音时允许写入
    recorderBufferList.value = []
    silentStartTime = null // 重置静音计时器
    hasWarnedSilence.value = false // 重置静音警告状态
    lastSilentWarnedSecond = 0 // 重置静音警告秒数

    if (RecorderCoreClass.isRunning) {
      isRunning.value = true
    }
  }
  /**
   * 语音识别关闭操作
   */
  function handleRecognitionStop() {
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      silenceTimer = null
    }

    return RecorderCoreClass.stop().then(() => {
    })
  }

  /**
   * 录音按钮按下
   */
  function handleRecorderStart() {
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
    handleRecognitionStop().then(() => {
      const { wavBuffer } = playAudioInit(recorderBufferList.value)
      uploadFileAudio({
        wavBuffer,
        fileType: 'wav',
        fileNamePre: 'user-audio',
      }).then((res) => {
        options.userAudioUploadSuccess({ ...res, id, userInputTime })
      }).finally(() => {
        recorderBufferList.value = []
        isRecorderStopped.value = true
      })

      // 若是自动停止，则1秒后自动重启
      if (isAutoStop.value && isAutoRecognizerEnabled.value) {
        restartTimer = setTimeout(() => {
          // 这一步主要是为了实现对话效果
          // 同时在ai消息回复后立即开始语音识别
          console.log('🔁 自动重启语音识别')

          handleRecognitionStart()
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

  function normalizeText(text = '') {
    return text.replace(/[，。？！、“”‘’…—【】《》]/g, '') // 去除常见中文标点
  }

  /**
   * 用来识别静音状态的函数
   */
  function handleRecorderBuffer(arrayBuffer: ArrayBuffer) {
    if (!isRecorderStopped.value && arrayBuffer) {
      const now = Date.now()

      // 开始计时
      if (silentStartTime === null) {
        silentStartTime = now
        lastSilentWarnedSecond = 0
      }

      const silentDuration = now - silentStartTime
      const currentSecond = Math.floor(silentDuration / 1000)

      // 每秒打印一次警告（避免重复）
      if (currentSecond > lastSilentWarnedSecond && currentSecond <= 5) {
        switch (currentSecond) {
          case 1:
            console.warn('⏱ 1秒内无有效语音数据')
            break
          case 2:
            console.warn('⏱ 2秒内无有效语音数据')
            break
          case 3:
            console.warn('⏱ 3秒内无有效语音数据')
            break
          case 4:
            console.warn('⏱ 4秒内无有效语音数据（即将重启）')
            break
          case 5:
            console.warn('⚠️ 5秒内无有效语音数据（已重启语音识别）')
            hasWarnedSilence.value = true
            handleRecognitionStart() // 你的重启函数
            break
        }
        lastSilentWarnedSecond = currentSecond
      }
    }
  }

  function shouldKeepAudio(currentPower: number): boolean {
    const THRESHOLD = 10 // 基准音量阈值
    const KEEP_FRAMES = 2 // 音量下降后继续保留的帧数

    if (currentPower > THRESHOLD) {
    // 音量本次足够高，重置 keepCount，允许上传
      keepCount = KEEP_FRAMES
      lastPowerLevel = currentPower
      return true
    }

    if (lastPowerLevel > THRESHOLD) {
    // 本次音量低，但上次高，开启保留帧逻辑
      keepCount = KEEP_FRAMES
      lastPowerLevel = currentPower
      return true
    }

    if (keepCount > 0) {
      keepCount--
      lastPowerLevel = currentPower
      return true
    }

    lastPowerLevel = currentPower
    return false
  }

  watch(() => textRes.value, (newVal, oldVal) => {
  // 每次识别有新内容，就清除旧的定时器，重置倒计时
    if (silenceTimer) {
      clearTimeout(silenceTimer)
    }
    if (!isAutoRecognize.value) {
      return
    }

    const normNew = normalizeText(newVal || '')
    const normOld = normalizeText(oldVal || '')

    // ======= 1. 只插入一次user消息，后续全是update =======
    if (!newVal)
      return
    const { id } = options.recorderAddText(newVal || '')

    // 有新内容就重置计时器（内容变化才启动）
    if (normNew !== normOld) {
      const userInputTime = formatTime({ type: 'YYYY-MM-DD HH:mm:ss' })

      silenceTimer = setTimeout(() => {
        console.warn('⏱️ 1.5秒内无新内容，自动停止录音', normNew, normOld)
        isAutoStop.value = true // 标记为自动停止

        options.sendMessage()
        handleRecorderClose(
          id,
          userInputTime,
        )
        console.log(id, '查看新增消息的id')
      }, 1500)
    }
  })

  return {
    /** 语音识别的class */
    RecorderCoreClass,
    /** 输入框内容 */
    content,
    /** 录音识别结果 */
    textRes,
    /** 是否正在录音 */
    isRunning,
    /** 是否开启自动识别功能 */
    isAutoRecognize,
    /** 是否允许自动重启/自动启动语音识别 */
    isAutoRecognizerEnabled,
    /** 录音权限函数 */
    recReq,
    /** 开始录音函数 */
    recStart,
    /** 停止录音函数 */
    recStop,
    /** 语音识别开启操作 */
    handleRecognitionStart,
    /** 语音识别关闭操作 */
    handleRecognitionStop,
    /** 录音按钮按下 */
    handleRecorderStart,
  }
}
