<!-- "style": { "navigationBarTitleText": "柯臣" ,"navigationStyle": "custom"} -->
<route  lang="json" type="home">
  {

    "style": { "navigationBarTitleText": "柯臣" }
  }
</route>

<script setup lang="ts">
const router = useRouter()

function handleRecorderBtn() {
  router.push('/feature/pages/recorder-ai/index')
}

function handleSpeechBtn() {
  router.push('/feature/pages/recorder-ai/speech-synthesis')
}

const ssss = debounce(() => {
  console.log('点击了')
}, 500)
</script>

<template>
  <view class="container">
    <button class="mt-40rpx" @click="handleRecorderBtn">
      AI对话跳转
    </button>

    <button class="mt-40rpx" @click="handleSpeechBtn">
      语音合成跳转
    </button>

    <button class="mt-40rpx" @click="ssss">
      测试
    </button>
  </view>
</template>

<style  lang="scss">

</style>
