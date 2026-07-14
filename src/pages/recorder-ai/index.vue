<script setup lang='ts'>
import { useTextFormatter } from './hooks/useTextFormatter'
import RecorderInputAuto from './recorder-input-auto.vue'
import chatVideo from './components/chat-video.vue'
import useRecorder from './hooks/useRecorder'
import usePlayAudio from './hooks/usePlayAudio'
import useAiPage from './hooks/useAiPage'
import { usePluginShuke } from './hooks/usePluginShuke'
import type { StatusModel } from '@/components/audio-wave/audio-wave'
import type { ChatHistoryModel, UploadFileModel } from '@/model/chat'
import { NAV_BAR_HEIGHT, getStatusBarHeight } from '@/components/nav-bar/nav-bar'
import { useAiCall } from '@/store/modules/ai-call'
import { doubaoSpeechSynthesisFormat } from '@/api/audio'

import { addChatHistory } from '@/api/chat-history'

const recorder = uni.requireNativePlugin('shuke_recorder') as ShukeRecorderPlugin

const pageHeight = computed(() => {
  return `${getStatusBarHeight() + NAV_BAR_HEIGHT + 1}px`
})

const router = useRouter<{
  modelName: string
}>()

const aiCall = useAiCall()
/** 主要用于初进页面的语音播报 默认需要两秒后变为true 解决播放器需要初始化的2秒左右的bug */
const initialLoadPending = ref(false)
/**
 * 用来表述当前的播放状态
 * - 当自己没有开始说话时使用 pending 表示可以 你可以开始说话
 * - 当自己说话中的时候 playing  表示 正在识别...
 * - 当ai在回复并且自己已经说话完成的时候 stopped   表示说话或者点击打断ai回复
 */
const recorderStatus = ref<StatusModel >('pending')
console.log(`当前页面的高度`, pageHeight.value)

/**
 * 音频播放
 */
const { isAudioRunning, playAudio, stopAudio } = usePluginShuke({
  onStart: () => {
    onStreamPlayStart()
  },
  onStop: () => {
    onStreamStop()
  },
  onQueueEmpty: () => {
    onStreamPlayEnd()
  },
  onProgress: () => {
    // 播放中不允许跳转屏保
    resetIdleTimer()
  },
})

/**
 * 视频播放组件实例
 */
const chatVideoRef = ref<InstanceType<typeof chatVideo> | null>(null)
// 页面脚本：新增
const canMountChatVideo = ref(false)

const systemInfo = uni.getSystemInfoSync()
const windowHeight = systemInfo.windowHeight // 单位是 px，不是 rpx
const inputHeight = computed(() => {
  return isPad ? '50px' : '140rpx'
})
const scrollViewHeight = `${windowHeight * 0.15}px`
console.log(scrollViewHeight, 'scrollViewHeight')

const isAutoPlaying = ref(false)

const { base64ToArrayBuffer, playAudioInit, uploadFileAudio } = usePlayAudio(recorder)

const {
  chatSSEClientRef,
  content,
  isAiMessageEnd,
  loading,
  modelName,
  modelPrefix,
  replyForm,
  onSuccess,
  onFinish,
  resetAi,
  stopChat,
  onStart,
  onError,
  handleChangeAiModel,
  handleSendMsg,
  handleCopy,
  setAiContent,
} = useAiPage()
const startTime = ref(0)
const handleTouchStart = debounce(() => {
  removeEmptyMessagesByRole('assistant')
  startTime.value = Date.now()
  stopAll()

  handleConfirm()
}, 300)
const {
  textRes,
  isRecording,
  isAutoRecognize,
  isAutoRecognizerEnabled,
  requestRecorderPermission,
  handleRecorderStart,
  handleRecognitionStop,
  handleRecognitionStart,
  setInputMode,
  recStop,
} = useRecorder({
  sendMessage: handleTouchStart,
  recorderAddText,
  userAudioUploadSuccess,
  resetIdleTimer,
})

const { processText, textReset } = useTextFormatter()

const scrollViewRef = ref(null)
const animatedDots = ref('')
let dotTimer: NodeJS.Timeout | null = null
const currentIndex = ref<number | null>(null)
const tempBuffers = ref<{ audio_data: string, text: string }[]>([])
const tempFormattedTexts = ref<string[]>([])

