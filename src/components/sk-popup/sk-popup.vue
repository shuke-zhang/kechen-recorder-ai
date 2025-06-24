<script lang="ts">
import type { UniPopupInstance, UniPopupProps } from '@uni-helper/uni-ui-types'
import type { PropType } from 'vue'

import {
  defineComponent,
  nextTick,
  ref,
  watch,
} from 'vue'

export default defineComponent({
  options: {
    virtualHost: true,
  },
})
</script>

<script setup lang="ts">
const props = defineProps({
  /**
   * @description 否显示
   */
  modelValue: {
    type: Boolean,
    default: false,
  },
  // animation: {
  //   type: Boolean,
  //   default: true,
  // },
  /**
   * 弹出方式
   *
   * top 顶部弹出
   *
   * center 居中弹出
   *
   * bottom 底部弹出
   *
   * left 左侧弹出
   *
   * right 右侧弹出
   *
   * message 预置样式，消息提示
   *
   * dialog 预置样式，对话框
   *
   * share 预置样式，底部弹出分享
   *
   * 默认为 center
   */
  type: {
    type: String as PropType<UniPopupProps['type']>,
    default: () => 'center',
  },
  /**
   * 是否点击遮罩关闭
   */
  isMaskClick: {
    type: Boolean,
    default: true,
  },
  /**
   * 蒙版颜色
   */
  maskBackgroundColor: {
    type: String,
    default: () => 'rgba(0,0,0,0.4)',
  },
  /**
   * 背景颜色
   */
  backgroundColor: {
    type: String,
  },

})
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: Parameters<Required<UniPopupInstance>['onChange']>[0]): void
  (e: 'maskClick'): void
}>()

const show = ref(false)
// const style = ref<CSSProperties>({
//   // transform: props.type == 'bottom' ? 'translateY(100%)' : 'scale(1.1)',
//   // opacity: props.type == 'bottom' ? '1' : '0',
//   animationName: 'none',
// });
const animation = ref(false)
// const maskBg = ref('rgba(0, 0, 0, 0)');
watch(
  () => props.modelValue,
  () => {
    if (props.modelValue === true) {
      animation.value = true
      // style.value.animationName = 'none';
      // style.value.transform = props.type == 'bottom' ? 'translateY(100%)' : 'scale(1.1)';
      nextTick(() => {
        const t = setTimeout(() => {
          show.value = true
          clearTimeout(t)
        }, 100)
        // style.value.animationName = `${props.type}-show`;
        // const t = setTimeout(() => {
        //   clearTimeout(t);
        //   // style.value.transform = props.type == 'bottom' ? 'translateY(0%)' : 'scale(1)';
        //   style.value.opacity = '1';
        //   maskBg.value = 'rgba(0, 0, 0, .4)';
        // }, 999);
      })
    }
    else {
      // style.value.animationName = `${props.type}-hide`;
      // style.value.transform = props.type == 'bottom' ? 'translateY(0%)' : 'scale(1)';
      animation.value = false
      const t = setTimeout(() => {
        clearTimeout(t)
        show.value = false
        // style.value.transform = props.type == 'bottom' ? 'scale(1)' : 'translateY(0%)';
        // style.value.opacity = '0';
        // maskBg.value = 'rgba(0, 0, 0, 0)';
        // style.value.animationName = 'none';
      }, 300)
    }
  },
  {
    immediate: true,
  },
)

function close() {
  if (props.isMaskClick) {
    emit('update:modelValue', false)
  }
}

function handleStop() {
  return null
}
</script>

