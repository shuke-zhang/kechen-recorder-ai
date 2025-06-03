import { request } from '@/utils/request'

export function doubaoSpeechSynthesis(params: { text: string, id: number }) {
  return request.get<{ msg: string, code: number }>({
    url: `/audio/synthesis/v1`,
    withToken: false,
    params,
  })
}

// export function doubaoSpeechSynthesis(data: { text: string, id: number }) {
//   return request.post<DoubaoAudioModel>({
//     url: '/tts/json',
//     data: {
//       text: data.text,
//       id: data.id,
//     },
//     withToken: false,
//     getResponse: true,
//   },
//   )
// }
