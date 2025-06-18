<route lang="json">
  {
    "style": { "navigationBarTitleText": "测试页面" }
  }
  </route>

<script setup lang="ts">
const { visible, downloadUrl, updateList, downloadApp, checkNewVersion } = useCheckAppVersion()
const router = useRouter()
const ss = ref(false)
function handleVersion() {
  checkNewVersion(true)
  // visible.value = true
}

router.ready(() => {
  setTimeout(() => {
    checkNewVersion(true)
  }, 100)
})
</script>

<template>
  <view class="audioPlay p-40rpx">
    <button type="primary" @click="handleVersion">
      检查版本-{{ visible }}
    </button>
  </view>
  <check-app-page v-model="visible" :update-list="updateList" @update-now="downloadApp(downloadUrl)" />
</template>

  <style scoped>
  .color-gray {
  color: #888;
}
</style>
