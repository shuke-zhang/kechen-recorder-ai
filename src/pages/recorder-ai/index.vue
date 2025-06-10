<!-- eslint-disable ts/ban-ts-comment -->
<!-- eslint-disable import/no-duplicates -->
 <!-- #ifdef APP-PLUS -->
<script module="recorderCore" lang="renderjs">
// @ts-ignore
import Recorder from 'recorder-core'
import 'recorder-core/src/extensions/buffer_stream.player.js'

import RecordApp from 'recorder-core/src/app-support/app'
// import '../../../../uni_modules/Recorder-UniCore/app-uni-support.js'
import '../../../uni_modules/Recorder-UniCore/app-uni-support.js'
import 'recorder-core/src/engine/pcm'
import 'recorder-core/src/extensions/waveview'
// @ts-ignore

export default {
  data() {
    return {
    }
  },

  mounted() {
    // App的renderjs必须调用的函数，传入当前模块this
    RecordApp.UniRenderjsRegister(this)
  },
  methods: {
    // 这里定义的方法，在逻辑层中可通过 RecordApp.UniWebViewVueCall(this,'this.xxxFunc()') 直接调用
    // 调用逻辑层的方法，请直接用 this.$ownerInstance.callMethod("xxxFunc",{args}) 调用，二进制数据需转成base64来传递
  },
}
</script>
<!-- #endif -->

<!-- eslint-disable import/first, import/order, import/no-named-default,import/no-duplicates -->
<script setup lang='ts'>
import type StreamPlayer from '@/components/StreamPlayer/StreamPlayer.vue'
import { NAV_BAR_HEIGHT, getStatusBarHeight } from '@/components/nav-bar/nav-bar'
import { default as RecorderInstance } from 'recorder-core'
import { default as RecordAppInstance } from 'recorder-core/src/app-support/app'
import { useTextFormatter } from './hooks/useTextFormatter'
import RecorderInput from './recorder-input.vue'
import useRecorder from './hooks/useRecorder'
import useAiPage from './hooks/useAiPage'
import useAutoScroll from './hooks/useAutoScroll'
import { useMultiClickTrigger } from '@/hooks'
import { doubaoSpeechSynthesisFormat } from '@/api/audio'
import '../../../uni_modules/Recorder-UniCore/app-uni-support.js'
/** 需要编译成微信小程序时，引入微信小程序支持文件 */
// #ifdef MP-WEIXIN
import 'recorder-core/src/app-support/app-miniProgram-wx-support.js'
// #endif

// #ifdef H5 || MP-WEIXIN
import 'recorder-core/src/engine/pcm'
import 'recorder-core/src/extensions/waveview'
// #endif
const vueInstance = getCurrentInstance()?.proxy as any // 必须定义到最外面，getCurrentInstance得到的就是当前实例this
const pageHeight = computed(() => {
  return `${getStatusBarHeight() + NAV_BAR_HEIGHT + 1}px`
})
/**
 * 音频是否正在播放
 */
const isStreamPlaying = ref(false)
const router = useRouter<{
  modelName: string
}>()
console.log(router.query, '检查路由参数')

/**
 * 音频播放组件实例
 */
const streamPlayerRef = ref<InstanceType<typeof StreamPlayer>>()
const { handleMultiClick } = useMultiClickTrigger({
  onTrigger: () => {
    router.push('/pages/test/index', { id: 123 })
  },
})

const {
  chatSSEClientRef,
  loading,
  content,
  isAiMessageEnd,
  modelName,
  currentModel,
  replyForm,
  aiPageContent,
  aiScrollView,
  stopChat,
  onStart,
  onError,
  onSuccess,
  onFinish,
  handleChangeAiModel,
  handleSendMsg,
  handleCopy,
  setAiContent,
} = useAiPage(pageHeight.value)

const {
  textRes,
  isFocus,
  iseRecorderTouchStart,
  isRecorderClose,
  isRunning,
  isFirstVisit,
  showRecordingButton,
  recReq,
  handleRecorderClose,
  handleShowRecorder,
  handleRecorderTouchStart,
  handleRecorderTouchEnd,
  handleRecorderConfirm,
} = useRecorder({
  RecordApp: RecordAppInstance,
  Recorder: RecorderInstance,
  vueInstance,
})

const {
  scrollTop,
  handleScroll,
  resetAndScrollToBottom,
  initHeights,
  scrollToBottom,
  scrolltolower,
} = useAutoScroll({
  contentList: content,
  vueInstance,
  scrollViewSelector: '.scroll-view',
  scrollContentSelector: '.scroll-content',
  immediate: true,
})

