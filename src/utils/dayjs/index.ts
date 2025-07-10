import dayjs from 'dayjs'

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
