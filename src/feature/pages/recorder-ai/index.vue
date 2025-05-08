<!-- eslint-disable ts/ban-ts-comment -->
<!-- eslint-disable ts/ban-ts-comment -->
<!-- eslint-disable ts/ban-ts-comment -->
<!-- eslint-disable import/no-duplicates -->
<!-- eslint-disable import/no-duplicates -->
 <!-- #ifdef APP -->

<script module="recorderCore" lang="renderjs">
// @ts-ignore
import Recorder from 'recorder-core'
import 'recorder-core/src/extensions/buffer_stream.player.js'

// @ts-ignore
// eslint-disable-next-line import/order
import useSpeechSynthesis from './hooks/useSpeechSynthesis'
import RecordApp from 'recorder-core/src/app-support/app'
import '../../../../uni_modules/Recorder-UniCore/app-uni-support.js'
import 'recorder-core/src/engine/pcm'
import 'recorder-core/src/extensions/waveview'
// @ts-ignore
// @ts-expect-error: Ignoring duplicate default export error

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

<script setup lang='ts'>
// eslint-disable-next-line import/first, import/order
import type StreamPlayer from '@/components/StreamPlayer/StreamPlayer.vue'
// eslint-disable-next-line import/first, import/order
import { NAV_BAR_HEIGHT, getStatusBarHeight } from '@/components/nav-bar/nav-bar'
// eslint-disable-next-line import/first, import/no-named-default, import/no-duplicates
import { default as RecorderInstance } from 'recorder-core'
// eslint-disable-next-line import/first, import/no-named-default, import/no-duplicates
import { default as RecordAppInstance } from 'recorder-core/src/app-support/app'
// eslint-disable-next-line import/first
import RecorderInput from './recorder-input.vue'
// eslint-disable-next-line import/first
import useRecorder from './hooks/useRecorder'
// eslint-disable-next-line import/first
import useAiPage from './hooks/useAiPage'
// eslint-disable-next-line ts/ban-ts-comment
// @ts-expect-error
// eslint-disable-next-line import/first, import/no-duplicates, ts/no-redeclare
import useSpeechSynthesis from './hooks/useSpeechSynthesis'

// eslint-disable-next-line import/first
import SpeechSynthesisCore from './xunfei/speech-synthesis-core'

// eslint-disable-next-line import/first, import/no-duplicates
import '../../../../uni_modules/Recorder-UniCore/app-uni-support.js'
/** 需要编译成微信小程序时，引入微信小程序支持文件 */
// #ifdef MP-WEIXIN
// eslint-disable-next-line import/first
import 'recorder-core/src/app-support/app-miniProgram-wx-support.js'
// #endif

// #ifdef H5 || MP-WEIXIN
// eslint-disable-next-line import/first, import/no-duplicates
import 'recorder-core/src/engine/pcm'
// eslint-disable-next-line import/first, import/no-duplicates
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
/**
 * 音频播放组件实例
 */
const streamPlayerRef = ref<InstanceType<typeof StreamPlayer>>()
const {
  chatSSEClientRef,
  loading,
  content,
  modelName,
  currentModel,
  replyForm,
  popupVisible,
  aiPageContent,
  aiScrollView,
  aiNameList,
  aiCurrentIndex,
  onStart,
  onError,
  onSuccess,
  onFinish,
  handleToggle,
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
  streamPlay,
  destroyStreamPlay,
  initStreamPlay,
} = useSpeechSynthesis({
  RecordApp: RecordAppInstance,
  vueInstance,
})

/**
 * 初始化语音合成
 */
const SpeechSynthesis = new SpeechSynthesisCore({
  APPID: 'f9b52f87',
  APISecret: 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl',
  APIKey: '287ae449056d33e0f4995f480737564a',
  url: 'wss://tts-api.xfyun.cn/v2/tts',
  host: 'tts-api.xfyun.cn',
}, {
  initStreamPlay,
  streamPlay,
  destroyStreamPlay,
})
SpeechSynthesis.on('audio', (res: ArrayBuffer) => {
  currBuffer.value = res
})

const scrollViewRef = ref(null)
const scrollTop = ref(0)
const scrollHeight = ref(0)
const animatedDots = ref('')
let dotTimer: NodeJS.Timeout | null = null
const currentIndex = ref<number | null>(null)
const currBuffer = ref()
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
})

