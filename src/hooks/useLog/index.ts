// composables/useLogger.ts
import { ref } from 'vue'

const BASE_URL = 'http://180.184.29.82:3099/api'

export function useLogger() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const success = ref(false)

  /** ✅ 写入日志 */
  const writeLogger = async (payload: Record<string, any>) => {
    loading.value = true
    success.value = false
    error.value = null

    try {
      const res = await uni.request({
        url: `${BASE_URL}/write`,
        method: 'POST',
        data: payload,
        header: {
          'Content-Type': 'application/json',
        },
      })

      if (res.statusCode === 200 && (res.data as any).success) {
        success.value = true
        console.log('✅ 日志写入成功:', (res.data as any).record)
      }
      else {
        throw new Error((res.data as any).msg || '日志写入失败')
      }
    }
    catch (err: any) {
      console.error('❌ 日志写入异常:', err)
      error.value = err.message
    }
    finally {
      loading.value = false
    }
  }

  return {
    writeLogger,
    loading,
    success,
    error,
  }
}
