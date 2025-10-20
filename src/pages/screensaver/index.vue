<route lang="json" type="home">
{
  "style": {
    "navigationBarTitleText": "录音",
    "navigationStyle": "custom"
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
const networkVideo = [
  `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-1.mp4`,
  `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-2.mp4`,
  `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-3.mp4`,
  `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-4.mp4`,
  `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-5.mp4`,
  `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-6.mp4`,
  `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-7.mp4`,
  `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-8.mp4`,
  `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-9.mp4`,
  `${STATIC_URL}/kezai/video/compression/chat-screensaver-safe-10.mp4`,
]
const { localScreensaverVideoList, localVideoStatus, initFolder } = useLocalPlayVideo(networkVideo, 'screensaver')
const { visible, downloadUrl, updateList, downloadApp, checkNewVersion } = useCheckAppVersion()

function onRecorder() {
  fileLog('用户点击屏保，进入录音页面')
  router.replace('/pages/recorder-ai/index')
}

// 视频播放器引用
const DomVideoPlayerRef = ref<InstanceType<typeof DomVideoPlayer>>()
// 当前播放的视频地址
const currentVideoSrc = ref('')
// 当前播放索引
const currentVideoIndex = ref(0)

/**
 * 获取视频源列表：优先本地视频，其次使用网络视频
 */
async function initVideoSource(): Promise<string[]> {
  if (localVideoStatus.value === 'uninitialized') {
    console.log('⚙️ 正在初始化本地视频目录...')
    await initFolder()
  }

  if (localVideoStatus.value === 'has' && localScreensaverVideoList.value.length > 0) {
    console.log('🎬 使用本地视频', localScreensaverVideoList.value)
    return localScreensaverVideoList.value
  }

  console.log('🌐 使用网络视频')
  return networkVideo
}

/**
 * 播放随机视频（不重复当前）
 */
async function playRandomVideo() {
  const list = await initVideoSource()

  if (!list || list.length === 0) {
    console.warn('⚠️ 无可播放视频')
    return
  }

  let nextIndex = currentVideoIndex.value
  const total = list.length

  if (total === 1) {
    nextIndex = 0
  }
  else {
    while (nextIndex === currentVideoIndex.value) {
      nextIndex = Math.floor(Math.random() * total)
    }
  }

  currentVideoIndex.value = nextIndex
  currentVideoSrc.value = list[nextIndex]
  console.log('📺 切换播放地址:', currentVideoSrc.value)
}

/**
 * 播放结束后切换
 */
function handleEnded() {
  console.log('📽️ 播放结束，切换下一个视频')
  playRandomVideo()
}

/**
 * 视频可播放
 */
function handleCanPlay() {
  console.log('🎥 视频可以播放了')
  setTimeout(() => {
    DomVideoPlayerRef.value?.play()
  }, 100)
}

function handlePlay() {
  console.log('▶️ 视频开始播放')
}

onMounted(() => {
  playRandomVideo()
  checkNewVersion()

  // 强制竖屏（App）
  if (typeof plus !== 'undefined') {
    plus.screen.lockOrientation('portrait-primary')
  }

  console.log('📱 屏保页面 mounted')
})
</script>

<template>
  <view class="w-[100vw] h-[100vh] flex-center screensaver-wrapper p-0! m-0!">
    <DomVideoPlayer
      ref="DomVideoPlayerRef"
      :src="currentVideoSrc"
      is-loading
      loading-transparent
      :controls="false"
      :poster="`${STATIC_URL}/kezai/black-bg.png`"
      autoplay
      muted
      object-fit="fill"
      @play="handlePlay"
      @canplay="handleCanPlay"
      @ended="handleEnded"
    />
    <view
      class="absolute top-0 left-0 w-full h-full z-[10]"
      @click="handleMultiClick"
    >
      <check-app-page
        v-model="visible"
        :update-list="updateList"
        @update-now="downloadApp(downloadUrl)"
      />
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