const { processText, textReset } = useTextFormatter()

const scrollViewRef = ref(null)
const animatedDots = ref('')
let dotTimer: NodeJS.Timeout | null = null
const currentIndex = ref<number | null>(null)
const isAudioPlaying = ref(false)
const tempBuffers = ref<{ audio_data: string, text: string }[]>([])
const tempFormattedTexts = ref<string[]>([])
const streamData = ref<{
  text: string
  buffer: string
  id: number
}>()
/**
 * 是否自动播放
 */
const isAutoPlayAiMessage = ref(true)
// 全局变量存储格式化器实例和当前处理的消息索引
let lastProcessedIndex: number | null = null

/**
 * ai内容自动播放音频
 */
async function autoPlayAiMessage(text: string, index: number) {
  if (!isAutoPlayAiMessage.value)
    return
  if (!text || text.trim() === '')
    return
  if (!isApp)
    return
  // 设置当前播放的消息索引
  currentIndex.value = index

  // 如果是新的消息，重置格式化器
  if (currentIndex.value !== lastProcessedIndex) {
    textReset()
    lastProcessedIndex = currentIndex.value
  }
  // 开始语音合成并播放
  const longText = processText(text)

  // 处理文本 下面是对接后端的音频 采用接口的方式
  if (longText.length > 0) {
    tempFormattedTexts.value.push(longText)

    doubaoSpeechSynthesisFormat({
      text: longText,
      id: tempFormattedTexts.value.findIndex(t => t === longText) || 0,
    }).then((res) => {
      const { audio_buffer, text, id } = res
      streamData.value = {
        buffer: audio_buffer,
        text,
        id,
      }
      // ai返回的消息结束了
      if (isAiMessageEnd.value) {
        tempFormattedTexts.value = []
      }
      isAudioPlaying.value = true
    }).catch((error) => {
      isStreamPlaying.value = false
      isAudioPlaying.value = false
      console.log(error, '错误')
    })
  }
  isStreamPlaying.value = true
}
/**
 * 发送消息确认按钮
 */
function handleConfirm() {
  tempBuffers.value = []
  //  点击时如果ai消息没有返回完 ，并且正在播放，直接停止
  if (isAiMessageEnd.value && isStreamPlaying.value) {
    stopAll()
    handleSendMsg()
    return
  }
  handleSendMsg()
}

function handleTouchStart() {
  if (loading.value) {
    stopAll()
  }

  textRes.value = ''
  handleRecorderTouchStart()
  // 开始录音，插入一个临时消息（占位）
  const sendText = setAiContent({
    type: 'send',
    msg: '', // 空消息作为占位
    modeName: modelName.value || '',
  })
  sendText.isRecordingPlaceholder = true // ✅ 标记占位消息

  content.value?.push(sendText)
  nextTick(() => {
    resetAndScrollToBottom()
  })
}

function handleTouchEnd() {
  handleRecorderTouchEnd().then(async () => {
    if (isRecorderClose.value) {
      // 用户上滑取消
      removeLastUserMessage('user')
      replyForm.value = { content: '', role: 'user' }
    }
    else {
      // 用户正常抬起
      if (textRes.value && textRes.value.trim() !== '') {
        // 有识别结果才发送
        const lastIndex = content.value.length - 1
        if (content.value[lastIndex]?.role === 'user') {
          content.value[lastIndex].content = textRes.value
        }
        handleConfirm()
        await nextTick()
        resetAndScrollToBottom() // 强制滚动到底部
      }
      else {
        removeLastUserMessage('user')
      }
    }
  }).finally(() => {
    iseRecorderTouchStart.value = false
  })
}

/**
 * ai消息点击语音
 * @warning 由于语音点击之后播放音频会有延迟， 所以在这儿直接设置状态
 */
const handleRecorder = debounce((text: string, index: number) => {
  // 当前已经在播放此条消息

  if (currentIndex.value === index && isStreamPlaying.value) {
    console.log('🟡 再次点击同一条，执行停止')
    streamPlayerRef.value?.onStreamStop()
    currentIndex.value = null
    return
  }

  if (!isStreamPlaying.value) {
    console.log('🟥 切换消息播放，先停止')
    streamPlayerRef.value?.onStreamStop()
    // stopChat()
  }

  // ✅ 开始新的播放
  console.log('🟢 开始播放新消息')
  currentIndex.value = index
  isStreamPlaying.value = true
  const longTexts = processText(text, true)
  longTexts.forEach((longText, i) => {
    doubaoSpeechSynthesisFormat({
      text: longText,
      id: i,
    }).then((res) => {
      const { audio_buffer, text, id } = res
      streamData.value = {
        buffer: audio_buffer,
        text,
        id,
      }
    }).catch(() => {
      isStreamPlaying.value = false
    })
  })
}, 500)

