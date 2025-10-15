declare module 'plugin_shuke' {
  /** 输出模式 */
  export type OutputMode = 'speaker' | 'earpiece' | 'bluetooth'

  /** 插件事件类型 */
  export type PluginEventType =
    | 'ready'
    | 'queued'
    | 'start'
    | 'progress'
    | 'complete'
    | 'queueEmpty'
    | 'modeChanged'
    | 'error'
    | 'released'

  /** 插件事件结构 */
  export interface PluginEvent<T = any> {
    type: PluginEventType
    data?: T
  }

  /** 播放进度数据 */
  export interface ProgressData {
    id: string
    progress: number
    positionMs: number
    durationMs: number
  }

  /** 播放错误信息 */
  export interface ErrorData {
    id?: string
    message: string
  }

  /** 插件主体接口 */
  export interface PluginShuke {
    /** 注册事件监听 */
    onEvent: (callback: (event: PluginEvent) => void) => void

    /** 添加播放任务 */
    addTask: (
      id: string,
      base64: string,
      callback?: (result: any) => void
    ) => void

    /** 清空任务队列 / 停止播放 */
    clear: () => void

    /** 设置输出模式 */
    setOutputMode: (
      mode: OutputMode,
      callback?: (result: any) => void
    ) => void

    /** 释放播放器资源 */
    release: () => void
  }

  /** 导出默认插件对象（通过 uni.requireNativePlugin 调用） */
  const plugin: PluginShuke
  export default plugin
}
