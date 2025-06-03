// @ts-nocheck
<script lang="ts">
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    recorderCore: {
      playTTS: (base64: string, text: string) => void
      stopTTS: () => void
    }
  }
}
export default {

  props: {
    streamData: { // 接收视图层即renderjs中传递过来的数据
      type: Object,
      default: () => ({}),
    },
    /**
     * 是否正在播放 可双向绑定 实时显示音频是否正在播放的状态，也可以通过自定义事件自定义isPlaying的状态
     * true-正在播放 false-未播放/播放完成
     */
    modelValueIsPlaying: { // 接收视图层即renderjs中传递过来的数据
      type: Boolean,
      default: false,
    },
  },
  emits: ['onStreamPlayEnd', 'onStreamPlayStart', 'onStreamStop', 'update:modelValueIsPlaying'],
  data() {
    return {
      stopSignal: false,
    }
  },
  computed: {

  },
  methods: {
    // 接收renderjs发回的数据
    onStreamPlayStart(buffer: ArrayBuffer) {
      this.$emit('onStreamPlayStart', buffer)
      this.$emit('update:modelValueIsPlaying', true)
    },
    // 接收renderjs发回的数据
    onStreamPlayEnd(buffer: ArrayBuffer) {
      this.$emit('onStreamPlayEnd', buffer)
      this.$emit('update:modelValueIsPlaying', false)
    },
    /**
     * 停止播放操作
     */
    onStreamStop() {
      this.$emit('update:modelValueIsPlaying', false)
      this.$emit('onStreamStop')
      this.stopSignal = !this.stopSignal
    },

  },
}
</script>

<script module="recorderCore" lang="renderjs">
import StreamAudioPlayer from './StreamPlayer'
// @ts-ignore
let player = null
let currentSessionId = 0
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
      console.log('播放开始啦~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
      this.$ownerInstance?.callMethod('onStreamPlayStart', 1)
    })
    player.onEnd(() => {
      console.log('播放结束啦~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
      // @ts-ignore
      this.$ownerInstance?.callMethod('onStreamPlayEnd', 1)

    })

  },
  methods: {
    // @ts-ignore
 playTTS(currTTSData) {
 const {buffer,text,id} = currTTSData
  console.log(text, 'playTTS的文本')
  if(!player){
    player = new StreamAudioPlayer()
  }
  if (!buffer || typeof buffer !== 'string') {
    console.warn('❌ 无效的 base64 buffer:', buffer)
    return
  }

  try {
    const bytes = this.base64ToArrayBuffer(buffer)
    player.appendSmartChunk({
      buffer:bytes,
      text,
      id
    })
  } catch (err) {
    console.error('❌ base64 转换失败:', err)
  }
},
    stopTTS(stopSignal) {
       currentSessionId++
      player?.stop?.()
      player?.destroy?.()
      player = null
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
    :prop="streamData"
    :change:prop="recorderCore.playTTS"
    :stop-signal="stopSignal"
    :change:stop-signal="recorderCore.stopTTS"
    type="renderjs"
    module="recorderCore"
  />
</template>
