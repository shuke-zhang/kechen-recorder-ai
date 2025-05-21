<route lang="json">
 {
      "style": { "navigationBarTitleText": "测试页面" }
 }
</route>

<script setup lang="ts">
import { SpeechSynthesisDoubao } from '../recorder-ai/doubao/speech-synthesis-doubao'
import SpeechSynthesisCore from '../recorder-ai/xunfei/speech-synthesis-core'
import type StreamPlayer from '@/components/StreamPlayer/StreamPlayer.vue'

const currBuffer = ref<ArrayBuffer >()
const streamPlayerRef = ref<InstanceType<typeof StreamPlayer> | null>(null)
const text = ref('那一刻，我的心情如潮水般起伏人生就像一条波澜起伏的河流，总有一些瞬间，激起我们内心深处的涟漪。那天傍晚，我站在教室的窗边，手里紧紧攥着刚发下来的试卷，心情如潮水般翻涌。原本以为自己这次考试能够有不错的发挥，复习得也算认真，题目当时做得也挺顺利。可当分数赫然出现在眼前的那一刻，一切期望都化为泡影。分数不但低于我的预期，甚至在班级中也处于中下游。一股失落、懊恼、不甘交织着涌上心头，仿佛压得人喘不过气来。我默默走出教室，来到校园角落的一片空地。微风拂过脸颊，夕阳洒在地上，把影子拉得老长。我的心渐渐从剧烈波动中平静下来。我开始回忆复习过程中的种种细节，反思是否真的尽力，是否还有可以改进的地方。心中的懊恼虽然还在，但也多了一份冷静与思考。心情像潮水般退去之后，留下的是一片被阳光照亮的沙滩。那一刻，我学会了面对自己，学会了在失落中寻找前行的力量。')

const test2 = ref('今天是个好日子')

const APPID = '3810425215'
const AccessToken = 'mHT8sdy_o3wVHNSIw9jfJqCawEu0Aq5s'
const SecretKey = 'WcH7__6VXDbmzKbXaNkLt9PN9kFCyFy0'
const url = 'wss://openapi.xf-yun.com/v1/private/s453a306'
const host = 'openapi.xf-yun.com'
const SpeechSynthesis = new SpeechSynthesisCore({
  APPID: 'f9b52f87',
  APISecret: 'ZDVkYzU5YmFhZmNlODVkM2RlNDMyNDhl',
  APIKey: '287ae449056d33e0f4995f480737564a',
  url: 'wss://tts-api.xfyun.cn/v2/tts',
  host: 'tts-api.xfyun.cn',
})
const speechSynthesisDoubaoCore = new SpeechSynthesisDoubao({
  APPID,
  AccessToken,
  SecretKey,
  url,
  host,
})
speechSynthesisDoubaoCore.on('audio', (_res) => {
  console.log('监听到audio事件', Object.prototype.toString.call(_res))

  currBuffer.value = _res
})
SpeechSynthesis.on('audio', (res: ArrayBuffer) => {
  currBuffer.value = res
})

function send(text: string) {
  speechSynthesisDoubaoCore.sendTextStream(text)
}
function xunfeiSend(text: string) {
  SpeechSynthesis.convertTextToSpeech(text)
}
</script>

<template>
  <view class="audioPlay">
    测试页面-{{ speechSynthesisDoubaoCore }}
    <button type="primary" @click="send(test2)">
      点击-豆包
    </button>
    <button class="mt-40rpx" type="primary" @click="xunfeiSend(test2)">
      点击-讯飞
    </button>

    <!-- 音频播放组件 -->
    <StreamPlayer
      ref="streamPlayerRef"
      :stream="currBuffer"
      :curr-buffer="currBuffer"
    />
  </view>
</template>
