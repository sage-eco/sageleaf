<template>
  <div>
    <div class="flex justify-center">
      <div class="w-full max-w-2xl p-5">
        <NuxtLink to="/explore/places">
          <Button variant="outline" class="mb-4 w-full">
            <MapIcon />
            View Map
          </Button>
        </NuxtLink>

        <!-- Recent -->
        <template v-if="recentItems.length > 0">
          <NuxtLink to="/explore/recent">
            <div class="flex items-center">
              <h2 class="py-3 text-xl font-bold">Recent</h2>
              <ArrowRight class="mx-4 font-bold text-neutral-700" />
            </div>
          </NuxtLink>
          <Carousel class="w-full" :opts="{ align: 'start' }">
            <CarouselContent class="ml-1">
              <CarouselItem
                v-for="item in recentItems"
                :key="item.id"
                class="basis-1/2 pl-1 md:basis-1/3"
              >
                <NuxtLink :to="recentLink(item.__typename, item.id)">
                  <div class="p-1">
                    <Card class="relative min-h-32">
                      <Badge
                        :variant="recentBadgeVariant(item.__typename)"
                        class="absolute top-0 right-0 z-1 rounded-l-none rounded-r-xl rounded-bl-none px-2 py-0.5 text-[10px] tracking-wide uppercase"
                      >
                        {{ formatRecentType(item.__typename) }}
                      </Badge>
                      <CardHeader class="p-4 pb-2">
                        <div class="flex flex-col items-start gap-2">
                          <div class="size-10 shrink-0 overflow-hidden rounded-xl bg-base-200">
                            <UiImage
                              v-if="item.imageURL"
                              class="size-full"
                              :src="item.imageURL"
                              fit="cover"
                              alt=""
                            />
                          </div>
                          <CardTitle class="line-clamp-2 text-sm">{{ item.name }}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent class="px-4 pb-3">
                        <span class="line-clamp-2 text-xs opacity-60">{{ item.desc }}</span>
                      </CardContent>
                    </Card>
                  </div>
                </NuxtLink>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </template>

        <!-- Items -->
        <NuxtLink to="/explore/items">
          <div class="flex items-center">
            <h2 class="py-3 text-xl font-bold">Items</h2>
            <ArrowRight class="mx-4 font-bold text-neutral-700" />
          </div>
        </NuxtLink>
        <Carousel class="w-full" :opts="{ align: 'start' }">
          <CarouselContent class="ml-1">
            <template v-if="itemsLoading && !itemsData">
              <CarouselItem v-for="n in 4" :key="n" class="basis-1/2 pl-1 md:basis-1/3">
                <div class="p-1">
                  <div class="min-h-32 w-full skeleton rounded-xl" />
                </div>
              </CarouselItem>
            </template>
            <CarouselItem
              v-for="item in itemsData?.items.nodes"
              :key="item.id"
              class="basis-1/2 pl-1 md:basis-1/3"
            >
              <NuxtLink :to="`/explore/items/${item.id}`">
                <div class="p-1">
                  <Card class="min-h-32">
                    <CardHeader class="p-4 pb-2">
                      <div class="flex flex-col items-start gap-2">
                        <div class="size-10 shrink-0 overflow-hidden rounded-xl bg-base-200">
                          <UiImage
                            v-if="item.imageURL"
                            class="size-full"
                            :src="item.imageURL"
                            fit="cover"
                            alt=""
                          />
                        </div>
                        <CardTitle class="line-clamp-2 text-sm">{{ item.name }}</CardTitle>
                      </div>
                    </CardHeader>
                  </Card>
                </div>
              </NuxtLink>
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        <!-- Programs -->
        <NuxtLink to="/explore/programs">
          <div class="flex items-center">
            <h2 class="py-3 text-xl font-bold">Programs</h2>
            <ArrowRight class="mx-4 font-bold text-neutral-700" />
          </div>
        </NuxtLink>
        <Carousel class="w-full" :opts="{ align: 'start' }">
          <CarouselContent class="ml-1">
            <template v-if="programsLoading && !programsData">
              <CarouselItem v-for="n in 4" :key="n" class="basis-1/2 pl-1 md:basis-1/3">
                <div class="p-1">
                  <div class="min-h-32 w-full skeleton rounded-xl" />
                </div>
              </CarouselItem>
            </template>
            <CarouselItem
              v-for="program in programsData?.programs.nodes"
              :key="program.id"
              class="basis-1/2 pl-1 md:basis-1/3"
            >
              <NuxtLink :to="`/explore/programs/${program.id}`">
                <div class="p-1">
                  <Card class="min-h-32">
                    <CardHeader class="p-4 pb-2">
                      <CardTitle class="line-clamp-2 text-sm">{{ program.name }}</CardTitle>
                      <p v-if="program.region?.name" class="text-xs opacity-50">
                        {{ program.region.name }}
                      </p>
                    </CardHeader>
                    <CardContent class="px-4 pb-3">
                      <span class="line-clamp-2 text-xs opacity-70">{{ program.desc }}</span>
                    </CardContent>
                  </Card>
                </div>
              </NuxtLink>
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        <!-- Categories -->
        <NuxtLink to="/explore/categories">
          <div class="flex items-center">
            <h2 class="py-3 text-xl font-bold">Categories</h2>
            <ArrowRight class="mx-4 font-bold text-neutral-700" />
          </div>
        </NuxtLink>
        <Carousel class="w-full" :opts="{ align: 'start' }">
          <CarouselContent class="ml-1">
            <template v-if="categoriesLoading && !categoriesData">
              <CarouselItem v-for="n in 4" :key="n" class="basis-1/2 pl-1 md:basis-1/3">
                <div class="p-1">
                  <div class="min-h-32 w-full skeleton rounded-xl" />
                </div>
              </CarouselItem>
            </template>
            <CarouselItem
              v-for="category in categoriesData?.categoryRoot.children.nodes"
              :key="category.id"
              class="basis-1/2 pl-1 md:basis-1/3 lg:basis-1/3"
            >
              <NuxtLink :to="`/explore/categories/${category.id}`">
                <div class="p-1">
                  <Card class="min-h-32">
                    <CardHeader class="p-4 pb-2">
                      <div class="flex flex-col items-start gap-2">
                        <div class="size-10 shrink-0 overflow-hidden rounded-xl bg-base-200">
                          <UiImage
                            v-if="category.imageURL"
                            class="size-full"
                            :src="category.imageURL"
                            fit="cover"
                            alt=""
                          />
                        </div>
                        <CardTitle>{{ category.name }}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent class="flex flex-col justify-center px-4 pb-3">
                      <span class="line-clamp-2 text-xs">{{ category.descShort }}</span>
                    </CardContent>
                  </Card>
                </div>
              </NuxtLink>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, Map as MapIcon } from '@lucide/vue'
