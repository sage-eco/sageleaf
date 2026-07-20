<template>
  <div>
    <div class="flex items-start gap-3 p-3">
      <Button v-if="mode === 'page'" variant="ghost" @click="emit('close')">
        <ArrowLeft class="size-4" />
      </Button>
      <template v-else>
        <Button variant="ghost" size="icon" @click="emit('close')">
          <X class="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          @click="
            () => {
              emit('close')
              navigateTo(`/orgs/${id}`)
            }
          "
        >
          <Maximize2 class="size-4" />
        </Button>
      </template>
      <div class="flex-1">
        <h1 class="text-xl font-bold">{{ entity?.name ?? id }}</h1>
        <EntityMeta
          v-if="entity"
          :id="entity.id"
          :created-at="entity.createdAt"
          :updated-at="entity.updatedAt"
        />
      </div>
    </div>

    <div v-if="entity">
      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent class="flex gap-4">
          <div v-if="entity.avatarURL" class="shrink-0">
            <UiImage
              :src="entity.avatarURL"
              :width="20"
              :height="20"
              class="size-20 rounded-lg object-cover"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <div><span class="font-semibold">Name:</span> {{ entity.name }}</div>
            <div v-if="entity.slug">
              <span class="font-semibold">Slug:</span>
              <code class="ml-1 rounded bg-base-200 px-1.5 py-0.5 text-sm">{{ entity.slug }}</code>
            </div>
            <div v-if="entity.desc">
              <span class="font-semibold">Description:</span> {{ entity.desc }}
            </div>
            <div v-if="entity.websiteURL">
              <span class="font-semibold">Website:</span>
              <a
                :href="entity.websiteURL"
                target="_blank"
                rel="noopener noreferrer"
                class="ml-1 link link-primary"
              >
                {{ entity.websiteURL }}
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="flex flex-col gap-2">
            <li
              v-for="user in entity.users?.nodes ?? []"
              :key="user.id"
              class="flex items-center gap-3"
            >
              <div class="avatar avatar-placeholder">
                <div
                  class="w-8 rounded-full"
                  :class="user.avatarURL ? '' : 'bg-neutral text-neutral-content'"
                >
                  <img v-if="user.avatarURL" :src="user.avatarURL" :alt="user.name ?? ''" />
                  <span v-else class="text-xs">
                    {{ (user.name ?? '?').charAt(0).toUpperCase() }}
                  </span>
                </div>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-medium">{{ user.name }}</span>
                <span v-if="user.email" class="text-xs text-base-content/50">{{ user.email }}</span>
              </div>
            </li>
          </ul>
          <div v-if="!entity.users?.nodes?.length" class="text-sm opacity-60">No members</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="flex flex-col gap-3">
            <li
              v-for="entry in entity.history?.nodes ?? []"
              :key="entry.datetime"
              class="flex items-start gap-3 text-sm"
            >
              <div class="mt-0.5 shrink-0 text-xs text-base-content/50">
                {{ new Date(entry.datetime).toLocaleString() }}
              </div>
              <div class="flex flex-col gap-0.5">
                <div class="font-medium">{{ entry.user?.name }}</div>
                <div v-if="entry.changes?.name" class="text-xs text-base-content/60">
                  Name: {{ entry.changes.name }}
                </div>
                <div v-if="entry.changes?.desc" class="text-xs text-base-content/60">
                  Description updated
                </div>
                <div v-if="entry.changes?.websiteURL" class="text-xs text-base-content/60">
                  Website: {{ entry.changes.websiteURL }}
                </div>
              </div>
            </li>
          </ul>
          <div v-if="!entity.history?.nodes?.length" class="text-sm opacity-60">No history</div>
        </CardContent>
      </Card>
    </div>

    <div v-else class="flex justify-center p-8">
      <span class="loading loading-lg loading-spinner" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Maximize2, X } from '@lucide/vue'

import { graphql } from '~/gql'

const props = defineProps<{
  id: string
  mode?: 'page' | 'panel'
}>()

const emit = defineEmits<{ close: [] }>()

const detailQuery = graphql(`
  query OrgDetail($id: ID!) {
    org(id: $id) {
      id
      name
      slug
      desc
      avatarURL
      websiteURL
      createdAt
      updatedAt
      users(first: 50) {
        nodes {
          id
          name
          email
          avatarURL
        }
      }
      history(first: 20) {
        nodes {
          datetime
          user {
            id
            name
          }
          changes {
            name
            desc
            websiteURL
          }
        }
      }
    }
  }
`)

const { result } = useQuery(detailQuery, () => ({ id: props.id }))
const entity = computed(() => result.value?.org ?? null)
</script>
