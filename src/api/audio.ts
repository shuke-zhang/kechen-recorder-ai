import type { DoubaoAudioModel } from '@/model/audio'
import { request } from '@/utils/request'

export function doubaoSpeechSynthesis(text: string) {
  return request.post<DoubaoAudioModel>({
    url: '/tts/json',
    data: {
      text,
    },
    withToken: false,
    getResponse: true,
  },
  )
}