// 是否切换到新的消息进行播放
const isSwitchingNewMessage = ref(false)
/** 控制屏保 */
const isScreensaver = ref(true)
/** ai回复的音频数据 */
const assistantAudioBuffers = ref<{
  buffers: ArrayBuffer
  id: number
}[]>([])
const scrollTop = ref(0)
// 全局变量存储格式化器实例和当前处理的消息索引
let lastProcessedIndex: number | null = null
/** 代表当点击了音频小图标时 ，如果此时ai消息还没回复完音频也在播放时为true 否则为false 主要是用于判断ai回复中点击了音频图标后不再需要自动播放 */
const hasUserInterruptedAutoPlay = ref(false)
const lastAiMsgEnd = ref(false)
/** 无操作逻辑 */
const idleTimeout = ref< ReturnType<typeof setTimeout> | null>(null)
const IDLE_DELAY = 30 * 1000 // 2分钟
// 使用变量统一控制时间
const SILENCE_DELAY = 10 * 1000
const canStartIdleTimer = computed(() => {
  return !isAudioRunning.value && !loading.value
})

/**
 * 静默模式触发操作
 */
const isSilence = ref(false)
const isAutoPlay = ref(false)

const silenceTimer = new IdleTimer({
  text: `当前无操作，静默模式`,
  delay: SILENCE_DELAY,
  isLog: true,
  onTimeout: () => {
    isSilence.value = true
    isAutoPlay.value = true
    // console.warn('当前页面空闲中，触发静默模式', isSilence.value)
  },
})

/**
 * 屏保触发操作
 */
const screensaverTimer = new IdleTimer({
  text: '监听到用户无操作',
  delay: IDLE_DELAY, // 你原本的 IDLE_DELAY 值
  isLog: true,
  onTimeout: async () => {
    // console.log('⏳ 空闲超时触发，执行屏保逻辑')

    // 停止语音识别
    await handleRecognitionStop()
    isAutoRecognize.value = false
    stopAll()

    // 跳转屏保页面
    router.replace('/pages/screensaver/index')

    content.value = []
    resetAi.value()
    replyForm.value = { content: '', role: 'user' }
    isAutoRecognizerEnabled.value = false
    requestRecorderPermission()
  },
})

/**
 * 临时存储新增历史记录的数组
 */
const addChatHistoryForm = ref<ChatHistoryModel>({})
const chatHistoryMap = new Map<number, ChatHistoryModel>()
const chatOrder = ref<number[]>([])
const addChatHistoryId = ref(0)
/**
 * ai回复的最新时间
 */
const assistantAudioTime = ref('')
/**
 * 全局计数器 主要是用于判断ai返回的请求音频的接口是否全部请求完成
 */
const ttsPendingCount = ref(0)
const hasPrepared = ref(false)

// 每次发送 TTS（音频）接口时，+1
function ttsRequestStart() {
  ttsPendingCount.value++
  if (ttsPendingCount.value < 0)
    ttsPendingCount.value = 0
}

// 每次 TTS 请求结束（无论成功失败），-1
function ttsRequestEnd() {
  if (ttsPendingCount.value > 0) {
    ttsPendingCount.value--
  }
  if (ttsPendingCount.value < 0)
    ttsPendingCount.value = 0
  checkIfAllReady()
}

// 检查“准备完成”逻辑
function checkIfAllReady() {
  // AI回复已经结束，且音频全部返回
  if (ttsPendingCount.value < 0)
    ttsPendingCount.value = 0
  if (isAiMessageEnd.value && ttsPendingCount.value === 0) {
    // 上传历史记录到服务器
    assistantReplySuccess()
  }
}

