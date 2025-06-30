<route  lang="json" type="home">
  {
    "style": { "navigationBarTitleText": "柯臣" ,"navigationStyle": "custom" }

  }
</route>

<script setup lang="ts">
import type { Video } from '@uni-helper/uni-app-types'
import { onMounted, onUnmounted, ref } from 'vue'

const router = useRouter()
const { handleMultiClick } = useMultiClickTrigger({
  targetCount: 2,
  onTrigger: onRecorder,
})

function onRecorder() {
  router.replace('/pages/recorder-ai/index')
}
/** 视频文件 */
const videoLists = computed(() => {
  if (isApp) {
    return [
      '/static/video/screensaver-1.mp4',
      '/static/video/screensaver-2.mp4',
      '/static/video/screensaver-3.mp4',
      '/static/video/screensaver-4.mp4',
      '/static/video/screensaver-5.mp4',
    ]
  }
  else {
    return [
      `${STATIC_URL}/kezai/video/screensaver-1.mp4`,
      `${STATIC_URL}/kezai/video/screensaver-2.mp4`,
      `${STATIC_URL}/kezai/video/screensaver-3.mp4`,
      `${STATIC_URL}/kezai/video/screensaver-4.mp4`,
      `${STATIC_URL}/kezai/video/screensaver-5.mp4`,
    ]
  }
})

// 当前播放的视频索引
const currentVideoIndex = ref(0)
// 当前播放的视频路径
const currentVideoSrc = ref('')
// 视频播放器引用
const videoRef = ref<Video | null>(null)

// 随机选择视频（排除当前视频）
function getRandomVideo(excludeIndex: number): number {
  const availableVideos = videoLists.value.filter((_, index) => index !== excludeIndex)
  const randomVideo = availableVideos[Math.floor(Math.random() * availableVideos.length)]
  return videoLists.value.indexOf(randomVideo)
}

// 切换到下一个随机视频
function playNextVideo() {
  const nextIndex = getRandomVideo(currentVideoIndex.value)
  currentVideoIndex.value = nextIndex
  currentVideoSrc.value = videoLists.value[nextIndex]

  // 重新加载视频
  if (videoRef.value) {
    videoRef.value.onLoad?.()
    videoRef.value.play?.()
  }
}

// 初始化第一个随机视频
function initRandomVideo() {
  const randomIndex = Math.floor(Math.random() * videoLists.value.length)
  currentVideoIndex.value = randomIndex
  currentVideoSrc.value = videoLists.value[randomIndex]
}

// 视频播放完成事件处理
function onVideoEnded() {
  playNextVideo()
}

// 视频播放错误事件处理
function onVideoError() {
  console.error('视频播放出错，切换到下一个视频')
  playNextVideo()
}

onMounted(() => {
  initRandomVideo()
})

onUnmounted(() => {
  // 清理视频播放器
  if (videoRef.value) {
    videoRef.value.pause()
  }
})
</script>

<template>
  <view class="w-[100vw] h-[100vh] flex-center bg-#f9f4f7">
    <video
      ref="videoRef"
      :src="currentVideoSrc"
      class=" w-full h-60%"
      autoplay
      :loop="false"
      :controls="false"
      muted
      :show-center-play-btn="false"
      :show-loading="false"
      :enable-progress-gesture="false"
      :enable-play-gesture="false"
      :show-play-btn="false"
      :show-fullscreen-btn="false"
      :show-progress="false"
      object-fit="cover"
      @ended="onVideoEnded"
      @error="onVideoError"
    />

    <cover-view
      class="absolute top-0 left-0 w-full h-full z-[10]"
      @click="handleMultiClick"
    >
      <!-- 可放提示、按钮等内容 -->
    </cover-view>
  </view>
</template>

<style lang="scss">

</style>
