import type { PluginShuke } from 'plugin_shuke'

/** 单条音频任务结构 */
interface AudioTask {
  id: number | string
  base64: string
}

export function usePluginShuke(options: {
  /**
   * 插件初始化完成回调（ready）
   * - 当原生插件加载完毕、准备就绪时触发
   * - 一般用于提示“播放器可用”
   */
  onReady?: () => void

  /**
   * 播放开始回调（start）
   * - 当开始播放新的音频任务时触发
   * - 参数 id：当前播放的任务编号
   */
  onStart?: (id: number) => void

  /**
   * 播放进度更新回调（progress）
   * - 在播放过程中周期性触发
   * - 参数 progress：播放进度百分比（0 ~ 100）
   */
  onProgress?: (progress: number) => void

  /**
   * 单条任务播放完成回调（complete）
   * — 当前任务播放完毕（未必队列全部结束）时触发
   * — 参数 id：完成的任务编号
   */
  onComplete?: (id: number) => void

  /**
   * 播放队列已全部播放完回调（queueEmpty）
   * - 队列播放完毕后自动触发
   * - 可用于自动重播或切换下一轮
   */
  onQueueEmpty?: () => void

  /**
   * 播放错误回调（error）
   * - 当播放或解码出错时触发
   * - 参数 error：错误对象（包含 message、code 等信息）
   */
  onError?: (error: any) => void

  /**
   * 输出模式切换回调（modeChanged）
   * - 当音频输出通道切换时触发
   * - 参数 mode：当前通道类型（'speaker' | 'earpiece' | 'bluetooth'）
   */
  onModeChanged?: (mode: 'speaker' | 'earpiece' | 'bluetooth') => void

  /**
   * 主动停止播放回调（stop）
   * - 当用户调用 stopAudio() 或外部中断播放时触发
   * - 可用于重置 UI 状态（如切换按钮、停止动画）
   */
  onStop?: () => void
} = {}) {
  const plugin = uni.requireNativePlugin('plugin_shuke') as PluginShuke

  /** 当前播放状态 */
  const isAudioRunning = ref(false)
  const currentId = ref<number | null>(null)
  const queueSize = ref(0)
  const progress = ref(0)
  const outputMode = ref<'speaker' | 'earpiece' | 'bluetooth'>('speaker')

  /** 🎬 初始化播放（首次） */
  function startAudio(tasks: AudioTask[]) {
    console.log('🎬 初始化播放')

    plugin.clear?.()
    isAudioRunning.value = true
    queueSize.value = 0
    currentId.value = null
    progress.value = 0

    for (const item of tasks) {
      plugin.addTask(String(item.id), item.base64, (ret: any) => {
        console.log('📥 入队成功：', ret)
      })
    }
  }

  /** ➕ 追加任务 */
  function addAudioTask(tasks: AudioTask[]) {
    for (const item of tasks) {
      plugin.addTask(String(item.id), item.base64, (ret: any) => {
        console.log('➕ 追加任务成功：', ret)
      })
    }
  }

  // ✅ 函数重载声明（声明部分）
  function playAudio(task: AudioTask): void
  function playAudio(tasks: AudioTask[]): void

  // ✅ 实现部分（内部统一为数组处理）
  function playAudio(taskOrTasks: AudioTask | AudioTask[]) {
    const taskList = Array.isArray(taskOrTasks) ? taskOrTasks : [taskOrTasks]

    if (!isAudioRunning.value) {
      startAudio(taskList)
    }
    else {
      addAudioTask(taskList)
    }
  }

  /** 停止播放并清空队列 */
  function stopAudio() {
    plugin.clear?.()
    isAudioRunning.value = false
    currentId.value = null
    progress.value = 0
    queueSize.value = 0
  }

  /** 输出模式切换（speaker → earpiece → bluetooth） */
  function toggleOutputMode() {
    const next
      = outputMode.value === 'speaker'
        ? 'earpiece'
        : outputMode.value === 'earpiece'
          ? 'bluetooth'
          : 'speaker'
    outputMode.value = next
    plugin.setOutputMode?.(next, (ret: any) => {
      console.log('🔄 输出通道切换：', ret)
    })
  }

  /** 注册事件监听 */
  function registerListener() {
    if (!plugin?.onEvent) {
      console.warn('⚠️ 原生插件不可用（仅 App 有效）')
      return
    }

    plugin.onEvent((res: any) => {
      const msg = typeof res === 'string' ? JSON.parse(res) : res
      const event = msg?.type
      const data = msg?.data || {}

      switch (event) {
        case 'ready':
          options.onReady?.()
          break
        case 'queued':
          queueSize.value = data.queueSize ?? queueSize.value
          break
        case 'start':
          currentId.value = Number(data.id) || null
          progress.value = 0
          isAudioRunning.value = true
          options.onStart?.(currentId.value as number)
          break
        case 'progress':
          progress.value = Math.floor((data.progress ?? 0) * 100)
          options.onProgress?.(progress.value)
          break
        case 'complete':
          options.onComplete?.(data.id)
          break
        case 'queueEmpty':
          console.log('触发队列为空事件 ')

          stopAudio()
          options.onQueueEmpty?.()
          break
        case 'modeChanged':
          outputMode.value = data.mode
          options.onModeChanged?.(outputMode.value)
          break
        case 'error':
          console.error('❌ 播放错误：', data)
          options.onError?.(data)
          break
      }
    })
  }

  onMounted(registerListener)
  onUnmounted(() => {
    stopAudio()
    plugin.release?.()
    plugin.onEvent = (() => {}) as any
  })
  watch(() => isAudioRunning.value, () => {
    console.error('✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅音频播放成功啦')
  })
  return {
    plugin,
    isAudioRunning,
    currentId,
    queueSize,
    progress,
    outputMode,
    playAudio, // ✅ 可接收单对象或数组
    stopAudio,
    toggleOutputMode,
  }
}