/**
 * 语音播放真正的开始
 */
function onStreamPlayStart() {
  isAudioPlaying.value = true
}

/**
 * 语音播放结束
 */
function onStreamPlayEnd() {
  isStreamPlaying.value = false
  isAudioPlaying.value = false
}
/**
 * 语音播放停止
 */
function onStreamStop() {
  isStreamPlaying.value = false
  isAudioPlaying.value = false
}

/**
 * 根据角色类型删除最后一条消息
 */
function removeLastUserMessage(type: string) {
  const lastIndex = [...content.value].reverse().findIndex(item => item.role === type)
  if (lastIndex !== -1) {
    const realIndex = content.value.length - 1 - lastIndex
    content.value.splice(realIndex, 1)
  }
}

function handleClearContent() {
  if (content.value.length === 0) {
    return showToast('当前对话为空')
  }
  if (loading.value) {
    stopAll()
  }

  showModal('是否清空对话？').then(() => {
    content.value = []
    // 停止播放
    if (isStreamPlaying.value) {
      streamPlayerRef.value?.onStreamStop()
    }
    // 重置格式化器
    textReset()
  })
}

function stopAll() {
  // 停止ai消息
  stopChat()
  // 停止播放
  streamPlayerRef.value?.onStreamStop()
  currentIndex.value = null
  // 重置格式化器
  textReset()
  // 重置播放状态
  isStreamPlaying.value = false
}

// 添加一个监听最后一条消息内容的变化（对于流式输出非常有用）
watch(
  () => content.value[content.value.length - 1]?.content,
  () => {
    if (content.value.length > 0) {
      nextTick(() => {
        scrollToBottom()
      })
      // 检查最后一条消息是否是AI的回复
      const lastMessage = content.value[content.value.length - 1]
      if (lastMessage?.role === 'assistant' && lastMessage?.streaming) {
        // 自动播放
        autoPlayAiMessage(lastMessage.content || '', content.value.length - 1)
      }
    }
  },
)

watch(
  content.value,
  () => {
    nextTick(() => {
      scrollToBottom()
    })
  },
  { deep: true },
)

