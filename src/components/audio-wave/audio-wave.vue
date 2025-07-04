<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: 'pending' | 'playing' | 'stopped'
  color?: string
}>()

const color = computed(() => props.color || '#555')
</script>

<template>
  <div class="audio-wave" :class="status">
    <template v-if="status === 'pending'">
      <div v-for="i in 3" :key="i" class="dot" :style="{ backgroundColor: color }" />
    </template>
    <template v-else-if="status === 'playing'">
      <div v-for="i in 3" :key="i" class="bar" :style="{ backgroundColor: color }" />
    </template>
    <template v-else-if="status === 'stopped'">
      <div class="square" :style="{ backgroundColor: color }" />
    </template>
  </div>
</template>

<style scoped>
.audio-wave {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  width: 100rpx;
  gap: 8rpx;
}

/* 图一：等待播放 - 三个圆点 */
.dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background-color: #555;
}

/* 图二：播放中 - 波动条 */
.bar {
  width: 16rpx;
  height: 10rpx;
  border-radius: 8rpx;
  animation: wave 1.2s ease-in-out infinite;
}
.bar:nth-child(1) {
  animation-delay: 0s;
}
.bar:nth-child(2) {
  animation-delay: 0.2s;
}
.bar:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes wave {
  0%,
  100% {
    height: 10rpx;
  }
  25% {
    height: 30rpx;
  }
  50% {
    height: 60rpx;
  }
  75% {
    height: 30rpx;
  }
}

/* 图三：播放结束 - 中间一个小正方形 */
.square {
  width: 24rpx;
  height: 24rpx;
  border-radius: 4rpx;
  background-color: #555;
}
</style>