<template>
  <!-- #ifdef MP-WEIXIN -->
  <root-portal enable>
    <!-- #endif -->
    <view
      v-show="show"
      class="popup-container"
      :class="type"
    >
      <view
        v-if="type !== 'center'"
        class="popup-mask"
        :class="{ show: animation }"
        :style="{ 'background-color': maskBackgroundColor }"
        @click="isMaskClick ? close() : void 0"
        @touchmove.stop.prevent="handleStop"
      />

      <view
        class="popup-wrapper-fixed"
        :class="{ show: animation }"
        @touchmove.stop.prevent="handleStop"
      >
        <view
          v-if="type === 'center'"
          class="popup-mask"
          :class="{ show: animation }"
          :style="{ 'background-color': maskBackgroundColor }"
          @click="isMaskClick ? close() : void 0"
          @touchmove.stop.prevent="handleStop"
        />
        <view
          class="popup-wrapper"
          :style="{ backgroundColor }"
        >
          <slot />
        </view>
      </view>
    </view>
  <!-- #ifdef MP-WEIXIN -->
  </root-portal>
  <!-- #endif -->
</template>

<style lang="scss">
/* ---------- 1. 蒙版动画 ---------- */
@keyframes mask-show {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes mask-hide {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* ---------- 2. 弹出动画 ---------- */
@keyframes top-show {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(0);
  }
}
@keyframes top-hide {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-100%);
  }
}

@keyframes bottom-show {
  0% {
    transform: translateY(100%);
  }
  100% {
    transform: translateY(0);
  }
}
@keyframes bottom-hide {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(100%);
  }
}

@keyframes left-show {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(0);
  }
}
@keyframes left-hide {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}

@keyframes right-show {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(0);
  }
}
@keyframes right-hide {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes center-show {
  0% {
    transform: scale(1.1);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes center-hide {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.1);
    opacity: 0;
  }
}

/* ---------- 3. 容器基础样式 ---------- */
.popup-container {
  position: fixed;
  inset: 0;
  z-index: 99;
}

/* ---------- 4. 各方向的弹出定位 + 动画绑定 ---------- */
/* bottom */
.popup-container.bottom .popup-wrapper-fixed {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  &.show {
    animation-name: bottom-show;
  }
  &:not(.show) {
    animation-name: bottom-hide;
  }
}

/* top */
.popup-container.top .popup-wrapper-fixed {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  height: auto; /* 可改为固定高度如 height: 40% */
  &.show {
    animation-name: top-show;
  }
  &:not(.show) {
    animation-name: top-hide;
  }
}

/* left */
.popup-container.left .popup-wrapper-fixed {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  height: 100%;
  &.show {
    animation-name: left-show;
  }
  &:not(.show) {
    animation-name: left-hide;
  }
}

/* right */
.popup-container.right .popup-wrapper-fixed {
  background: red;
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  height: 100%;
  &.show {
    animation-name: right-show;
  }
  &:not(.show) {
    animation-name: right-hide;
  }
}

/* center */
.popup-container.center .popup-wrapper-fixed {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  &.show {
    animation-name: center-show;
  }
  &:not(.show) {
    animation-name: center-hide;
  }
}
.popup-container.center .popup-wrapper {
  transform: translateY(-5vh); /* 可微调居中偏移 */
}

/* ---------- 5. 公共动画属性 ---------- */
.popup-wrapper-fixed {
  animation-duration: 300ms;
  animation-timing-function: ease-in-out;
  animation-fill-mode: forwards;
  z-index: 1;
}

.popup-mask {
  position: fixed;
  inset: 0;
  z-index: 0;
  animation-duration: 300ms;
  animation-timing-function: ease-in-out;
  animation-fill-mode: forwards;

  &.show {
    animation-name: mask-show;
  }
  &:not(.show) {
    animation-name: mask-hide;
  }
}

.popup-wrapper {
  position: relative;
  z-index: 2;
}
</style>

<!-- <style lang="scss">
/* ---------- 1. 通用蒙版动画 ---------- */
@keyframes mask-show {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
@keyframes mask-hide {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* ---------- 2. 方向动画 ---------- */
/* top */
@keyframes top-show {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(0);
  }
}
@keyframes top-hide {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-100%);
  }
}

/* bottom */
@keyframes bottom-show {
  0% {
    transform: translateY(100%);
  }
  100% {
    transform: translateY(0);
  }
}
@keyframes bottom-hide {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(100%);
  }
}

