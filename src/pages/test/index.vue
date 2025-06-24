<route lang="json">
  {
    "style": { "navigationBarTitleText": "测试页面" }
  }
  </route>

<script setup lang="ts">
import type { UniPopupType } from '@uni-helper/uni-ui-types'
import { Button, Popup } from 'antd-mobile'

const { visible, downloadUrl, currentVersion, nextVersion, updateList, downloadApp, checkNewVersion } = useCheckAppVersion()
const router = useRouter()
const ss = ref(false)
function handleVersion() {
  checkNewVersion(true)
  // visible.value = true
}
const testVisible = ref(false)
const popupType = ref<UniPopupType>('center')
function handlePopup(type: UniPopupType) {
  popupType.value = type
  testVisible.value = true
}
router.ready(() => {
  if (isApp) {
    checkNewVersion(true)
  }
})
</script>

<template>
  <view class="audioPlay p-40rpx">
    <button type="primary" @click="handleVersion">
      检查版本-{{ visible }}
    </button>
    <view class="mt-40rpx">
      <text>本地版本：{{ currentVersion }}</text>
      <text>线上最新版本：{{ nextVersion }}</text>
    </view>

    <button type="primary" class="mt-40rpx" @click="handlePopup('center')">
      测试弹窗-center
    </button>
    <button type="primary" class="mt-40rpx" @click="handlePopup('top')">
      测试弹窗-top
    </button>
    <button type="primary" class="mt-40rpx" @click="handlePopup('bottom')">
      测试弹窗-bottom
    </button>
    <button type="primary" class="mt-40rpx" @click="handlePopup('left')">
      测试弹窗-left
    </button>
    <button type="primary" class="mt-40rpx" @click="handlePopup('right')">
      测试弹窗-right
    </button>
    <Button loading color="primary" loading-text="正在加载" @click="visible = true">
      Loading
    </Button>
  </view>
  <!-- <check-app-page v-model="visible" :update-list="updateList" @update-now="downloadApp(downloadUrl)" /> -->
  <Popup v-model="visible" position="left" />
</template>

  <style scoped>
  .color-gray {
  color: #888;
}
</style>
