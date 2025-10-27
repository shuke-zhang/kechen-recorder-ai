import type { InputMode } from 'plugin_shuke'
import RecorderCoreManager from '../xunfei/recorder-core'
import usePlayAudio from './usePlayAudio'
import type { UploadFileModel } from '@/model/chat'

const APPID = 'f9b52f87'
const APISecret = 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl'
const APIKey = '287ae449056d33e0f4995f480737564a'
const url = 'wss://iat-api.xfyun.cn/v2/iat'
const host = 'iat-api.xfyun.cn'

export default function useRecorder(options: {
  userAudioUploadSuccess: (res: UploadFileModel & { id: number, userInputTime: string }) => void
  recorderAddText: (text: string) => { id: number }
  sendMessage: () => void
}) {
  /**
   * @description 语音识别的class
   */
  const RecorderCoreClass = new RecorderCoreManager({
    APPID,
    APISecret,
    APIKey,
    url,
    host,
  }, onTextChange)
  const recorder = uni.requireNativePlugin('shuke_recorder') as ShukeRecorderPlugin

  const mic = uni.requireNativePlugin('shuke_microphone')
  // const { writeLogger } = useLogger()

  // 全局缓存变量
  let lastPowerLevel = 0
  let keepCount = 0

  const { playAudioInit, uploadFileAudio } = usePlayAudio(recorder)
  /** 识别是否关闭 */
  const isRecording = ref(false)
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
  function requestRecorderPermission() {
    return new Promise((resolve, reject) => {
      recorder.requestPermission((res) => {
        console.log('🎯 权限结果:', res)
        if (res?.granted) {
          resolve(true)
        }
        else {
          reject(new Error('用户拒绝录音权限'))
        }
      })
    })
  }

  /**
   * 开始录音
   */
  function recStart() {
    recorder.startRecord({
      sampleRate: 16000,
      enableAEC: true,
      enableNS: true,
      enableAGC: true,
    }, (res) => {
      // 有时 Android 返回字符串 JSON
      const msg: RecorderEvent
    = typeof res === 'string' ? (JSON.parse(res) as RecorderEvent) : res

      // 事件类型
      const event = msg.event

      switch (event) {
        /** ✅ 录音开始 */
        case 'start': {
          console.log('🎙 开始录音')
          RecorderCoreClass.start()
          break
        }

        /** 🛑 录音结束 */
        case 'stop': {
          isRecording.value = false
          console.log('🛑 停止录音')
          break
        }

        /** ❌ 错误事件 */
        case 'error': {
          isRecording.value = false
          const message = msg.message ?? '录音错误'
          console.error('录音错误：', message)
          break
        }

        /** 🎚️ 实时音频数据（音量、波形、时长） */
        case 'process': {
          // TS 自动识别这些字段类型（number / number / Record<string, number>[]）
          const { volume, duration, buffers } = msg

          if (volume !== undefined) {
            // console.log(`实时音量：${volume}`)
          }

          if (duration !== undefined) {
            // console.log(`录音时长：${duration} ms`)
          }

          if (buffers && buffers.length > 0) {
            const firstBuffer = buffers[0]
            const frame = Object.values(firstBuffer).map(Number)
            const pcmInt16 = new Int16Array(frame)
            const arrayBuffer = pcmInt16.buffer

            // 计算音量是否应保留
            const keep = shouldKeepAudio(volume)
            if (keep) {
              // console.warn('✅ 音量合适，上传数据', volume)
              RecorderCoreClass.pushAudioData(arrayBuffer)
              // writeLogger({ event: 'pushAudioData', powerLevel: volume, duration })
              silentStartTime = null
              hasWarnedSilence.value = false
              lastSilentWarnedSecond = 0

              // 存储有效音频帧
              if (!isRecorderStopped.value && arrayBuffer && !isBufferSilent(arrayBuffer)) {
                recorderBufferList.value.push(arrayBuffer)
              }
            }
            else {
              // 静音时缓存逻辑
              handleRecorderBuffer(arrayBuffer)
            }
          }
          break
        }

        /** 🎧 音频输入路由信息（蓝牙、USB、麦克风等） */
        case 'route': {
          const route = msg.data
          if (route) {
            console.log(
              `🎧 当前录音通道：${route.typeName || '未知'} (${route.productName || '设备'})`,
            )
          }
          break
        }

        /** 🚫 未知事件（兼容未来扩展） */
        default: {
          console.warn('⚠️ 未识别的录音事件：', msg)
          break
        }
      }
    })
  }
  /**
   * 停止录音
   */
  function recStop() {
    recorder.stopRecord((r: any) => {
      console.log('stopRecord 回调:', r)
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
    if (!isAutoRecognizerEnabled.value) {
      return console.warn('语音识别功能已被禁用')
    }
    RecorderCoreClass.start() // 在这儿开始会发送第一帧
    isRecorderStopped.value = false // ② 开始录音时允许写入
    recorderBufferList.value = []
    silentStartTime = null // 重置静音计时器
    hasWarnedSilence.value = false // 重置静音警告状态
    lastSilentWarnedSecond = 0 // 重置静音警告秒数

    if (RecorderCoreClass.isRecording) {
      isRecording.value = true
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
      console.log('识别停止---handleRecognitionStop', RecorderCoreClass.isRecording)
    })
  }

  /**
   * 录音按钮按下
   */
  function handleRecorderStart() {
    try {
      isAutoRecognize.value = true
      recStart()
      console.log(isAutoRecognizerEnabled.value, 'handleRecorderStart---isAutoRecognizerEnabled')
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
  function onTextChange(text: string) {
    console.log('识别结果返回', text)

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
      if (currentSecond > lastSilentWarnedSecond && currentSecond <= 3) {
        switch (currentSecond) {
          case 1:
            console.warn('⏱ 1秒内无有效语音数据')
            break
          case 2:
            console.warn('⏱ 2秒内无有效语音数据')
            break
          case 3:
            console.warn('⚠️ 3秒内无有效语音数据（已重启语音识别）')
            hasWarnedSilence.value = true
            handleRecognitionStart() // 你的重启函数
            break
        }
        lastSilentWarnedSecond = currentSecond
      }
    }
  }

  function shouldKeepAudio(currentPower: number): boolean {
    const THRESHOLD = 40 // 基准音量阈值
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

  /**
   * - usb - USB 外置麦克风
   * - wired - 有线耳机麦克风
   * - bluetooth - 蓝牙麦克风
   * - builtin - 内置麦克风
   */
  function setInputMode(type: InputMode) {
    mic.getInputDevices((res: any) => {
      if (res.ok) {
        console.log('输入设备', res.devices)
        // writeLogger({ event: 'getInputDevices', devices: res.devices })
      }
    })
    mic.setInputRoute(type, (ret: any) => {
      console.log('🔄 输出通道切换：', ret)
      // writeLogger({ event: 'setInputRoute', type, result: ret })
    })
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
    isRecording,
    /** 是否开启自动识别功能 */
    isAutoRecognize,
    /** 是否允许自动重启/自动启动语音识别 */
    isAutoRecognizerEnabled,
    /** 录音权限函数 */
    requestRecorderPermission,
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
    /**
     * - usb - USB 外置麦克风
     * - wired - 有线耳机麦克风
     * - bluetooth - 蓝牙麦克风
     * - builtin - 内置麦克风
     */
    setInputMode,
  }
}
