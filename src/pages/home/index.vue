<!-- "style": { "navigationBarTitleText": "柯臣" ,"navigationStyle": "custom"} -->
<route  lang="json" type="page">
  {

    "style": { "navigationBarTitleText": "柯臣" }
  }
</route>

<script setup lang="ts">
const router = useRouter()

function handleRecorderBtn() {
  router.push('/pages/recorder-ai/index')
}

function ssss() {
  router.push('/pages/test/index')
}
</script>

<template>
  <view class="container">
    <button class="mt-40rpx" @click="handleRecorderBtn">
      AI对话跳转
    </button>

    <button class="mt-40rpx" @click="ssss">
      测试
    </button>
  </view>
</template>

<style  lang="scss">

</style>
