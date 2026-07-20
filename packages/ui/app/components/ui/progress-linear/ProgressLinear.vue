<template>
  <div
    :class="cn(progressLinearVariants({ rounded }), bgColor, $attrs.class as string)"
    :style="{ height }"
  >
    <div v-if="indeterminate" class="progress-linear-indeterminate absolute inset-y-0 bg-current" />
    <div
      v-else
      class="absolute inset-y-0 left-0 bg-current transition-all"
      :style="{ width: `${modelValue}%` }"
    />
  </div>
</template>

<script setup lang="ts">
import { cn } from '../../lib/utils'
import { progressLinearVariants } from './progress-linear.variants'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    modelValue?: number
    indeterminate?: boolean
    height?: string
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
    bgColor?: string
  }>(),
  {
    modelValue: 0,
    indeterminate: false,
    height: '4px',
    rounded: 'full',
    bgColor: 'bg-base-200',
  },
)
</script>

<style scoped>
.progress-linear-indeterminate {
  animation: progress-linear-indeterminate 1.5s infinite ease-in-out;
  width: 40%;
}

@keyframes progress-linear-indeterminate {
  0% {
    left: -40%;
  }
  100% {
    left: 100%;
  }
}
</style>
