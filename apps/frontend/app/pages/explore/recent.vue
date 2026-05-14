<template>
  <div class="flex justify-center">
    <div class="w-full max-w-2xl px-5 pt-4">
      <ul class="list rounded-box bg-base-200 shadow-md">
        <SearchRecentlyViewed />
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
useTopbar({ title: 'Recent', back: 'true' })
</script>
