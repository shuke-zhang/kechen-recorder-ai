<route lang="json">
  {
       "style": { "navigationBarTitleText": "语音合成"}
  }
</route>

<script setup lang="ts">
import SpeechSynthesisCore from './xunfei/speech-synthesis-core'

const speechSynthesis = new SpeechSynthesisCore({
  APPID: 'f9b52f87',
  APISecret: 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl',
  APIKey: '287ae449056d33e0f4995f480737564a',
  url: 'wss://tts-api.xfyun.cn/v2/tts',
  host: 'tts-api.xfyun.cn',
})
const textsss = ref('湛蓝的天空宛如水洗过的绸缎，几朵棉花糖般的白云慵懒地浮着。蝉鸣在香樟树荫里织成金线，穿堂风卷着青草香掠过廊下，惊起藤椅旁打盹的狸花猫。阳光在琉璃瓦上流淌成蜜，晒得石阶发烫，忽有蜻蜓掠过荷塘，划破凝滞的热浪，荷叶上滚动的露珠便映出七彩虹光，转瞬消逝在蒸腾的水汽里')
</script>

<template>
  <view class="container">
    <button type="primary" @click="speechSynthesis.synthesizeText(textsss)">
      测试连接websocket
    </button>
    <view class="flex justify-start">
      <text class="flex">
        内容：
      </text>
      <text>
        {{ textsss }}
      </text>
    </view>
  </view>
</template>

<style  lang="scss">
</style>