/* left / right */
@keyframes left-show {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(0);
  }
}
@keyframes left-hide {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}

@keyframes right-show {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(0);
  }
}
@keyframes right-hide {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(100%);
  }
}

/* center */
@keyframes center-show {
  0% {
    transform: scale(1.1);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes center-hide {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.1);
    opacity: 0;
  }
}

/* ---------- 3. 容器 ---------- */
.popup-container {
  position: fixed;
  inset: 0;
  z-index: 99;

  /* bottom */
  &.bottom .popup-wrapper-fixed {
    left: 0;
    right: 0;
    bottom: 0;
    &.show {
      animation-name: bottom-show;
    }
    &:not(.show) {
      animation-name: bottom-hide;
    }
  }

  /* top */
  &.top .popup-wrapper-fixed {
    left: 0;
    right: 0;
    top: 0;
    &.show {
      animation-name: top-show;
    }
    &:not(.show) {
      animation-name: top-hide;
    }
  }

  /* left */
  &.left .popup-wrapper-fixed {
    top: 0;
    bottom: 0;
    left: 0;
    width: 80%; /* 你想要的宽度，自行调整 */
    &.show {
      animation-name: left-show;
    }
    &:not(.show) {
      animation-name: left-hide;
    }
  }

  /* right */
  &.right .popup-wrapper-fixed {
    top: 0;
    bottom: 0;
    right: 0;
    width: 80%;
    &.show {
      animation-name: right-show;
    }
    &:not(.show) {
      animation-name: right-hide;
    }
  }

  /* center */
  &.center .popup-wrapper-fixed {
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    &.show {
      animation-name: center-show;
    }
    &:not(.show) {
      animation-name: center-hide;
    }
  }

  &.center .popup-wrapper {
    transform: translateY(-5vh);
  }
}
.popup-container {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 99;

  &.bottom {
    .popup-wrapper-fixed {
      left: 0;
      right: 0;
      bottom: 0;

      &:not(.show) {
        animation-name: bottom-hide;
      }

      &.show {
        animation-name: bottom-show;
      }
    }
  }

  &.center {
    .popup-wrapper-fixed {
      display: flex;
      align-items: center;
      justify-content: center;
      left: 0;
      right: 0;
      bottom: 0;
      top: 0;
      z-index: 99;

      &:not(.show) {
        animation-name: center-hide;
      }

      &.show {
        animation-name: center-show;
      }
    }

    .popup-wrapper {
      transform: translateY(-5vh);
    }
  }
  &.top {
    .popup-wrapper-fixed {
      left: 0;
      top: 0;
      bottom: 0;
      &:not(.show) {
        animation-name: top-hide;
      }

      &.show {
        animation-name: top-show;
      }
    }
  }
  &.right {
    .popup-wrapper-fixed {
      top: 0;
      right: 0;
      bottom: 0;

      &:not(.show) {
        animation-name: right-hide;
      }

      &.show {
        animation-name: right-show;
      }
    }
  }
  &.left {
    .popup-wrapper-fixed {
      left: 0;
      top: 0;
      bottom: 0;

      &:not(.show) {
        animation-name: left-hide;
      }

      &.show {
        animation-name: left-show;
      }
    }
  }
  &.top {
    .popup-wrapper-fixed {
      left: 0;
      right: 0;
      top: 0;

      &:not(.show) {
        animation-name: top-hide;
      }

      &.show {
        animation-name: top-show;
      }
    }
  }
}

.popup-wrapper-fixed {
  position: fixed;
  animation-duration: 300ms;
  // animation-duration: 3s;
  animation-timing-function: ease-in-out;
  animation-fill-mode: forwards;
}

.popup-mask {
  position: fixed;
  z-index: 0;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  animation-duration: 300ms;

  animation-timing-function: ease-in-out;
  animation-fill-mode: forwards;

  &:not(.show) {
    animation-name: mask-hide;
  }

  &.show {
    animation-name: mask-show;
  }
}

.popup-wrapper {
  z-index: 1;
  position: relative;
}
</style> -->
