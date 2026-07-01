<template>
  <Transition name="pl-fade">
    <UiProgressLinear
      v-if="isActive"
      class="fixed inset-x-0 top-0 z-[9999] text-primary"
      :indeterminate="true"
      height="3px"
      :rounded="'none'"
      bg-color="bg-transparent"
    />
  </Transition>
</template>

<script setup lang="ts">
const isNavigating = ref(false)
const { isLoading: isGqlLoading } = useGqlLoadingState()
const isActive = computed(() => isNavigating.value || isGqlLoading.value)
const router = useRouter()
let unBefore: (() => void) | null = null
let unAfter: (() => void) | null = null

onMounted(() => {
  unBefore = router.beforeEach(() => {
    isNavigating.value = true
  })
  unAfter = router.afterEach(() => {
    isNavigating.value = false
  })
})

onUnmounted(() => {
  unBefore?.()
  unAfter?.()
})
</script>

<style scoped>
.pl-fade-leave-active {
  transition: opacity 300ms ease;
}
.pl-fade-leave-to {
  opacity: 0;
}
</style>
