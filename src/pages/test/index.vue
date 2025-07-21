<route lang="json" type="page">
  {
    "style": { "navigationBarTitleText": "测试页面" }
  }
</route>

<script setup lang="ts">
import chatVideo from '@/pages/recorder-ai/components/chat-video.vue'

const chatVideoRef = ref()
const isShow = ref(false)
const isSilence = ref(false)

const idleTimer = createIdleTimer({
  text: '当前页面空闲中',
  delay: 10 * 1000,
  onTimeout: () => {
    console.log('空闲超时触发')
  },
})
function handleTimer() {
  idleTimer.reset()
}
</script>

<template>
  <button @click="isSilence = !isSilence">
    点击切换视频url
  </button>

  <button @click="handleTimer">
    点击开启倒计时
  </button>

  <view class="size-300rpx">
    <chat-video ref="chatVideoRef" v-model:silence="isSilence" />
  </view>
</template>

<style>

</style>
