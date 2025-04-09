<!-- eslint-disable import/first -->
<!-- eslint-disable import/no-duplicates -->
<!-- eslint-disable import/no-duplicates -->

 <!-- #ifdef APP -->
<script module="recorderCore" lang="renderjs">
import Recorder from 'recorder-core'
import RecordApp from 'recorder-core/src/app-support/app'
import '../../../../uni_modules/Recorder-UniCore/app-uni-support.js'
import 'recorder-core/src/engine/pcm'
import 'recorder-core/src/extensions/waveview'
// @ts-expect-error: Ignoring duplicate default export error
export default {

  mounted() {
    // App的renderjs必须调用的函数，传入当前模块this
    RecordApp.UniRenderjsRegister(this)
  },
  methods: {
    // 这里定义的方法，在逻辑层中可通过 RecordApp.UniWebViewVueCall(this,'this.xxxFunc()') 直接调用
    // 调用逻辑层的方法，请直接用 this.$ownerInstance.callMethod("xxxFunc",{args}) 调用，二进制数据需转成base64来传递
  },
}
</script>
<!-- #endif -->

<script setup lang='ts'>
// eslint-disable-next-line import/first, import/no-named-default, import/no-duplicates
import { default as RecorderInstance } from 'recorder-core'
// eslint-disable-next-line import/first, import/no-named-default, import/no-duplicates
import { default as RecordAppInstance } from 'recorder-core/src/app-support/app'
// eslint-disable-next-line import/first
import RecorderInput from './recorder-input.vue'
// eslint-disable-next-line import/first
import useRecorder from './hooks/useRecorder'

// eslint-disable-next-line import/first, import/no-duplicates
import '../../../../uni_modules/Recorder-UniCore/app-uni-support.js'
/** 需要编译成微信小程序时，引入微信小程序支持文件 */
// #ifdef MP-WEIXIN
// eslint-disable-next-line import/first
import 'recorder-core/src/app-support/app-miniProgram-wx-support.js'
// #endif

// #ifdef H5 || MP-WEIXIN
// eslint-disable-next-line import/first, import/no-duplicates
import 'recorder-core/src/engine/pcm'
// eslint-disable-next-line import/first, import/no-duplicates
import 'recorder-core/src/extensions/waveview'
// #endif
const vueInstance = getCurrentInstance()?.proxy as any // 必须定义到最外面，getCurrentInstance得到的就是当前实例this

const {
  textRes,
  content,
  isFocus,
  showRecordingButton,
  handleRecorderClose,
  handleShowRecorder,
  handleRecorderTouchStart,
  handleRecorderTouchEnd,
  handleRecorderConfirm,
  handleConfirm,
  recReq,
  recStart,
  recStop,
} = useRecorder({
  RecordApp: RecordAppInstance,
  Recorder: RecorderInstance,
  vueInstance,
})

onMounted(() => {
  (vueInstance as any).isMounted = true
  RecordAppInstance.UniPageOnShow(vueInstance)
})
onShow(() => {
  if ((vueInstance as any)?.isMounted) {
    RecordAppInstance.UniPageOnShow(vueInstance)
  }
})
</script>

<template>
  <button class="mt-40rpx" type="primary" @click="recReq">
    请求录音权限
  </button>
  <button class="mt-40rpx" type="primary" @click="recStart">
    开始识别1
  </button>

  <button class="mt-40rpx" type="primary" @click="recStop">
    停止识别1
  </button>
  <view>
    识别结果：
    <text class="text-primary">
      {{ textRes }}
    </text>
  </view>
  <RecorderInput
    v-model:model-value="content"
    v-model:focus="isFocus"
    v-model:show-recording-button="showRecordingButton"
    placeholder="请输入您的问题..."
    is-offset
    class="flex-1"
    btn-text="发送"
    @recorder-close="handleRecorderClose"
    @show-recorder="handleShowRecorder"
    @recorder-touch-start="handleRecorderTouchStart"
    @recorder-touch-end="handleRecorderTouchEnd"
    @recorder-confirm="handleRecorderConfirm"
    @confirm="handleConfirm"
  />
</template>

<route lang="json">
  {
       "style": { "navigationBarTitleText": "录音" }
  }
</route>
