<route lang="json"  type="home">
  {
       "style": {
       "navigationBarTitleText": "录音",
       "navigationStyle": "custom" ,
       "orientation": ["portrait"],
        "app-plus": {
        "safearea": {
          "bottom": false
           }
         },
         "distribute": {
          "android": {
            "immersed": true
             }
          }
       }
  }
</route>

<script setup lang="ts">
import type DomVideoPlayer from '@/components/DomVideoPlayer/DomVideoPlayer.vue'

const emit = defineEmits(['onTrigger'])
const router = useRouter()
const { handleMultiClick } = useMultiClickTrigger({
  targetCount: 2,
  onTrigger: onRecorder,
})
const { visible, downloadUrl, updateList, downloadApp, checkNewVersion } = useCheckAppVersion()
function onRecorder() {
  router.replace('/pages/recorder-ai/index')
}
const currentVideoSrc = ref('')
/** 视频文件 */
const videoLists = computed(() => {
  return [
    `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-1.mp4`,
    `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-2.mp4`,
    `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-3.mp4`,
    `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-4.mp4`,
    `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-5.mp4`,
    `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-6.mp4`,
    `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-7.mp4`,
  ]
})

// 当前播放的视频索引
const currentVideoIndex = ref(0)
// 视频播放器引用
const DomVideoPlayerRef = ref<InstanceType<typeof DomVideoPlayer>>()

// 初始化第一个随机视频
function initRandomVideo() {
  let nextIndex = currentVideoIndex.value
  const total = videoLists.value.length

  if (total <= 1) {
    currentVideoSrc.value = videoLists.value[0] || ''
    return
  }

  // 保证新的视频索引与当前不一样
  while (nextIndex === currentVideoIndex.value) {
    nextIndex = Math.floor(Math.random() * total)
  }

  currentVideoIndex.value = nextIndex
  currentVideoSrc.value = videoLists.value[nextIndex]
  // currentVideoSrc.value = ''
  console.log(currentVideoSrc.value, '切换地址了')
}

/**
 * 监听到视频播放结束
 */
function handleEnded() {
  // 播放结束后，随机播放下一个视频
  console.log('播放结束了')

  initRandomVideo()
}

function handlePlay() {
  console.log('视频开始播放')
}

onMounted(() => {
  initRandomVideo()
  // 强制锁定竖屏（App 端）
  if (typeof plus !== 'undefined') {
    plus.screen.lockOrientation('portrait-primary')
  }
  console.log('屏保页面 mounted')
})
</script>

<template>
  <view class=" w-[100vw] h-[100vh] flex-center screensaver-wrapper p-0! m-0!">
    <DomVideoPlayer
      ref="DomVideoPlayerRef"
      :src="currentVideoSrc"
      :is-loading="false"
      :controls="false"
      :poster="`${STATIC_URL}/kezai/black-bg.png`"
      autoplay
      muted
      object-fit="cover"
      @play="handlePlay"
      @ended="handleEnded"
    />
    <view
      class="absolute top-0 left-0 w-full h-full z-[10]"
      @click="handleMultiClick"
    >
      <!-- 可放提示、按钮等内容 -->
      <check-app-page v-model="visible" :update-list="updateList" @update-now="downloadApp(downloadUrl)" />
    </view>
  </view>
</template>

<style lang="scss">
html,
body {
  padding-bottom: 0 !important;
  margin-bottom: 0 !important;
  height: 100%;
  overflow: hidden;
}
</style>
