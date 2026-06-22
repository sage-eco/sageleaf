<script setup lang="ts">
import { BoxIcon, Building2Icon, CheckIcon, MapPinIcon, PackageIcon, TagsIcon } from '@lucide/vue'
import { T } from '@tolgee/vue'
import type { Component } from 'vue'

import type { SearchType as SearchTypeType } from '~/gql/graphql'
import { SearchType } from '~/gql/graphql'

const isOpen = defineModel<boolean>('open', { default: false })
const selected = defineModel<Set<SearchTypeType>>('selected', { default: () => new Set() })

// Local pending state for unsaved drawer edits; reset on open, committed on Apply.
const pending = ref(new Set<SearchTypeType>())

watch(isOpen, (open) => {
  if (open) pending.value = new Set(selected.value)
})

function toggle(t: SearchTypeType) {
  const next = new Set(pending.value)
  if (next.has(t)) next.delete(t)
  else next.add(t)
  pending.value = next
}

function clear() {
  pending.value = new Set()
}

function apply() {
  selected.value = new Set(pending.value)
  isOpen.value = false
}

type TypeEntry = {
  id: SearchTypeType
  icon: Component
}

const TYPES: TypeEntry[] = [
  { id: SearchType.Category, icon: BoxIcon },
  { id: SearchType.Item, icon: PackageIcon },
  { id: SearchType.Variant, icon: TagsIcon },
  { id: SearchType.Org, icon: Building2Icon },
  { id: SearchType.Place, icon: MapPinIcon },
]
</script>

<template>
  <Drawer v-model:open="isOpen">
    <DrawerContent class="flex max-h-[85vh] flex-col">
      <DrawerHeader class="flex flex-row items-center justify-between gap-2">
        <DrawerTitle>
          <T ns="frontend" key-name="search.filter.drawer.title" />
        </DrawerTitle>
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" @click="clear">
            <T ns="frontend" key-name="search.filter.drawer.clear" />
          </Button>
          <Button size="sm" @click="apply">
            <T ns="frontend" key-name="search.filter.drawer.apply" />
          </Button>
        </div>
      </DrawerHeader>
      <div class="flex-1 overflow-y-auto px-4 pb-8">
        <ul class="space-y-1">
          <li v-for="t in TYPES" :key="t.id">
            <button
              type="button"
              :aria-pressed="pending.has(t.id)"
              :class="[
                'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors',
                pending.has(t.id) ? 'bg-secondary/10' : 'hover:bg-base-200 active:bg-base-300',
              ]"
              @click="toggle(t.id)"
            >
              <span
                :class="[
                  'flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
                  pending.has(t.id)
                    ? 'border-secondary bg-secondary text-secondary-content'
                    : 'border-base-300 bg-transparent',
                ]"
              >
                <CheckIcon v-if="pending.has(t.id)" :size="14" />
              </span>
              <component :is="t.icon" :size="18" class="shrink-0 opacity-70" />
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium">
                  <T
                    v-if="t.id === SearchType.Category"
                    ns="frontend"
                    key-name="search.filter.types.category.name"
                  />
                  <T
                    v-else-if="t.id === SearchType.Item"
                    ns="frontend"
                    key-name="search.filter.types.item.name"
                  />
                  <T
                    v-else-if="t.id === SearchType.Variant"
                    ns="frontend"
                    key-name="search.filter.types.product.name"
                  />
                  <T
                    v-else-if="t.id === SearchType.Org"
                    ns="frontend"
                    key-name="search.filter.types.org.name"
                  />
                  <T v-else ns="frontend" key-name="search.filter.types.place.name" />
                </div>
                <div class="text-xs opacity-60">
                  <T
                    v-if="t.id === SearchType.Category"
                    ns="frontend"
                    key-name="search.filter.types.category.desc"
                  />
                  <T
                    v-else-if="t.id === SearchType.Item"
                    ns="frontend"
                    key-name="search.filter.types.item.desc"
                  />
                  <T
                    v-else-if="t.id === SearchType.Variant"
                    ns="frontend"
                    key-name="search.filter.types.product.desc"
                  />
                  <T
                    v-else-if="t.id === SearchType.Org"
                    ns="frontend"
                    key-name="search.filter.types.org.desc"
                  />
                  <T v-else ns="frontend" key-name="search.filter.types.place.desc" />
                </div>
              </div>
            </button>
          </li>
        </ul>
      </div>
    </DrawerContent>
  </Drawer>
</template>
