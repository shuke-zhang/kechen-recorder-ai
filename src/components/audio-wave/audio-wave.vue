<script setup lang="ts">
import { computed } from 'vue'
import type { StatusModel } from './audio-wave.ts'

const props = defineProps<{
  status: StatusModel
  color?: string
  /** 圆点大小 */
  dotSize?: number
  /**  “播放状态”波动条的宽度，单位：rpx（默认 16） */
  barWidth?: number // rpx
  /**  “播放状态”波动条的最大高度，用于动画，单位：rpx（默认 60） */
  barMaxHeight?: number // rpx
  /**  “停止状态”方块的边长，单位：rpx（默认 48） */
  squareSize?: number // rpx
  /** 各个图形之间的间距，单位：rpx（默认 8） */
  gap?: number
}>()
const emit = defineEmits<{
  clickStopped: []
}>()

const color = computed(() => props.color || '#555')
function onClickStopped() {
  emit('clickStopped')
}

const dotSize = computed(() => props.dotSize ?? 20)
const dotSizeCss = computed(() => props.dotSize ? `${props.dotSize}rpx` : '20rpx')
const barWidth = computed(() => props.barWidth ?? 16)
const barMaxHeight = computed(() => props.barMaxHeight ?? 60)
const squareSize = computed(() => props.squareSize ?? 48)
const gap = computed(() => props.gap ?? 8)
</script>

<template>
  <div
    class="audio-wave" :class="status"
    :style="{
      'gap': `${gap}rpx`,
      '--bar-max-height': `${barMaxHeight}rpx`,
    }"
  >
    <template v-if="status === 'pending'">
      <div
        v-for="i in 3" :key="i" class="dot"
        :style="{
          backgroundColor: color,
          width: `${dotSize}rpx`,
          height: `${dotSize}rpx`,
        }"
      />
    </template>
    <template v-else-if="status === 'playing'">
      <div
        v-for="i in 3" :key="i" class="bar"
        :style="{
          backgroundColor: color,
          width: `${barWidth}rpx`,
        }"
      />
    </template>
    <template v-else-if="status === 'stopped'">
      <div
        class="square"
        :style="{
          backgroundColor: color,
          width: `${squareSize}rpx`,
          height: `${squareSize}rpx`,
        }" @click="onClickStopped"
      />
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
}

/* 图一：等待播放 - 三个圆点 */
.dot {
  border-radius: 50%;
  background-color: #555;
}

/* 图二：播放中 - 波动条 */
.bar {
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
    height: v-bind(dotSizeCss);
  }
  25% {
    height: calc(var(--bar-max-height) * 0.5); /* 50% */
  }
  50% {
    height: var(--bar-max-height); /* 最大高度 */
  }
  75% {
    height: calc(var(--bar-max-height) * 0.5); /* 回落 */
  }
}

/* 图三：播放结束 - 中间一个小正方形 */
.square {
  border-radius: 4rpx;
  background-color: #555;
}
</style>
