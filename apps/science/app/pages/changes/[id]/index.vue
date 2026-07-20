<template>
  <ChangeDetail :id="id" mode="page" @close="router.back()" />
</template>

<script setup lang="ts">
const id = useRoute().params.id as string
const router = useRouter()
</script>
