<script  lang="ts">
import type { PropType } from 'vue'
import { computed, defineComponent } from 'vue'
import type { IconFontType } from './iconfont'

import {
  createStringProp,
  getNumericValue,
} from '@/utils/helpers'

export default defineComponent({
  options: {
    virtualHost: true,
  },
})
</script>

<script lang="ts" setup>
const props = defineProps({
  name: {
    type: String as PropType<IconFontType>,
    required: true,
  },
  color: createStringProp<string>('inherit'),
  /**
   * 纯数字单位是 rpx 默认32rpx
   */
  size: {
    type: [Number, String],
    default: 32,
  },
})
const emit = defineEmits(['click'])

const iconSize = computed(() => isPad ? `${Number(props.size) / 2}px` : getNumericValue(props.size))
function handleClick() {
  emit('click')
}
</script>

<template>
  <text
    :style="{
      'color': color,
      'font-size': iconSize,
      'line-height': 'normal',
    }"
    class="iconfont"
    :class="[`icon-${name}`]"
    @click="handleClick"
  />
</template>

<style lang="scss">
@import './iconfont.css';
</style>
