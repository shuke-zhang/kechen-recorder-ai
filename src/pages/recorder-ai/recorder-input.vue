<script lang="ts" setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: String,
  focus: Boolean,
  showRecordingButton: {
    type: Boolean,
    default: false,
  },
  /**
   * 输入框占位符
   */
  placeholder: String,
  btnText: {
    type: String,
    default: '发送',
  },
  /**
   * 是否禁用录音按钮
   */
  isDisabledRecorder: Boolean,
  /**
   * 是否禁用输入框
   */
  isDisabled: Boolean,
  /** 是否显示上划取消的页面样式 */
  isShowRecordingTip: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits<{
  'update:modelValue': [string]
  'update:focus': [boolean]
  'update:showRecordingButton': [boolean]

  /** 点击发送按钮 */
  /** 点击发送按钮 */
  'confirm': []
  'recorderConfirm': []
  'recorderClose': []
  /** 录音按钮按下 */
  'recorderTouchStart': []
  'showRecorder': []
  /** 录音按钮抬起 */
  'recorderTouchEnd': []
}>()
/**
 * 输入框的值
 */
const inputValue = useVModel(props, 'modelValue', emit)
const tipRef = ref<HTMLElement>()
/**
 * 是否聚焦
 */
const isFocus = useVModel(props, 'focus', emit)
/**
 * 是否显示录音按钮
 */
const showRecordingButton = useVModel(props, 'showRecordingButton', emit)

/**
 * 是否正在录音
 */
const recording = ref(false)
/**
 * 是否取消录音
 */
const cancelRecording = ref(false)
/**
 * 输入框底部的偏移量（键盘高度）
 */
const inputBottom = ref('0px')
/**
 * 手指按下时的 Y 坐标
 */
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
  if (props.isDisabledRecorder)
    return

  const fingerX = e.touches[0].clientX
  const fingerY = e.touches[0].clientY

  if (props.isShowRecordingTip) {
    // 显示提示区域：判断是否进入提示区域
    uni.createSelectorQuery()
      .select('#recording-tip')
      .boundingClientRect((_rect) => {
        if (!_rect)
          return
        const rect = _rect as UniNamespace.NodeInfo
        const isInCancelArea
          = fingerX >= rect.left!
            && fingerX <= rect.right!
            && fingerY >= rect.top!
            && fingerY <= rect.bottom!

        cancelRecording.value = isInCancelArea
      })
      .exec()
  }
  else {
    // 不显示提示区域：只要移动出按钮区域就视为取消
    uni.createSelectorQuery()
      .select('.press-record-btn') // 按钮的 class
      .boundingClientRect((_rect) => {
        if (!_rect)
          return
        const rect = _rect as UniNamespace.NodeInfo
        const isOutsideButton
          = fingerX < rect.left!
            || fingerX > rect.right!
            || fingerY < rect.top!
            || fingerY > rect.bottom!

        cancelRecording.value = isOutsideButton
      })
      .exec()
  }
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
  // 排除h5
  // #ifdef H5
  uni.offKeyboardHeightChange()
  // #endif
})
function handleConfirm() {
  /** 点击按钮 */
  emit('confirm')
  console.log('错误实在这儿，导致先清空内容再发送消息')
}
</script>

<template>
  <view class="comment-input-container" :style="{ bottom: inputBottom }">
    <!-- 正常模式 -->
    <button class="recorder-btn border-color-primary" @click="handleRecorderIconClick">
      <icon-font :name="showRecordingButton ? 'keyboard' : 'recorder'" size="42" />
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
        @click="handleConfirm"
      >
        {{ btnText }}
      </button>
    </template>

    <!-- 显示录音按钮 -->
    <template v-else>
      <!-- 上划取消提示 -->
      <view
        v-if="recording"
        id="recording-tip"
        ref="tipRef"
        class="recording-tip bg-[rgba(182,182,182,0.5)] w-full h-300rpx flex-center "
      >
        <text v-if="cancelRecording" class="text-size-38rpx">
          松手取消发送
        </text>
        <text v-else class="text-size-38rpx">
          滑动到此位置取消发送
        </text>
      </view>
      <button
        id="press-record-btn"
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
  // background-color: red;
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
    border: 2rpx solid;
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
    margin-left: 20rpx;
    border-radius: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .press-record-btn:disabled {
    opacity: 0.5;
  }
}

.recording-tip {
  position: absolute;
  top: -300rpx;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  padding: 10rpx 20rpx;
  border-radius: 120rpx 120rpx 0 0;
  font-size: 26rpx;
  z-index: 99;
  white-space: nowrap;
}
</style>