// 监听语音识别开始和结束
watch(() => isRunning.value, (val: boolean) => {
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

watch(() => textRes.value, async (newVal) => {
  await nextTick() // 确保视图更新完成
  replyForm.value.content = newVal as string
  console.log('文本内容赋值更新：', newVal)
})

onMounted(() => {
  (vueInstance as any).isMounted = true
  RecordAppInstance.UniPageOnShow(vueInstance)
  recReq().then((res) => {
    console.log(res, '请求权限允许')
    isFirstVisit.value = false
  }).catch((err) => {
    showToastError(err)
    console.log(err, '请求权限拒绝')
  })

  initHeights()
})

onShow(() => {
  if ((vueInstance as any)?.isMounted) {
    RecordAppInstance.UniPageOnShow(vueInstance)
  }
})

router.ready(() => {
  const { modelName } = router.query as any
  console.log(modelName, '路由参数')

  if (modelName) {
    handleChangeAiModel(modelName)
  }
})
</script>

<template>
  <view>
    <nav-bar>
      <template #right>
        <view class="flex  pr-50rpx">
          <icon-font name="clear" color="#E95655" size="40" @click="handleClearContent" />
          <icon-font :name="isAutoPlayAiMessage ? 'sound' : 'mute'" :color="isAutoPlayAiMessage ? COLOR_PRIMARY : ''" size="40" class="ml-20rpx" @click="isAutoPlayAiMessage = !isAutoPlayAiMessage" />
        </view>
      </template>

      <text @click="handleMultiClick">
        柯仔AI
      </text>
    </nav-bar>

    <!-- 流式流式ai消息 -->
    <GaoChatSSEClient
      ref="chatSSEClientRef"
      @on-open="onStart"
      @on-error="onError"
      @on-message="onSuccess && onSuccess?.($event)"
      @on-finish="onFinish"
    />

    <!-- 音频播放组件 -->
    <!-- #ifdef APP-PLUS -->
    <StreamPlayer
      ref="streamPlayerRef"
      :stream-data="streamData"
      @on-stream-play-start="onStreamPlayStart"
      @on-stream-play-end="onStreamPlayEnd"
      @on-stream-stop="onStreamStop"
    />
    <!-- #endif -->

    <view :style="aiPageContent">
      <view
        class="absolute top-0 left-0 w-full h-full z-0 flex justify-center pointer-events-none"
        :style="{ 'padding-top': pageHeight }"
      >
        <image
          :src="(isStreamPlaying && isAudioPlaying) ? '/static/images/aiPageBg.gif' : '/static/images/aiPageBg-quiet.png'"
          mode="aspectFit"
          class="aiPageBg-img"
        />
      </view>

      <scroll-view
        ref="scrollViewRef"
        scroll-y
        :scroll-top="scrollTop"
        class=" scroll-view pr-20rpx pl-20rpx  block h-full"
        :scroll-with-animation="true"
        :style="aiScrollView"
        @scroll="handleScroll"
        @scrolltolower="scrolltolower"
      >
        <view class="scroll-content">
          <view v-if="content.length === 0" class="h-full flex justify-end flex-col items-center pb-200rpx pt-500rpx">
            <view>
              <image
                class="ai-img"
                :src="`/static/images/${currentModel?.icon}.png`"
                mode="aspectFill"
              />
            </view>
            <view class="font-size-60rpx mt-20rpx">
              我是{{ modelName }}
            </view>
            <view class="mt-20rpx w-80%">
              我可以帮你搜索、答疑、写作、请在下方输入你的内容~
            </view>
          </view>

          <view v-for="(msg, index) in content" :key="index" class="py-16rpx">
            <!-- 用户消息 -->
            <view v-if="msg.role === 'user'" class=" flex  flex-justify-end opacity-60">
              <view class="message-bubble p-32rpx border-rd-16rpx   bg-#07c160 color-white max-w-80%">
                <text>
                  {{
                    msg.isRecordingPlaceholder
                      ? (textRes || '') + (isRunning && textRes ? animatedDots : '')
                      : Array.isArray(msg.content)
                        ? msg.content[0].text
                        : msg.content
                  }}
                </text>
                <!-- 流式加载动画 -->
                <view v-if="msg.isRecordingPlaceholder && !textRes" class="flex-center">
                  <uni-load-more icon-type="auto" status="loading" :show-text="false" />
                </view>
              </view>
            </view>

            <!-- AI消息（含加载状态） -->
            <view v-else class="flex justify-start opacity-60">
              <Icon-font name="zhipu" class="mt-20rpx mr-10rpx" />
              <view class="flex mt-16rpx mb-16rpx flex-justify-start bg-#ffffff color-#333333 max-w-80% border-rd-16rpx">
                <view
                  class="message-bubble  p-32rpx border-rd-16rpx w-100%"
                  :class="[msg.streaming && !(msg.content && msg.content.length) ? 'flex-center w-120rpx h-120rpx ' : '']"
                >
                  <view v-if="msg.content">
                    <UaMarkdown :source="msg.content" :show-line="false" />
                    <view class="h-2rpx  bg-black-3 my-10rpx" />

                    <view class="flex items-center justify-end ">
                      <view class="border-rd-16rpx size-60rpx bg-#e8ecf5 flex-center" @click="handleCopy(msg.content)">
                        <icon-font name="copy" :color="COLOR_PRIMARY" :size="28" />
                      </view>
                      <view class="border-rd-16rpx size-60rpx  bg-#e8ecf5 flex-center  ml-20rpx" @click="handleRecorder(msg.content, index)">
                        <audio-wave v-if="isStreamPlaying && currentIndex === index" :color="COLOR_PRIMARY" />
                        <icon-font v-else name="sound" :color="COLOR_PRIMARY" :size="28" />
                      </view>
                    </view>
                  </view>
                  <!-- 流式加载动画 -->
                  <view v-if=" msg.streaming && !(msg.content && msg.content.length)" class="flex-center">
                    <uni-load-more icon-type="auto" status="loading" :show-text="false" />
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 统一输入框 -->
    <RecorderInput
      v-model:model-value="replyForm.content"
      v-model:focus="isFocus"
      v-model:show-recording-button="showRecordingButton"
      placeholder="请输入您的问题..."
      class="flex-1"
      btn-text="发送"
      @recorder-close="handleRecorderClose"
      @show-recorder="handleShowRecorder"
      @recorder-touch-start="handleTouchStart"
      @recorder-touch-end="handleTouchEnd"
      @recorder-confirm="handleRecorderConfirm"
      @confirm="handleConfirm "
    />
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

<route lang="json">
  {
       "style": { "navigationBarTitleText": "录音","navigationStyle": "custom" }
  }
</route>
