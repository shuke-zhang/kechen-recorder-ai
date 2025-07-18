<route lang="json" type="page">
  {
    "style": { "navigationBarTitleText": "测试页面" }
  }
</route>

<script setup lang="ts">
</script>

<template>
  <audio-wave
    status="playing"
    :color="COLOR_PRIMARY"
    :bar-width="6"
    :bar-max-height="24"
    :gap="4"
  />
  <text selectable class="font-size-28rpx!">
    首先判断 用户消息临时加载状态 如果是则代表是语音识别消息 否则展示已经添加进去的消息
  </text>
</template>

<style>

</style>
