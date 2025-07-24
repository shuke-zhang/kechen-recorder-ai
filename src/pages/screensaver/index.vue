<route lang="json"  type="home">
  {
       "style": { "navigationBarTitleText": "录音","navigationStyle": "custom" }
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
/** 视频文件 */
const videoLists = computed(() => {
  if (isApp) {
    return [
      '/static/video/screensaver-1.mp4',
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
// 视频播放器引用
const DomVideoPlayerRef = ref<InstanceType<typeof DomVideoPlayer>>()


// 初始化第一个随机视频
function initRandomVideo() {
  const randomIndex = Math.floor(Math.random() * videoLists.value.length)
  currentVideoIndex.value = randomIndex
  // currentVideoSrc.value = videoLists.value[randomIndex]
}

onMounted(() => {
  initRandomVideo()
})



onMounted(() => {
  // 清理视频播放器
  // if (videoRef.value) {
  //   videoRef.value.pause()
  // }
  checkNewVersion(false)
})
</script>

<template>
  <view class="w-[100vw] h-[100vh] flex-center bg-#f9f4f7 screensaver-wrapper" >
    <DomVideoPlayer
      ref="DomVideoPlayerRef"
      :src="`${STATIC_URL}/kezai/video/screensaver-1.mp4`"
      :is-loading="false"
      :controls="false"
      :poster="`${STATIC_URL}/kezai/aiPageBg-quiet.png`"
      autoplay
      loop
      muted
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
.screensaver-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999; // 或适当值
  transition: transform 0.4s ease;
}

.off-screen {
  transform: translateX(-10000px); // 也可用 translateY(10000px)
  position: absolute;
  z-index: -9999;
  pointer-events: none;
  opacity: 0;
}

::v-deep(.uni-video-container)   {
	background-color: transparent;
  padding-top:400rpx ;
}

.uni-video-container {
 	background-color: transparent;

}
</style>
