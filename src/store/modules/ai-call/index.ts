import { defineStore } from 'pinia'
import { ref } from 'vue'
import { doubaoSpeechSynthesisFormat } from '@/api/audio'
import { logger } from '@/utils/helpers/logger'

interface AiCallMsg {
  audioData: string
  text: string
  id: number
}

export const useAiCall = defineStore('aiCall', () => {
  const callAudioData = ref<AiCallMsg>(getCache<AiCallMsg>('AI_GREETING_AUDIO_DATA') || {
    audioData: '',
    text: '',
    id: 0,
  })

  function getCallAudioData() {
    const cached = getCache<AiCallMsg>('AI_GREETING_AUDIO_DATA')
    if (cached) {
      logger.info('使用缓存的语音数据')
      callAudioData.value = cached
      return cached
    }
    doubaoSpeechSynthesisFormat({
      text: '你好呀，我是柯仔。请问有什么可以帮助你的吗？',
      id: 0,
    })
      .then((res) => {
        const result = {
          audioData: res.audio_buffer,
          text: res.text,
          id: res.id,
        }
        callAudioData.value = result
        setCache('AI_GREETING_AUDIO_DATA', result, { day: 7 })
        logger.info('新语音数据已缓存')
        return callAudioData.value
      })
      .catch((err) => {
        logger.error('语音合成失败', err)
      })
  }

  return {
    callAudioData,
    getCallAudioData,
  }
})
