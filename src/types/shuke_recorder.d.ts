/**
 * @file shuke-recorder.d.ts
 * @description UniApp 原生插件 shuke_recorder 的类型声明
 * @usage
 * ```ts
 * const recorder = uni.requireNativePlugin('shuke_recorder') as ShukeRecorderPlugin
 * recorder.requestPermission(res => console.log(res.granted))
 * recorder.startRecord({ sampleRate: 16000, enableAEC: true }, console.log)
 * ```
 */

/**
 * 权限检查结果
 */
interface RecorderPermissionResult {
  /** 是否成功调用 */
  ok: boolean
  /** 是否已授予权限 */
  granted: boolean
  /** 错误信息（若有） */
  msg?: string
}

/**
 * 路由/设备信息
 */
interface RecorderRouteInfo {
  /** 信息前缀（如 "▶️ 开始录音" / "🔄 路由变更"） */
  label?: string
  /** 设备类型名（内置麦克风 / 蓝牙等） */
  typeName?: string
  /** 设备类型常量 */
  deviceType?: number
  /** 设备 ID */
  deviceId?: number
  /** 产品名称 */
  productName?: string
  /** 设备地址（可能为空） */
  address?: string
  /** 当前采样率 */
  sampleRate?: number
  /** 当前通道数 */
  channels?: number
  /** PCM 编码格式（如 2=PCM_16BIT） */
  format?: number
}

/**
 * startRecord 参数
 */
interface RecorderStartParams {
  /** 录音类型（自定义标识） */
  type?: string
  /** 采样率（默认 16000） */
  sampleRate?: number
  /** 启用回声消除 */
  enableAEC?: boolean
  /** 启用降噪 */
  enableNS?: boolean
  /** 启用自动增益 */
  enableAGC?: boolean
}

/**
 * 各种事件回调类型
 */
interface RecorderEventStart {
  event: 'start'
}

interface RecorderEventStop {
  event: 'stop'
}

interface RecorderEventError {
  event: 'error'
  message: string
}

interface RecorderEventProcess {
  event: 'process'
  /** 实时音量（0~100） */
  volume: number
  /** 录音时长（毫秒） */
  duration: number
  /** 当前采样率 */
  sampleRate: number
  /** 第一帧音频 PCM 数据（JSON对象数组） */
  buffers?: Record<string, number>[]
}

interface RecorderEventRoute {
  event: 'route'
  /** 当前音频输入设备信息 */
  data: RecorderRouteInfo
}

/**
 * 录音事件的联合类型
 */
type RecorderEvent =
  | RecorderEventStart
  | RecorderEventStop
  | RecorderEventError
  | RecorderEventProcess
  | RecorderEventRoute

/**
 * 回调函数类型
 */
type RecorderCallback<T = any> = (res: T) => void

/**
 * 🎤 ShukeRecorderPlugin 插件接口定义
 */
interface ShukeRecorderPlugin {
  /**
   * 请求录音权限
   * @param cb 回调结果 { ok, granted }
   * @example
   * ```ts
   * recorder.requestPermission(res => {
   *   if (res.granted) console.log('已授权')
   * })
   * ```
   */
  requestPermission: (cb: RecorderCallback<RecorderPermissionResult>) => void

  /**
   * 检查是否已获得录音权限
   * @param cb 回调结果 { ok, granted }
   */
  hasPermission: (cb: RecorderCallback<RecorderPermissionResult>) => void

  /**
   * 检查权限（别名）
   * @param cb 回调结果 { ok, granted }
   */
  checkPermission: (cb: RecorderCallback<RecorderPermissionResult>) => void

  /**
   * 开始录音
   * @param params 参数配置
   * @param cb 回调函数（持续触发事件流）
   * @example
   * ```ts
   * recorder.startRecord({
   *   sampleRate: 16000,
   *   enableAEC: true,
   *   enableNS: true,
   *   enableAGC: true,
   * }, (event) => {
   *   switch (event.event) {
   *     case 'process': console.log(event.volume, event.duration); break
   *     case 'error': console.error(event.message); break
   *   }
   * })
   * ```
   */
  startRecord: (params: RecorderStartParams, cb: RecorderCallback<RecorderEvent>) => void

  /**
   * 停止录音
   * @param cb 停止完成后的回调 { ok: true }
   */
  stopRecord: (cb?: RecorderCallback<{ ok: boolean }>) => void

  /**
   * 将 Base64 数据保存为本地文件
   */
  uniSaveLocalFile: (
    name: string,
    base64Data: string,
    cb?: (res: { ok: boolean, msg?: string, path?: string }) => void,
  ) => void

  /**
   * 删除本地文件
   */
  uniRemoveLocalFile: (
    path: string,
    cb?: (res: { ok: boolean, msg?: string }) => void,
  ) => void

}
