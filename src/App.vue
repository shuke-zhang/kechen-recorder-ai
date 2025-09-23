<script setup lang="ts">
import { onHide, onShow } from '@dcloudio/uni-app'
import { useAiCall } from './store/modules/ai-call'

const router = useRouter()
const { getCallAudioData } = useAiCall()
onShow(() => {
  console.log('App Show')
})
onHide(() => {
  console.log('App Hide')
})

onLaunch(() => {
  getCallAudioData()
})
// onLaunch(async () => {
//   nextTick(async () => {
//     const t = getCurrentPages()
//     const pageName = t?.[t.length - 1]?.route || ''
//     if (pageName.includes('/pages/common/auth'))
//       return
//     if (getCacheToken()) {
//       await userStore.getUserInfo()
//     }
//     else {
//       userStore.performLogout()
//     }
//   })
// })

function parseYMDHMS(input: string): Date | null {
  if (!input)
    return null
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/)
  if (!m)
    return null
  const year: number = Number(m[1])
  const month: number = Number(m[2])
  const day: number = Number(m[3])
  const hh: number = Number(m[4])
  const mm: number = Number(m[5])
  const ss: number = Number(m[6])
  if (month < 1 || month > 12)
    return null
  if (day < 1 || day > 31)
    return null
  if (hh < 0 || hh > 23)
    return null
  if (mm < 0 || mm > 59)
    return null
  if (ss < 0 || ss > 59)
    return null
  const d: Date = new Date(year, month - 1, day, hh, mm, ss)
  if (Number.isNaN(d.getTime()))
    return null
  return d
}

function checkAuth(expireAt: string) {
  const target: Date | null = parseYMDHMS(expireAt)
  if (!target) {
    uni.showToast({ title: '授权时间格式错误', icon: 'none' })
    return
  }
  const nowMs: number = Date.now()
  const targetMs: number = target.getTime()
  if (nowMs >= targetMs) {
    // uni.showToast({ title: '授权已过期', icon: 'none' })
    return router.replace('/pages/expired/index')
  }
}

onLaunch((): void => {
  // TODO: 这里替换为你的真实截止时间，或改为从服务端/本地存储获取
  const expireAt: string = '2025-10-20 00:00:00'
  checkAuth(expireAt)
})
</script>

<style lang="scss">
:not(not) {
  box-sizing: border-box;
}
</style>