function assistantReplySuccess() {
  const id = chatOrder.value?.length ? chatOrder.value[addChatHistoryId.value] : 0
  // console.log('查看这该死的内容', chatOrder.value, addChatHistoryId.value, id)

  if (!content.value.length)
    return

  const assistants = content.value.filter(item => item.role === 'assistant')
  const last = assistants[assistants.length - 1]

  if (!hasPrepared.value && last) {
    hasPrepared.value = true
    // 这里是你的“准备完成”操作
    const _buffers = assistantAudioBuffers.value.sort((a, b) => a.id - b.id).map(item => item.buffers)
    const { wavBuffer } = playAudioInit(_buffers)
    let url = ''
    const content = last.content as string

    uploadFileAudio({
      wavBuffer,
      fileType: 'wav',
      fileNamePre: 'assistant-audio',
    }).then((res) => {
      url = res.url
    }).finally(() => {
      addChatHistoryForm.value.assistantAudio = url || '' // 音频地址
      addChatHistoryForm.value.assistantAudioTime = formatTime({ type: 'YYYY-MM-DD HH:mm:ss' }) // 音频时间
      addChatHistoryForm.value.assistantOutput = content // 文本 这儿直接用last 因为这儿总是在下次发送之前有
      addChatHistoryForm.value.assistantOutputTime = assistantAudioTime.value // 文本时间
      assistantAudioBuffers.value = []

      const oldData = chatHistoryMap.get(id) || {}
      chatHistoryMap.set(id, {
        ...oldData,
        assistantAudio: url,
        assistantAudioTime: formatTime({ type: 'YYYY-MM-DD HH:mm:ss' }),
        assistantOutput: content,
        assistantOutputTime: assistantAudioTime.value,
      })
      submitChatHistory(id)
    })
    // ...其他操作
  }
}
/**
 * 新增ai聊天历史对话
 */
function submitChatHistory(id: number) {
  // const id = addChatHistoryId.value

  try {
    // console.error('使用了user内容')
    const dataByMap = chatHistoryMap.get(id) || {}
    // addChatHistoryId.value++
    // console.log('dataByMap', id, dataByMap)
    // 判断 dataByMap 的每一项都有内容才开始上传
    const requiredFields = [
      'userAudio',
      'userAudioTime',
      'userInput',
      'userInputTime',

      'assistantAudio',
      'assistantAudioTime',
      'assistantOutput',
      'assistantOutputTime',
    ]
    const allFieldsFilled = requiredFields.every(field => !!dataByMap[field])
    if (!allFieldsFilled) {
      // console.warn('chatHistory未填写完整，跳过上传', dataByMap)
      return
    }
    addChatHistory(dataByMap).then((res) => {
      // console.log('新增历史记录成功——————————', res)
      chatHistoryMap.delete(id) // ✅ 上传成功后删除对应记录
    }).finally(() => {
      addChatHistoryId.value++
      addChatHistoryForm.value = {}
    })
  }
  catch (error) {
    console.log('新增失败', error)
  }
}

/** 重置定时器 */
function resetIdleTimer() {
  // console.log('监听到用户操作，重置定时器')

  // 如果当前状态不允许开启定时器（如正在播放或AI回复中）
  if (!canStartIdleTimer.value) {
    screensaverTimer.stop()
    silenceTimer.stop()
    return
  }

  // 启动/重置空闲倒计时
  screensaverTimer.reset()

  silenceTimer.reset()
}

/** 发送消息确认按钮 */
function onConfirm() {
  resetIdleTimer()
  handleConfirm()
}

/**
 * ai内容自动播放音频
 */
