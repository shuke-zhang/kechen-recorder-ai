import { ref } from 'vue'

/**
 * @description 多次点击触发
 * @param options
 * @param options.targetCount 连续点击次数（默认5）
 * @param options.interval 最大时间间隔（默认500ms）
 * @param options.onTrigger 达成点击后触发的回调
 * @example const { handleMultiClick } = useMultiClickTrigger({
  onTrigger: () => {
    // 点击5次后触发的回调
  },
})
 */
export function useMultiClickTrigger(options: {
  targetCount?: number // 连续点击次数（默认5）
  interval?: number // 最大时间间隔（默认500ms）
  onTrigger: () => void // 达成点击后触发的回调
}) {
  const {
    targetCount = 5,
    interval = 500,
    onTrigger,
  } = options

  const clickNum = ref(0)
  const lastTapTime = ref(0)

  function handleMultiClick(event: any) {
    
    const curTime = event.timeStamp || Date.now()
    const lastTime = lastTapTime.value

    if (curTime - lastTime < interval) {
      clickNum.value += 1
    }
    else {
      clickNum.value = 1
    }

    if (clickNum.value === targetCount) {
      clickNum.value = 0
      onTrigger()
    }

    lastTapTime.value = curTime
  }

  return {
    handleMultiClick,
    clickNum,
    reset: () => {
      clickNum.value = 0
      lastTapTime.value = 0
    },
  }
}
