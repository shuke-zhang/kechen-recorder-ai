<route  lang="json" type="page">
    {
      "style": { "navigationBarTitleText": "按住说话" }
    }
</route>

<script setup lang="ts">
import TestInput from './test-input.vue'

const content = ref('')
const isFocus = ref(false)
</script>

<template>
  <view>
    <TestInput
      v-model:model-value="content"
      v-model:focus="isFocus"
      placeholder="请输入您的问题..."
      is-offset
      class="flex-1"
      btn-text="发送"
    />

    <icon-font name="plus" :class="COLOR_PRIMARY" />
  </view>
</template>

<style lang="scss"></style>
