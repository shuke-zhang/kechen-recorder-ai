<script lang="ts" setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: String,
  focus: Boolean,

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
  /** 点击发送按钮 */
  confirm: []
}>()
/**
 * 输入框的值
 */
const inputValue = useVModel(props, 'modelValue', emit)
/**
 * 是否聚焦
 */
const isFocus = useVModel(props, 'focus', emit)
/**
 * 是否显示录音按钮
 */
const showRecordingButton = defineModel('showRecorderBtn', { type: Boolean, default: true })

/**
 * 输入框底部的偏移量（键盘高度）
 */
const inputBottom = ref('0px')
const status = ref<'pending' | 'playing' | 'stopped'>('playing')

/**
 * - 0 - 你可以开始说话（还没有说话的逻辑）
 * - 1 - 正在识别...
 * - 2 - 说话或者点击打断（语音播放中需要打断或者不用点击直接说话）
 */
const speakStatus = ref(0)

function handleRecorderIconClick() {
  showRecordingButton.value = !showRecordingButton.value
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
  <view class="comment-input-container bg-#dcebfb flex flex-col items-center" :style="{ bottom: inputBottom }">
    <!-- 正常模式 -->
    <view class="w-full h-full flex items-center justify-between">
      <button class="recorder-btn border-0! m-0!  bg-#edf6fd size-120rpx" @click="handleRecorderIconClick">
        <icon-font :name="!showRecordingButton ? 'recorder-fill' : 'keyboard'" size="80" color="#000" />
      </button>

      <view v-if="showRecordingButton" class="flex flex-col justify-center items-center">
        <audio-wave :status="status" :color="COLOR_PRIMARY" />
        <text>
          你可以说话
        </text>
      </view>

      <button v-if="showRecordingButton" class="recorder-btn  m-0! border-0!  bg-#edf6fd size-120rpx">
        <icon-font name="close" size="80" color="red" />
      </button>

      <template v-else>
        <input
          v-model="inputValue"
          class="comment-input bg-white h-120rpx"
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
          class=" recorder-btn size-120rpx"
          type="primary"
          :disabled="isDisabled || !inputValue"
          @click="handleConfirm"
        >
          {{ btnText }}
        </button>
      </template>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.comment-input-container {
  position: fixed;
  bottom: 0;
  padding-bottom: env(safe-area-inset-bottom);
  height: 260rpx;
  padding: 20rpx;
  box-sizing: border-box;
  height: 200rpx;
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
    border-radius: 50%;
    border: 2rpx solid;
    font-size: 30rpx;
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
</style>
