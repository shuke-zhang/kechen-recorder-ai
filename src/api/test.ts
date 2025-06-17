import { request } from '@/utils/request/index'

export function testCancelPrevious(params: { text: string, id: number }, cancelPrevious = false) {
  console.log(`${params.text}`, cancelPrevious)

  return request.get<{ msg: string, code: number }>({
    url: `/audio/synthesis/v2`,
    withToken: false,
    params,
    cancelPrevious,
  })
}
