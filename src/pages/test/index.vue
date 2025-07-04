<route lang="json" type="page">
  {
    "style": { "navigationBarTitleText": "测试页面" }
  }
  </route>

<script setup lang="ts">
import RecorderInputAuto from '@/pages/recorder-ai/recorder-input-auto.vue'

const showRecordingButton = ref(false)
const text = ref('')
</script>

<template>
  <button class="border-rd-50% border-color-#edf6fd  bg-#edf6fd size-140rpx flex-center">
    <icon-font name="recorder-fill" size="80" color="#000" />
  </button>
  <RecorderInputAuto v-model:show-recorder-btn="showRecordingButton" v-model="text" />
</template>

<style>

</style>
