<script lang="ts" setup>
import { ref } from 'vue'
import { COLOR_BLACK_1 } from '@/utils/const'

const props = defineProps({
  modelValue: String,
  focus: Boolean,
  showRecordingButton: {
    type: Boolean,
    default: false,
  },
  placeholder: String,
  btnText: {
    type: String,
    default: '发送',
  },
  isDisabledRecorder: Boolean,
  isDisabled: Boolean,
})

const emit = defineEmits<{
  'update:modelValue': [string]
  'update:focus': [boolean]
  'update:showRecordingButton': [boolean]
  'confirm': []
  'recorderConfirm': []
  'recorderClose': []
  'recorderTouchStart': []
  'showRecorder': []
  'recorderTouchEnd': []
}>()

const inputValue = useVModel(props, 'modelValue', emit)
const isFocus = useVModel(props, 'focus', emit)

const showRecordingButton = useVModel(props, 'showRecordingButton', emit)
const recording = ref(false)
const cancelRecording = ref(false)
const inputBottom = ref('0px')
const touchStartY = ref(0)

function handleRecorderIconClick() {
  if (showRecordingButton.value) {
    return showRecordingButton.value = !showRecordingButton.value
  }
  else {
    return emit('showRecorder')
  }
}

// 用户手指按下录音按钮
function handleTouchStart(e: TouchEvent) {
  if (props.isDisabledRecorder) {
    return
  }
  emit('recorderTouchStart')
  recording.value = true
  cancelRecording.value = false
  touchStartY.value = e.touches[0].clientY
}

// 手指移动过程中判断是否上滑取消
function handleTouchMove(e: TouchEvent) {
  if (props.isDisabledRecorder) {
    return
  }
  const deltaY = touchStartY.value - e.touches[0].clientY
  cancelRecording.value = deltaY > 80
}

// 手指松开，发送或取消
function handleTouchEnd() {
  if (props.isDisabledRecorder) {
    return
  }
  emit('recorderTouchEnd')

  if (cancelRecording.value) {
    emit('recorderClose')
  }
  else {
    emit('recorderConfirm')
  }
  resetRecordingState()
}

function resetRecordingState() {
  recording.value = false
  cancelRecording.value = false
}

function handleFocus() {
  isFocus.value = true
}

function handleBlur() {
  isFocus.value = false
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
  uni.offKeyboardHeightChange()
})
</script>

<template>
  <view class="comment-input-container" :style="{ bottom: inputBottom }">
    <!-- 正常模式 -->
    <button class="recorder-btn" @click="handleRecorderIconClick">
      <icon-font :name="showRecordingButton ? 'record' : 'recorder'" :class="COLOR_BLACK_1" />
    </button>

    <template v-if="!showRecordingButton">
      <input
        v-model="inputValue"
        class="comment-input bg-white"
        :placeholder="placeholder"
        :focus="isFocus"
        type="text"
        :adjust-position="false"
        hold-keyboard
        confirm-type="send"
        @blur="handleBlur"
        @focus="handleFocus"
      >

      <button
        class="send-btn"
        type="primary"
        :disabled="isDisabled || !inputValue"
        @click="emit('confirm')"
      >
        {{ btnText }}
      </button>
    </template>

    <!-- 显示录音按钮 -->
    <template v-else>
      <button
        class="press-record-btn"
        type="primary"
        :disabled="isDisabledRecorder"
        @touchstart.prevent="handleTouchStart"
        @touchmove.prevent="handleTouchMove"
        @touchend.prevent="handleTouchEnd"
      >
        <text v-if="cancelRecording">
          松手取消发送
        </text>
        <text v-else-if="recording">
          录音中，松开发送
        </text>
        <text v-else>
          按住说话
        </text>
      </button>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.comment-input-container {
  position: fixed;
  bottom: 0;
  padding-bottom: env(safe-area-inset-bottom);
  background-color: #f4f4f4;
  height: 120rpx;
  padding: 20rpx;
  box-sizing: border-box;
  z-index: 50;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .comment-input {
    flex: 1;
    margin: 0 20rpx;
    height: 80rpx;
    border-radius: 40rpx;
    font-size: 28rpx;
    padding: 0 32rpx;
    color: #333;
    background-color: #fff;
  }

  .recorder-btn {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    font-size: 30rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .send-btn {
    width: 120rpx;
    height: 80rpx;
    border-radius: 40rpx;
    font-size: 28rpx;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .send-btn:disabled {
    opacity: 0.5;
  }

  .press-record-btn {
    flex: 1;
    height: 80rpx;
    color: #fff;
    font-size: 28rpx;
    border-radius: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .press-record-btn:disabled {
    opacity: 0.5;
  }
}
</style>
