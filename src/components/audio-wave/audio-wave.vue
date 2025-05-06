<script setup lang="ts">
const props = defineProps({
  color: {
    type: String,
    default: '#333',
  },
})
const playing = ref(false)
function togglePlay() {
  playing.value = !playing.value
}
const style = computed(() => {
  return {
    backgroundColor: props.color,
  }
})
</script>

<template>
  <div class="audio-wave playing" @click="togglePlay">
    <div v-for="i in 4" :key="i" class="bar" :style="style" />
  </div>
</template>

<style scoped>
.audio-wave {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  width: 60rpx;
  height: 40rpx;
}
.bar {
  width: 2rpx;
  height: 10rpx;
  background-color: #333;
  animation: none;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

.playing .bar:nth-child(1) {
  animation: wave 1s 0s infinite;
}
.playing .bar:nth-child(2) {
  animation: wave 1s 0.1s infinite;
}
.playing .bar:nth-child(3) {
  animation: wave 1s 0.2s infinite;
}
.playing .bar:nth-child(4) {
  animation: wave 1s 0.3s infinite;
}

@keyframes wave {
  0%,
  100% {
    height: 5rpx;
  }
  50% {
    height: 20rpx;
  }
}
</style>
