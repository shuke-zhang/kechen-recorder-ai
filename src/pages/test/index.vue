<route lang="json" type="page">
  {
    "style": { "navigationBarTitleText": "测试页面" }
  }
  </route>

<script setup lang="ts">
import screensaver from '@/pages/recorder-ai/components/screensaver.vue'

const { visible, currentVersion, nextVersion, checkNewVersion } = useCheckAppVersion()
const router = useRouter()
function handleVersion() {
  checkNewVersion(true)
  // visible.value = true
}
/** 控制屏保 */
const isScreensaver = ref(true)

function onScreensaverTrigger() {
  console.log('主动设置为false')
  isScreensaver.value = false
}
router.ready(() => {
  if (isApp) {
    checkNewVersion(true)
  }
})
</script>

<template>
  <view class="audioPlay p-40rpx">
    <view v-show="!isScreensaver">
      <button type="primary" @click="handleVersion">
        检查版本-{{ visible }}
      </button>
      <view class="mt-40rpx">
        <text>本地版本：{{ currentVersion }}</text>
        <text>线上最新版本：{{ nextVersion }}</text>
      </view>
    </view>

    <!-- 屏保 -->
    <screensaver v-model:show="isScreensaver" @on-trigger="onScreensaverTrigger" />
  </view>
</template>

<style scoped>
  .color-gray {
  color: #888;
}
</style>