async function autoPlayAiMessage(_text: string, index: number) {
  assistantAudioTime.value = formatTime({ type: 'YYYY-MM-DD HH:mm:ss' })

  // 设置当前播放的消息索引
  currentIndex.value = index

  // 如果是新的消息，重置格式化器
  if (currentIndex.value !== lastProcessedIndex) {
    textReset()
    lastProcessedIndex = currentIndex.value
  }
  // 开始语音合成并播放
  const longText = processText({
    text: _text,
    isFullText: false,
    forceFlush: isAiMessageEnd.value,
  })

  // 处理文本 下面是对接后端的音频 采用接口的方式
  if (longText.trim().length > 0) {
    tempFormattedTexts.value.push(longText)
    //  判断是不是新的ai消息
    if (tempFormattedTexts.value.findIndex(t => t === longText) === 0 && !isAiMessageEnd.value) {
      stopAudio()
      assistantAudioBuffers.value = []
    }
    // console.log('查看文本longText', longText, longText.length)

    ttsRequestStart()
    // console.log('请求音频接口', longText, tempFormattedTexts.value.findIndex(t => t === longText) || 0)

    doubaoSpeechSynthesisFormat({
      text: longText,
      id: tempFormattedTexts.value.findIndex(t => t === longText) || 0,
    }, tempFormattedTexts.value.findIndex(t => t === longText) === 0).then((res) => {
      // ✅ 如果用户已经点了停止/切换，直接丢弃
      if (currentIndex.value !== index) {
        // console.log('丢弃过期的音频', res)
        return
      }
      const { audio_base64, id } = res

      playAudio({
        id,
        base64: audio_base64,
      })
      const audio_buffer = base64ToArrayBuffer(audio_base64)
      assistantAudioBuffers.value.push({
        buffers: audio_buffer,
        id,
      })
      // console.log('接口请求成功', res)

      // ai返回的消息结束了
      if (isAiMessageEnd.value) {
        tempFormattedTexts.value = []
        hasUserInterruptedAutoPlay.value = false
      }
    }).catch((_error) => {
      isAudioRunning.value = false
      // console.log(_error, 'ai自动播放音频错误')
    }).finally(() => {
      console.log('音频请求结束')

      ttsRequestEnd()
    })
  }
}

/**
 * 屏保触发事件
 */
async function onScreensaverTrigger() {
  // ✅ 尝试提交所有已完成但未上传的历史记录
  // for (const [id, data] of chatHistoryMap.entries()) {
  //   const requiredFields = [
  //     'userAudio',
  //     'userAudioTime',
  //     'userInput',
  //     'userInputTime',
  //     'assistantAudio',
  //     'assistantAudioTime',
  //     'assistantOutput',
  //     'assistantOutputTime',
  //   ]
  //   const allFieldsFilled = requiredFields.every(field => !!data[field])
  //   if (allFieldsFilled) {
  //     submitChatHistory(id)
  //   }
  //   else {
  //     console.warn(`屏保前检测到未完成记录（未提交），ID: ${id}`, data)
  //   }
  // }
  isScreensaver.value = false
  resetIdleTimer()
  // console.log('进入操作页面')

  if (initialLoadPending.value) {
    playDefaultAudioData()
  }
  else {
    // 等待 initialLoadPending 为 true 再继续
    try {
      await waitUntil(() => initialLoadPending.value)
      playDefaultAudioData()
      // console.log('等待初始化完成啦')
    }
    catch (e) {
      console.error('等待 initialLoadPending 超时', e)
    }
  }
  isAutoRecognizerEnabled.value = true
  isAutoPlaying.value = true
  handleRecorderStart()
}

/**
 * 播放静默音频事件
 */
function playDefaultAudioData() {
  playAudio({
    id: 0,
    base64: aiCall.callAudioData.audioData,
  })
}

function waitUntil(conditionFn: () => boolean, interval = 50, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const timer = setInterval(() => {
      if (conditionFn()) {
        clearInterval(timer)
        resolve()
      }
      else if (Date.now() - start > timeout) {
        clearInterval(timer)
        reject(new Error('waitUntil 超时'))
      }
    }, interval)
  })
}

function userMsgFormat(prefix: string, text: string, isFormat = true) {
  if (!isFormat)
    return text
  const index = text.indexOf(prefix)

  if (index === -1) {
    return text // 没有前缀就返回原内容
  }
  return text.slice(index + prefix.length)
}

/**
 * 发送消息确认按钮
 */
async function handleConfirm() {
  stopAudio()
  tempFormattedTexts.value = []
  tempBuffers.value = []
  removeEmptyMessagesByRole('assistant') // 移除assistant角色的空消息

  //  点击时如果ai消息没有返回完 ，并且正在播放，直接停止
  if ((!isAiMessageEnd.value && loading.value) || isAudioRunning.value) {
    await stopAll()
    // 停止音频播放
    handleSendMsg()
    return
  }

  handleSendMsg()
}

/**
 * ai消息点击语音
 * @warning 由于语音点击之后播放音频会有延迟， 所以在这儿直接设置状态
 */
