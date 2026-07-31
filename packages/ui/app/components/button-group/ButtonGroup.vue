<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '../lib/utils'
import type { ButtonGroupVariants } from './types'
import { buttonGroupVariants } from './types'

interface Props {
  orientation?: ButtonGroupVariants['orientation']
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'horizontal',
  class: undefined,
})
</script>

<template>
  <div
    role="group"
    :class="cn(buttonGroupVariants({ orientation: props.orientation }), props.class)"
  >
    <slot />
  </div>
</template>
