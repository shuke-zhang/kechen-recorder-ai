import type { DoubaoAudioModel } from '@/model/audio'
import { request } from '@/utils/request'

export function doubaoSpeechSynthesis(data: { text: string, id: number }) {
  return request.post<DoubaoAudioModel>({
    url: '/tts/json',
    data: {
      text: data.text,
      id: data.id,
    },
    withToken: false,
    getResponse: true,
  },
  )
}
