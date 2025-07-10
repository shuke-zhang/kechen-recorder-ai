import { request } from '@/utils/request'

export function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<FormData>({
    url: `/common/upload/v1`,
    data: formData,
    header: {
      'Content-Type': 'multipart/form-data',
    },
    withToken: false,
  })
}
