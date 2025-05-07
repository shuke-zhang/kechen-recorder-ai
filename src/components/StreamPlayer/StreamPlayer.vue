<!-- eslint-disable ts/ban-ts-comment -->
// @ts-nocheck
<script>
export default {
  data() {
    return {
      currBuffer: '', // 接收视图层即renderjs中传递过来的数据
      isStreamPlaying: false, // 播放状态
    }
  },
  methods: {
    // 接收renderjs发回的数据
    handleRenderMessage(buffer) {
      console.log('receiveRenderData-->', buffer)
      this.currBuffer = buffer
    },
  },
}
</script>

<script module="recorderCore" lang="renderjs">
import StreamAudioPlayer from './StreamPlayer'
// @ts-ignore
let player = null
// @ts-expect-error: Ignoring duplicate default export error
export default {
  data() {
    return {
    }
  },
  mounted() {
    // App的renderjs必须调用的函数，传入当前模块this
    player = new StreamAudioPlayer()
    player.onStart(() => {
      console.log(this, '播放开始啦~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
    })
    player.onEnd(() => {
      console.log(this, '播放结束啦**************************************************************************************************************************************')
      // @ts-ignore
      this.$ownerInstance?.callMethod('onStreamPlayEnd', 1)
    })
  },
  methods: {
    // 这里定义的方法，在逻辑层中可通过 RecordApp.UniWebViewVueCall(this,'this.xxxFunc()') 直接调用
    // 调用逻辑层的方法，请直接用 this.$ownerInstance.callMethod("xxxFunc",{args}) 调用，二进制数据需转成base64来传递
    // @ts-ignore
    playTTS(base64) {
      if (!base64)
        return

      const bytes = this.base64ToArrayBuffer(base64)
      // @ts-ignore
      player.appendChunk(bytes)
    },
    // @ts-ignore
    base64ToArrayBuffer(base64Data) {
    // 1. 解码Base64为二进制字符串
      const binaryString = atob(base64Data)
      // 2. 创建一个新的Uint8Array来保存解码后的数据
      const arrayBuffer = new ArrayBuffer(binaryString.length)
      const uint8Array = new Uint8Array(arrayBuffer)
      // 3. 将二进制字符串中的每个字符转换为Uint8Array的相应值
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i)
      }
      return arrayBuffer
    },
  },
}
</script>

<template>
  <view
    :prop="currBuffer"
    :change:prop="recorderCore.playTTS"
    type="renderjs"
    module="recorderCore"
  />
</template>
