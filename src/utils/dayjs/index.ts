import dayjs from 'dayjs'

export interface IdleTimerOptions {
  /** 每秒提示文本前缀 */
  text?: string
  /** 空闲时长阈值（单位 ms） */
  delay: number
  /** 是否打印日志 */
  isLog?: boolean
  /** 空闲超时触发回调 */
  onTimeout: () => void | Promise<void>
}

export interface IdleTimerController {
  /** 重置空闲计时器（用户操作时调用） */
  reset: () => void
  /** 停止空闲计时器 */
  stop: () => void
}

/**
 * @description 格式化时间
 * @param time
 * @param type 默认值 YYYY-MM-DD
 */
export function formatTime(options: {
  _time?: string | number | Date
  type: string
} = {
  _time: new Date(),
  type: 'YYYY-MM-DD',
}) {
  const time = options._time || new Date()
  return dayjs(time).format(options.type)
}

export function createIdleTimer(options: IdleTimerOptions): IdleTimerController {
  const { text = '空闲', delay, onTimeout } = options
  console.log('触发createIdleTimer')

  let idleStartTime: number | null = null
  let lastSecond = 0
  let timer: ReturnType<typeof setInterval> | null = null

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    // ❌ 不要清除 idleStartTime 和 lastSecond，这会让 reset 逻辑崩掉
  }

  const reset = () => {
    stop() // 先停掉已有定时器
    idleStartTime = Date.now()
    lastSecond = 0

    timer = setInterval(async () => {
      if (idleStartTime === null)
        return

      const now = Date.now()
      const elapsed = now - idleStartTime
      const currentSecond = Math.floor(elapsed / 1000)

      if (currentSecond > lastSecond) {
        lastSecond = currentSecond
        if (options.isLog) {
          console.log(`⌛ ${text} ${currentSecond} 秒`)
        }

        if (elapsed >= delay) {
          stop()
          await onTimeout()
        }
      }
    }, 200)
  }

  return { reset, stop }
}