import { useApolloClient } from '@vue/apollo-composable'
import { parse } from 'graphql'

import { graphql } from '~/gql'

useTopbar({ title: 'Explore' })

// ── Recent ────────────────────────────────────────────────────────────────────

type RecentItem = {
  id: string
  __typename: string
  name?: string
  imageURL?: string
  desc?: string
}

const TYPE_RESOLVER: Record<string, string> = {
  Category: 'category',
  Item: 'item',
  Variant: 'variant',
  Org: 'org',
  Place: 'place',
}
const TYPE_FIELDS: Record<string, string> = {
  Category: 'id name descShort imageURL',
  Item: 'id name desc imageURL',
  Variant: 'id name desc imageURL',
  Org: 'id name desc avatarURL',
  Place: 'id name desc',
}

const { resolveClient } = useApolloClient()
const recentStore = useRecentStore()
const recentItems = ref<RecentItem[]>([])

async function loadRecent() {
  const entries = recentStore.items
  if (entries.length === 0) {
    recentItems.value = []
    return
  }

  const varDefs = entries.map((_, i) => `$id${i}: ID!`).join(', ')
  const fields = entries
    .map((e, i) => {
      const resolver = TYPE_RESOLVER[e.__typename] ?? e.__typename.toLowerCase()
      const typeFields = TYPE_FIELDS[e.__typename] ?? 'id name'
      return `entry_${i}: ${resolver}(id: $id${i}) { ${typeFields} }`
    })
    .join('\n')
  const variables = Object.fromEntries(entries.map((e, i) => [`id${i}`, e.id]))
  const doc = parse(`query ExploreRecentFetch(${varDefs}) { ${fields} }`)
  const result = await resolveClient().query({ query: doc, variables, fetchPolicy: 'cache-first' })

  recentItems.value = entries
    .map((e, i) => {
      const data = result.data[`entry_${i}`]
      if (!data) return null
      return {
        __typename: e.__typename,
        ...data,
        imageURL: data.avatarURL ?? data.imageURL,
      } as RecentItem
    })
    .filter((x): x is RecentItem => x !== null)
    .slice(0, 8)
}

onMounted(async () => {
  await recentStore.load()
  await loadRecent()
})
watch(() => recentStore.items, loadRecent)

const recentLink = (type: string, id: string) => {
  switch (type) {
    case 'Category':
      return `/explore/categories/${id}`
    case 'Item':
      return `/explore/items/${id}`
    case 'Variant':
      return `/explore/variants/${id}`
    case 'Org':
      return `/explore/orgs/${id}`
    case 'Place':
      return `/places/${id}`
    default:
      return '#'
  }
}

const recentBadgeVariant = (type: string) => {
  switch (type) {
    case 'Category':
      return 'blue'
    case 'Variant':
      return 'teal'
    case 'Item':
      return 'yellow'
    case 'Org':
      return 'gray'
    case 'Place':
      return 'red'
    default:
      return 'ghost'
  }
}

const formatRecentType = (type: string) => {
  switch (type) {
    case 'Variant':
      return 'Product'
    case 'Org':
      return 'Organization'
    default:
      return type
  }
}

// ── Items ─────────────────────────────────────────────────────────────────────

const itemsQuery = graphql(`
  query ExploreGetItems($first: Int!) {
    items(first: $first) {
      nodes {
        id
        name
        imageURL
      }
    }
  }
`)
const { result: itemsData, loading: itemsLoading } = useQuery(itemsQuery, { first: 8 })

// ── Programs ──────────────────────────────────────────────────────────────────

const programsQuery = graphql(`
  query ExploreGetPrograms($first: Int!) {
    programs(first: $first) {
      nodes {
        id
        name
        desc
        region {
          name
        }
      }
    }
  }
`)
const { result: programsData, loading: programsLoading } = useQuery(programsQuery, { first: 8 })

// ── Categories ────────────────────────────────────────────────────────────────

const categoriesQuery = graphql(`
  query GetCategories {
    categoryRoot {
      children {
        nodes {
          id
          name
          descShort
          desc
          imageURL
        }
      }
    }
  }
`)
const { result: categoriesData, loading: categoriesLoading } = useQuery(categoriesQuery)
</script>