const handleRecorder = debounce((text: string, index: number) => {
  // 如果 AI 消息还在回复中，标记用户中断自动播放
  if (!isAiMessageEnd.value) {
    hasUserInterruptedAutoPlay.value = true
  }
  // 当前已经在播放此条消息
  if (currentIndex.value === index && isAudioRunning.value) {
    console.log('🟡 再次点击同一条，执行停止')
    stopAudio()
    currentIndex.value = null
    return
  }

  // 如果正在播放且是新的消息，先停止当前播放
  if (currentIndex.value !== null && isAudioRunning.value) {
    isSwitchingNewMessage.value = true
    console.log('🔴 切换新消息，先停止已播放的消息')
    stopAudio()
  }

  // ✅ 开始新的播放
  console.log('🟢 开始播放新消息')
  currentIndex.value = index
  isSilence.value = false // 关闭静默模式
  isAutoPlay.value = false // 关闭自动播放 因为此时还没有真正的播放视频
  const longTexts = processText({
    text,
    isFullText: true,
  })

  longTexts.forEach((longText, i) => {
    if (longText.trim().length > 0) {
      doubaoSpeechSynthesisFormat({
        text: longText,
        id: i,
      }).then((res) => {
        const { audio_base64, id } = res
        playAudio({
          id,
          base64: audio_base64,
        })
      }).catch((e) => {
        console.log('点击时捕获到错误', e)
        currentIndex.value = null
      })
    }
  })
}, 500)

/**
 * 语音播放真正的开始
 */
function onStreamPlayStart() {
  isAudioRunning.value = true
  // 关闭静默模式
  isSilence.value = false
  isAutoPlay.value = true
  recorderStatus.value = 'stopped'
}

/**
 * 语音任务队列播放结束
 */
function onStreamPlayEnd() {
  console.log('语音播放结束')

  /**
   * 这儿使用  isSwitchingNewMessage 来控制立即更新 isStreamPlaying 的状态的
   * 已知当我前几切换新的消息播放时 ， 会触发该函数，此时会关闭 isStreamPlaying 的状态
   * 此时 isSwitchingNewMessage 的状态就不是在我点击后立即触发了，而是在音频播放时才触发，这会造成观看上的延迟
   * 所以在这儿使用 isSwitchingNewMessage 来控制立即更新 isStreamPlaying 的状态的
   */
  if (isSwitchingNewMessage.value) {
    isSwitchingNewMessage.value = false
  }
  else {
    currentIndex.value = null
  }
  isAudioRunning.value = false
  recorderStatus.value = 'pending'
}
/**
 * 语音播放主动停止
 */
function onStreamStop() {
  isAudioRunning.value = false
  currentIndex.value = null
}

/**
 * 根据角色类型删除最后一条消息
 */
function removeEmptyMessagesByRole(type: string) {
  for (let i = content.value.length - 1; i >= 0; i--) {
    const item = content.value[i]
    const raw = item.content
    const text = Array.isArray(raw) ? raw[0]?.text ?? '' : raw ?? ''

    const isEmpty = typeof text === 'string' && text.trim() === ''
    if (item.role === type && isEmpty) {
      content.value.splice(i, 1)
    }
  }
}
let incrementTimer: ReturnType<typeof setTimeout> | null = null
const incrementCacheText = ref('')
const hasInsertedPlaceholder = ref(false)
const lastInsertResult = ref<{ id: number } | null>(null)

function recorderAddText(text: string): { id: number } {
  if (!text) {
    return { id: -1 }
  }
  ttsPendingCount.value = 0

  recorderStatus.value = 'playing'

  if (!hasInsertedPlaceholder.value) {
    hasInsertedPlaceholder.value = true
    // 调用addText并缓存整个返回值
    lastInsertResult.value = addText(text)
    return toRaw(lastInsertResult.value || { id: -2 })
  }
  // 增量期间只做内容缓存
  incrementCacheText.value = text
  if (incrementTimer)
    clearTimeout(incrementTimer)
  incrementTimer = setTimeout(() => {
    incrementTimer = null
    incrementCacheText.value = ''
  }, 1500)
  // 后面每次都直接返回第一次addText的返回内容
  return toRaw(lastInsertResult.value || { id: -3 })
}

