<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '../lib/utils'

interface Props {
  orientation?: 'horizontal' | 'vertical'
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'vertical',
  class: undefined,
})
</script>

<template>
  <Separator
    :orientation="props.orientation"
    :class="
      cn('bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto', props.class)
    "
  />
</template>