function handleTouchStart() {
  if (loading.value) {
    return showToast('请等待上个回答完成')
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
}

function handleTouchEnd() {
  handleRecorderTouchEnd().then(() => {
    if (isRecorderClose.value) {
      // 用户上滑取消
      removeLastUserMessage('user')
    }
    else {
      // 用户正常抬起
      if (textRes.value && textRes.value.trim() !== '') {
        // 有识别结果才发送
        const lastIndex = content.value.length - 1
        if (content.value[lastIndex]?.role === 'user') {
          content.value[lastIndex].content = textRes.value
        }
        handleSendMsg()
      }
      else {
        console.log('无识别结果，删除最后一条占位消息')
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
  // 如果当前播放的不是当前消息，停止播放且播放新点击的消息
  if (currentIndex.value !== null && currentIndex.value !== index) {
    SpeechSynthesis.stop()
    streamPlayerRef.value?.onStreamStop()
    currentIndex.value = index
    SpeechSynthesis.convertTextToSpeech(text)
    isStreamPlaying.value = true
    return
  }
  currentIndex.value = index
  if (isStreamPlaying.value) {
    streamPlayerRef.value?.onStreamStop()
    SpeechSynthesis.stop()
    currentIndex.value = null
  }
  else {
    SpeechSynthesis.convertTextToSpeech(text)
    isStreamPlaying.value = true
  }
}, 500)

/**
 * 语音播放结束
 */
function onStreamPlayEnd() {
  isStreamPlaying.value = false
}
/**
 * 语音播放停止
 */
function onStreamStop() {
  isStreamPlaying.value = false
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

/**
 * 获取高度
 */
function initScrollHeight() {
  uni.createSelectorQuery()
    .in(vueInstance)
    .select('.scroll-view')
    .boundingClientRect((data) => {
      if (data) {
        scrollHeight.value = (data as UniNamespace.NodeInfo).height || 0
      }
    })
}

function initContentHeight() {
  uni.createSelectorQuery()
    .in(vueInstance)
    .select('.scroll-content')
    .boundingClientRect((data) => {
      if (data) {
        const top = ((data as UniNamespace.NodeInfo).height || 0) - scrollHeight.value

        if (top > 0) {
          scrollTop.value = top
        }
      }
    })
    .exec()
}

watch(() => [content.value, textRes.value, replyForm.value.content], () => {
  // 更新 scrollTop 为 scrollHeight，确保滚动到底部
  if (scrollViewRef.value) {
    nextTick(() => {
      initContentHeight()
    })
  }
}, { deep: true, immediate: true })

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
  initScrollHeight()
})

onShow(() => {
  if ((vueInstance as any)?.isMounted) {
    RecordAppInstance.UniPageOnShow(vueInstance)
  }
})
const oldScrollTop = ref(0)

function handleScroll(e: any) {
  oldScrollTop.value = e.detail.scrollTop
}
</script>

<template>
  <view>
    <nav-bar :show-back="false" custom-click>
      <template #left>
        <icon-font name="questions" @click="handleToggle" />
      </template>
      ai对话
    </nav-bar>

    <GaoChatSSEClient
      ref="chatSSEClientRef"
      @on-open="onStart"
      @on-error="onError"
      @on-message="onSuccess"
      @on-finish="onFinish"
    />
    <!-- @ts-ignore -->
    <!-- <view
      :prop="currBuffer"
      :change:prop="recorderCore.playTTS"
      type="renderjs"
      module="recorderCore"
    /> -->

    <StreamPlayer
      ref="streamPlayerRef"
      :stream="currBuffer"
      :curr-buffer="currBuffer"
      @on-stream-play-end="onStreamPlayEnd"
      @on-stream-stop="onStreamStop"
    />

    <view :style="aiPageContent">
      <view
        class="absolute top-0 left-0 w-full h-full z-0 flex justify-center "
        :style="{ 'padding-top': pageHeight }"
      >
        <image
          :src="isStreamPlaying ? '/static/images/aiPageBg.gif' : '/static/images/aiPageBg-quiet.png'"
          mode="aspectFit"
          class="aiPageBg-img"
        />
      </view>

      <scroll-view ref="scrollViewRef" scroll-y :scroll-top="scrollTop" class=" scroll-content pr-20rpx pl-20rpx  block h-full" :scroll-with-animation="true" :style="aiScrollView" @scroll="handleScroll">
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
      </scroll-view>
    </view>

    <RecorderInput
      v-model:model-value="replyForm.content"
      v-model:focus="isFocus"
      v-model:show-recording-button="showRecordingButton"
      placeholder="请输入您的问题..."
      is-offset
      class="flex-1"
      btn-text="发送"
      :is-disabled-recorder="loading"
      @recorder-close="handleRecorderClose"
      @show-recorder="handleShowRecorder"
      @recorder-touch-start="handleTouchStart"
      @recorder-touch-end="handleTouchEnd"
      @recorder-confirm="handleRecorderConfirm"
      @confirm="handleSendMsg"
    />

    <popup v-model="popupVisible" type="left" :is-mask-click="false">
      <view class="bg-#fff w-400rpx h-100vh py-140rpx px-32rpx">
        <view class="flex flex-1 justify-end mb-60rpx w-full" @click="popupVisible = false">
          <icon-font name="close" size="48" />
        </view>

        <view
          v-for="(item, index) in aiNameList"
          :key="index"
          class="h-80rpx flex justify-between items-center px-16rpx"
          :class="[aiCurrentIndex === index ? 'bg-primary text-white' : '']"
          @click="handleChangeAiModel(index)"
        >
          <text>
            {{ item }}
          </text>
          <icon-font name="right" />
        </view>
      </view>
    </popup>
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