/** 重置缓存状态 */
function resetRecorderTextState() {
  incrementCacheText.value = ''
  hasInsertedPlaceholder.value = false
  lastInsertResult.value = null
}

function addText(text: string) {
  const last = content.value[content.value.length - 1]

  if (last?.isRecordingPlaceholder)
    return last.id === 0 ? { id: last.id } : { id: last.id || -2 }
  stopAll()
  console.log('关闭逻辑调用最后结束')

  replyForm.value.content = modelPrefix.value + text
  // let finalText = text
  // if (!text.startsWith(modelPrefix.value)) {
  //   finalText = modelPrefix.value + text
  // }
  const sendText = setAiContent({
    type: 'send',
    msg: replyForm.value.content, // 空消息作为占位
    modeName: modelName.value || '',
    id: content.value.length,
  })
  sendText.isRecordingPlaceholder = true // ✅ 标记占位消息
  content.value?.push(sendText)
  recorderStatus.value = 'playing'
  console.warn('触发新增消息', recorderStatus.value)
  return {
    id: sendText.id!,
  }
}

/**
 * 用户语音上传成功的回调函数
 */
function userAudioUploadSuccess(res: UploadFileModel & { id: number, userInputTime: string }) {
  //  通过id来查询content.value中相匹配的数据，并且赋值
  // 先重置刚刚缓存的状态
  resetRecorderTextState()
  const item = content.value.find(item => item.id === res.id && item.role === 'user')
  if (item) {
    item.userAudioUrl = res.url
    item.userAudioTime = formatTime({ type: 'YYYY-MM-DD HH:mm:ss' })
    item.userInputTime = res.userInputTime
  }

  addChatHistoryForm.value.userAudio = res.url // 音频地址
  addChatHistoryForm.value.userAudioTime = formatTime({ type: 'YYYY-MM-DD HH:mm:ss' }) // 音频上传时间
  addChatHistoryForm.value.userInput = userMsgFormat(modelPrefix.value, (item?.content as string) || '', true)// 文本
  addChatHistoryForm.value.userInputTime = res.userInputTime // 文本时间

  console.error('user内容注入了')

  // 1. 保存内容到 Map
  chatHistoryMap.set(res.id, {
    userAudio: res.url,
    userAudioTime: formatTime({ type: 'YYYY-MM-DD HH:mm:ss' }),
    userInput: userMsgFormat(modelPrefix.value, (item?.content as string) || '', true),
    userInputTime: res.userInputTime,
    // assistant 相关字段可先为空
  })

  // 2. id 进顺序队列（如果没加过）
  if (!chatOrder.value?.includes(res.id)) {
    chatOrder.value?.push(res.id)
  }

  console.log('语音识别结束了', chatOrder.value)
}

async function stopAll() {
  console.warn('🚫 强制关闭所有逻辑')
  // 停止ai回复的消息
  await stopChat.value()
  // 停止音频播放 实际上这儿并不是同步的，只是触发了stop方法
  await stopAudio()
  currentIndex.value = null
  // 重置格式化器
  textReset()
  // 重置音频播放真正的状态
  isAudioRunning.value = false
  hasPrepared.value = false
  ttsPendingCount.value = 0
  console.error('清空user和助手内容')
  addChatHistoryForm.value = {}

  console.log('关闭逻辑函数结束-----')
}

watch([isAudioRunning, loading], ([isPlaying, isLoading]) => {
  if (!isPlaying || !isLoading) {
    // 都结束了才开始倒计时
    resetIdleTimer()
  }
  else {
    // 任意一个是true，就清掉已有定时器
    if (idleTimeout.value)
      clearTimeout(idleTimeout.value)
  }
})
// 添加一个监听最后一条消息内容的变化（对于流式输出非常有用）
watch(
  () => content.value[content.value.length - 1]?.content,
  (newVal, oldVal) => {
    if (content.value.length > 0) {
      nextTick(() => {
        scrollTop.value = Date.now() + 1000
      })

      // 检查最后一条消息是否是AI的回复
      const lastMessage = content.value[content.value.length - 1]

      if (lastMessage?.role === 'assistant' && lastMessage?.streaming) {
        recorderStatus.value = 'stopped'
        // 自动播放
        autoPlayAiMessage(lastMessage.content as string || ' ', content.value.length - 1)
      }
    }
  },
)

