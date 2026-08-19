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
          <CardTitle class="flex items-center justify-between">
            <span>Variants</span>
            <GridPagerButtons
              :has-previous-page="variantsPager.hasPreviousPage.value"
              :has-next-page="variantsPager.hasNextPage.value"
              @prev="variantsPager.prevPage"
              @next="variantsPager.nextPage"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListVariant
              v-for="variant in variantsPager.nodes.value"
              :key="variant.id"
              :variant="variant"
              :on-row-click="() => panelStore.openPanel('variant', variant.id)"
            />
          </ul>
          <div v-if="!variantsPager.nodes.value.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span>Programs</span>
            <GridPagerButtons
              :has-previous-page="programsPager.hasPreviousPage.value"
              :has-next-page="programsPager.hasNextPage.value"
              @prev="programsPager.prevPage"
              @next="programsPager.nextPage"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListProgram
              v-for="program in programsPager.nodes.value"
              :key="program.id"
              :program="program"
              :on-row-click="() => panelStore.openPanel('program', program.id)"
            />
          </ul>
          <div v-if="!programsPager.nodes.value.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span>Places</span>
            <GridPagerButtons
              :has-previous-page="placesPager.hasPreviousPage.value"
              :has-next-page="placesPager.hasNextPage.value"
              @prev="placesPager.prevPage"
              @next="placesPager.nextPage"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListPlace
              v-for="place in placesPager.nodes.value"
              :key="place.id"
              :place="place"
              :on-row-click="() => panelStore.openPanel('place', place.id)"
            />
          </ul>
          <div v-if="!placesPager.nodes.value.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span>Processes</span>
            <GridPagerButtons
              :has-previous-page="processesPager.hasPreviousPage.value"
              :has-next-page="processesPager.hasNextPage.value"
              @prev="processesPager.prevPage"
              @next="processesPager.nextPage"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListProcess
              v-for="process in processesPager.nodes.value"
              :key="process.id"
              :process="process"
              :on-row-click="() => panelStore.openPanel('process', process.id)"
            />
          </ul>
          <div v-if="!processesPager.nodes.value.length" class="text-sm opacity-60">None</div>
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
import { useDetailPanelStore } from '~/stores/detail_panel_store'

const props = defineProps<{
  id: string
  mode?: 'page' | 'panel'
}>()

const emit = defineEmits<{ close: [] }>()

const panelStore = useDetailPanelStore()

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

const orgVariantsQuery = graphql(`
  query OrgVariants($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
    org(id: $id) {
      id
      variants(first: $first, last: $last, after: $after, before: $before) {
        nodes {
          id
          ...ListVariantFragment
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
`)
const variantsPager = useRelationPager(orgVariantsQuery, 'org', 'variants', () => props.id)

const orgPlacesQuery = graphql(`
  query OrgPlaces($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
    org(id: $id) {
      id
      places(first: $first, last: $last, after: $after, before: $before) {
        nodes {
          id
          ...ListPlaceFragment
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
`)
const placesPager = useRelationPager(orgPlacesQuery, 'org', 'places', () => props.id)

const orgProcessesQuery = graphql(`
  query OrgProcesses($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
    org(id: $id) {
      id
      processes(first: $first, last: $last, after: $after, before: $before) {
        nodes {
          id
          ...ListProcessFragment
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
`)
const processesPager = useRelationPager(orgProcessesQuery, 'org', 'processes', () => props.id)

const orgProgramsQuery = graphql(`
  query OrgPrograms($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
    org(id: $id) {
      id
      programs(first: $first, last: $last, after: $after, before: $before) {
        nodes {
          id
          ...ListProgramFragment
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
`)
const programsPager = useRelationPager(orgProgramsQuery, 'org', 'programs', () => props.id)
</script>
