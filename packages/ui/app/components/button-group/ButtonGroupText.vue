<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'

import { cn } from '../lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
  class: undefined,
})
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="
      cn(
        'bg-muted flex items-center gap-2 rounded-md px-4 text-sm font-medium shadow-sm',
        props.class,
      )
    "
  >
    <slot />
  </Primitive>
</template>