watch(() => isAiMessageEnd.value, (newVal) => {
  if (newVal) {
    lastAiMsgEnd.value = true

    tempFormattedTexts.value = []
    hasUserInterruptedAutoPlay.value = false
    checkIfAllReady()
  }
})

// watch(ttsPendingCount, () => {
//   checkIfAllReady()
// })

watch(
  content.value,
  (newVal) => {
    console.log('content变化了', newVal)

    nextTick(() => {
      scrollTop.value = Date.now() + 500
    })
  },
  { deep: true },
)

// 监听语音识别开始和结束 添加省略号动画
watch(() => isRecording.value, (val: boolean) => {
  if (val) {
    animatedDots.value = '.'
    dotTimer = setInterval(() => {
      animatedDots.value = animatedDots.value.length >= 3 ? '.' : `${animatedDots.value}.`
    }, 500)
  }
  else {
    if (dotTimer)
      clearInterval(dotTimer)
    dotTimer = null
    animatedDots.value = ''
  }
})

/** 语音识别结果返回 - 可以添加识别  */
watch(() => textRes.value, async (newVal) => {
  await nextTick() // 确保视图更新完成
  // replyForm.value.content = modelPrefix.value + newVal as string

  replyForm.value.content = newVal?.startsWith(modelPrefix.value) ? newVal : modelPrefix.value + newVal
  isSilence.value = false // 重置静默模式状态
  isAutoPlay.value = false // 重置自动播放状态
})

watch(() => replyForm.value.content, (newVal) => {
  resetIdleTimer()
})

onMounted(() => {
  requestRecorderPermission().then((res) => {
    onScreensaverTrigger()
    handleRecognitionStart()
    setInputMode('usb')
  }).catch((err) => {
    showToastError(err)
    console.log(err, '请求权限拒绝')
  }).finally(() => {
    canMountChatVideo.value = true
    setTimeout(() => {
      initialLoadPending.value = true
    }, 1500)
  })
  addChatHistoryId.value = 0
  // initHeights()
  let unlocked = false
  const unlockAudio = () => {
    if (unlocked)
      return
    unlocked = true

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    osc.connect(ctx.destination)
    osc.start()
    osc.stop()
    console.log('🔓 AudioContext 已解锁')

    // 只需要执行一次，解锁后解绑监听
    document.removeEventListener('touchstart', unlockAudio)
    document.removeEventListener('click', unlockAudio)
  }
  handleChangeAiModel()
})

onBeforeUnmount(() => {
  isAutoPlaying.value = false
  isAutoRecognizerEnabled.value = false
  stopAudio()
  recStop()
})
</script>

