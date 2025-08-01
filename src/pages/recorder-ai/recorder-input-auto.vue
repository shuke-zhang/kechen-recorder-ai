<script lang="ts" setup>
import { ref } from 'vue'
import type { StatusModel } from '@/components/audio-wave/audio-wave'

defineProps({
  modelValue: String,

  /**
   * 输入框占位符
   */
  placeholder: String,

  /**
   * 是否禁用录音按钮
   */
  isDisabledRecorder: Boolean,
  /**
   * 是否禁用输入框
   */
  isDisabled: Boolean,

})

const emit = defineEmits<{
  /** 点击发送按钮 */
  confirm: []
  /** 当状态为 stopped 时点击触发的函数 */
  clickStopped: []
}>()

/**
 * 是否显示录音按钮
 */
const showRecordingButton = defineModel('showRecorderBtn', { type: Boolean, default: true })

const status = defineModel<StatusModel>('status', {
  default: 'pending',
})

/**
 * 输入框底部的偏移量（键盘高度）
 */
const inputBottom = ref('0px')

const speakStatusList = [
  {
    statusCode: 0,
    status: 'pending',
    text: '你可以开始说话',
  },
  {
    statusCode: 1,
    status: 'playing',
    text: '正在识别...',
  },
  {
    statusCode: 2,
    status: 'stopped',
    text: '说话或者点击打断',
  },
]
const statusText = computed(() => {
  const item = speakStatusList.find(item => item.status === status.value)
  return item?.text || ''
})

function handleRecorderIconClick() {
  showRecordingButton.value = !showRecordingButton.value
}

function clickStopped() {
  emit('clickStopped')
}

onShow(() => {
  // 添加小程序条件编译
  uni.onKeyboardHeightChange((event) => {
    const { height } = event
    // 例如，设置输入框的 bottom 值为键盘高度
    inputBottom.value = `${height}px`
  })
})
onHide(() => {
  // 排除h5
  // #ifdef H5
  uni.offKeyboardHeightChange()
  // #endif
})
</script>

<template>
  <view
    class="comment-input-container bg-#dcebfb flex flex-col items-center" :style="{
      bottom: inputBottom,
      height: `${isPad ? '50px' : '140rpx'}`,
    }"
  >
    <!-- 正常模式 -->
    <view v-if="showRecordingButton" class="size-full flex flex-col justify-center items-center">
      <audio-wave
        :status="status"
        :color="COLOR_PRIMARY"
        :bar-width="isPad ? 6 : 16"
        :bar-max-height="isPad ? 24 : 60"
        :gap="isPad ? 4 : 8"
        :dot-size="isPad ? 6 : 20"
        :square-size="isPad ? 24 : 48"
        @click-stopped="clickStopped"
      />
      <text :class="[isPad ? 'font-size-16px' : 'font-size-28rpx']">
        {{ statusText }}
      </text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.comment-input-container {
  position: fixed;
  bottom: 0;
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
  z-index: 50;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