<template>
  <view class="h-100vh" @touchstart="resetIdleTimer" @touchmove="resetIdleTimer" @touchend="resetIdleTimer" @click="resetIdleTimer" @scroll="resetIdleTimer">
    <!-- 流式流式ai消息 -->
    <GaoChatSSEClient
      ref="chatSSEClientRef"
      @on-open="onStart"
      @on-error="onError"
      @on-message="onSuccess && onSuccess?.($event)"
      @on-finish="onFinish"
    />

    <view class="size-full ">
      <view :style="{ height: `calc(100% - ${inputHeight}  ` }" class="">
        <view
          class="w-full h-85%  pointer-events-none"
        >
          <chat-video
            v-if="canMountChatVideo"
            ref="chatVideoRef"
            v-model:silence="isSilence"
            v-model:play="isAutoPlay"
            :is-reset="!isAudioRunning"
            :is-play="isAudioRunning"
          />
        </view>
        <view class="h-15% pb-120rpx ">
          <scroll-view
            ref="scrollViewRef"
            scroll-y
            :scroll-top="scrollTop"
            class=" pr-20rpx pl-20rpx "
            :style="{ height: scrollViewHeight,
            }"
            :scroll-with-animation="true"
          >
            <view class="scroll-content ">
              <view v-for="(msg, index) in content" :key="index" class="py-16rpx">
                <!-- 用户消息 -->
                <view v-if="msg.role === 'user'" class=" flex  flex-justify-end opacity-60">
                  <view class="message-bubble  border-rd-16rpx flex-center   bg-#07c160 color-white max-w-80% " :class="[isPad ? 'p-16px!' : 'p-32rpx!']">
                    <text
                      selectable :class="{
                        ['font-size-14px!']: isPad,
                      }"
                    >
                      <!-- 首先判断 用户消息临时加载状态 如果是则代表是语音识别消息 否则展示已经添加进去的消息 -->
                      {{
                        msg.isRecordingPlaceholder
                          ? (textRes || '') + (isRecording && textRes ? animatedDots : '')
                          : Array.isArray(msg.content)
                            ? userMsgFormat(modelPrefix, (msg.content as any)[0].text, true)
                            : userMsgFormat(modelPrefix, msg.content || '', true)
                      }}
                    </text>
                    <!-- 流式加载动画 -->
                    <view v-if="msg.isRecordingPlaceholder && !textRes" class="flex-center">
                      <uni-load-more icon-type="auto" status="loading" :show-text="false" />
                    </view>
                  </view>
                </view>

                <!-- AI消息（含加载状态） -->
                <view v-if="msg.role === 'assistant'" class="flex justify-start opacity-60">
                  <!-- <Icon-font name="zhipu" class="mt-20rpx mr-10rpx" /> -->
                  <view class="size-32rpx">
                    <image
                      class="w-full h-full"
                      src="/static/images/ai-logo/kezai-default.png"
                      mode="aspectFill"
                    />
                  </view>
                  <view class="flex mt-16rpx mb-16rpx flex-justify-start bg-#ffffff color-#333333 max-w-80% border-rd-16rpx">
                    <view
                      class="message-bubble  border-rd-16rpx w-100%"
                      :class="[
                        msg.streaming && !(msg.content && msg.content!.length) ? 'flex-center w-120rpx h-120rpx ' : '',
                        isPad ? 'p-16px!' : 'p-32rpx!',
                      ]"
                    >
                      <view v-if="msg.content">
                        <UaMarkdown :source="`${msg.content}`" :show-line="false" />

                        <view class="h-2rpx  bg-black-3 my-10rpx" />

                        <view class="flex items-center justify-end ">
                          <view class="  bg-#e8ecf5 flex-center" :class="[isPad ? 'size-30px border-rd-8px' : 'size-60rpx border-rd-16rpx']" @click="handleCopy(msg.content as string)">
                            <icon-font name="copy" :color="COLOR_PRIMARY" :size="28" />
                          </view>
                          <view class="  bg-#e8ecf5 flex-center  ml-20rpx" :class="[isPad ? 'size-30px border-rd-8px ' : 'size-60rpx border-rd-16rpx ']" @click="handleRecorder(msg.content as string, index)">
                            <audio-wave
                              v-if="isAudioRunning && currentIndex === index"
                              status="playing"
                              :color="COLOR_PRIMARY"
                              :bar-width="isPad ? 4 : 10"
                              :bar-max-height="isPad ? 20 : 40"
                              :gap="isPad ? 4 : 6"
                              :dot-size="isPad ? 4 : 18"
                            />
                            <icon-font v-else name="sound" :color="COLOR_PRIMARY" :size="28" />
                          </view>
                        </view>
                      </view>
                      <!-- 流式加载动画 -->
                      <view v-if=" msg.streaming && !(msg.content && msg.content!.length)" class="flex-center">
                        <uni-load-more icon-type="auto" status="loading" :show-text="false" />
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 统一输入框 -->
      <RecorderInputAuto
        v-model:model-value="replyForm.content"
        v-model:status="recorderStatus"
        placeholder="请输入您的问题..."
        btn-text="发送"
        @confirm="onConfirm"
        @click-stopped="stopAll(), recorderStatus = 'pending'"
      />
    </view>
  </view>
</template>

<style lang="scss">
.message-bubble {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.ai-img {
  width: 160rpx;
  height: 160rpx;
}
</style>

<route lang="json"  type="page">
  {
       "style": { "navigationBarTitleText": "录音","navigationStyle": "custom" }
  }
</route>
