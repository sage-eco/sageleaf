<template>
  <div class="relative min-h-screen bg-base-100">
    <NavIntentTopBar>
      <NavBackBubble class="static!" />
    </NavIntentTopBar>

    <!-- Scrollable Content -->
    <div class="pt-4">
      <!-- Hero Card -->
      <div class="px-4 pt-2 pb-6">
        <div
          class="flex w-full flex-col rounded-3xl border border-base-200 bg-base-100 p-5 shadow-[inset_0_4px_12px_rgba(0,0,0,0.15)]"
        >
          <!-- Top Row: MapPin icon and short address -->
          <div class="flex items-center gap-4">
            <div
              class="flex size-20 shrink-0 items-center justify-center rounded-sm bg-base-200 shadow-md"
            >
              <MapPinIcon :size="32" class="text-primary opacity-70" />
            </div>

            <div class="min-w-0 flex-1">
              <h1 class="line-clamp-2 text-base leading-tight font-bold">
                {{ data?.place?.name }}
              </h1>
              <p v-if="shortAddress" class="mt-1 line-clamp-1 text-sm opacity-50">
                {{ shortAddress }}
              </p>
              <p v-else class="mt-1 line-clamp-1 text-sm italic opacity-40">
                <T ns="frontend" key-name="place.noAddress" />
              </p>
            </div>
          </div>

          <!-- Bottom Row: Open in Maps button + feedback -->
          <div class="mt-4 space-y-2">
            <button
              v-if="data?.place?.location"
              type="button"
              class="block w-full"
              @click="openUrl(mapsLink(data.place.location))"
            >
              <Button class="w-full" variant="default">
                <T ns="frontend" key-name="place.openInMaps" />
                <ExternalLinkIcon :size="14" />
              </Button>
            </button>
            <div v-if="vars.id" class="-ml-1">
              <FeedbackVoteButtons
                :entity-name="FeedbackEntityName.Place"
                :entity-id="vars.id"
                :related-ids="{ placeId: vars.id }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="relative z-0 bg-base-100 pb-4">
        <!-- Description (optional) -->
        <div v-if="data?.place?.desc" class="px-4 pb-4">
          <p class="text-sm text-base-content/70">
            {{ data.place.desc }}
          </p>
        </div>

        <!-- Full Address block -->
        <div v-if="hasFullAddress" class="border-t border-base-200 px-4 pt-4 pb-4">
          <h3 class="text-xs font-semibold tracking-wider uppercase opacity-50">
            <T ns="frontend" key-name="place.address" />
          </h3>
          <div class="mt-2 text-sm text-base-content/70">
            <p v-if="data?.place?.address?.street">
              {{
                [data.place.address.housenumber, data.place.address.street]
                  .filter(Boolean)
                  .join(' ')
              }}
            </p>
            <p>
              {{
                [
                  data?.place?.address?.postcode,
                  data?.place?.address?.city,
                  data?.place?.address?.region,
                ]
                  .filter(Boolean)
                  .join(', ')
              }}
            </p>
            <p v-if="data?.place?.address?.country">
              {{ data.place.address.country }}
            </p>
          </div>
        </div>

        <!-- Tags -->
        <div
          v-if="data?.place?.tags?.nodes?.length"
          class="border-t border-base-200 px-4 pt-4 pb-4"
        >
          <h3 class="text-xs font-semibold tracking-wider uppercase opacity-50">
            <T ns="frontend" key-name="place.tags" />
          </h3>
          <div class="mt-2 flex flex-wrap gap-2">
            <Badge
              v-for="tag in data.place.tags.nodes"
              :key="tag.id"
              :style="
                tag.bgColor
                  ? { backgroundColor: tag.bgColor, color: '#fff', borderColor: tag.bgColor }
                  : undefined
              "
              class="rounded-full"
            >
              {{ tag.name }}
            </Badge>
          </div>
        </div>

        <!-- Organization -->
        <div v-if="data?.place?.org" class="border-t border-base-200 px-4 pt-4 pb-4">
          <h3 class="text-xs font-semibold tracking-wider uppercase opacity-50">
            <T ns="frontend" key-name="place.organization" />
          </h3>
          <NuxtLink
            :to="`/explore/orgs/${data.place.org.slug || data.place.org.id}`"
            class="mt-2 block"
          >
            <div
              class="flex items-center gap-3 rounded-2xl border border-base-200 bg-base-100 p-3 transition-colors hover:bg-base-200/50"
            >
              <div class="size-10 shrink-0 overflow-hidden rounded-full bg-base-200">
                <UiImage
                  v-if="data.place.org.avatarURL"
                  :src="data.place.org.avatarURL"
                  class="size-full"
                  fit="cover"
                  alt=""
                />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold">{{ data.place.org.name }}</p>
                <p v-if="data.place.org.desc" class="line-clamp-1 text-xs opacity-60">
                  {{ data.place.org.desc }}
                </p>
              </div>
            </div>
          </NuxtLink>
        </div>

        <!-- Related Places -->
        <PlaceRelatedDrawer
          :loading="loadingRelated"
          :related="relatedResult?.place?.related?.nodes"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExternalLink as ExternalLinkIcon, MapPin as MapPinIcon } from '@lucide/vue'
import { T } from '@tolgee/vue'
import { computed } from 'vue'

import { graphql } from '~/gql'
import { FeedbackEntityName } from '~/gql/types.generated'

const route = useRoute()

useTopbar(null)

const mapsLink = useMapsLink()
const { openUrl } = useOpenUrl()

const placeQuery = graphql(`
  query GetPlace($id: ID!) {
    place(id: $id) {
      id
      name
      desc
      address {
        housenumber
        street
        city
        region
        postcode
        country
      }
      location {
        latitude
        longitude
      }
      tags(first: 20) {
        nodes {
          id
          name
          image
          bgColor
        }
      }
      org {
        id
        name
        desc
        avatarURL
        slug
      }
    }
  }
`)

const placeRelatedQuery = graphql(`
  query GetPlaceRelated($id: ID!) {
    place(id: $id) {
      id
      related(limit: 10) {
        nodes {
          id
          name
          address {
            city
            region
          }
        }
      }
    }
  }
`)

const vars = {
  id: typeof route.params.id === 'string' ? route.params.id : route.params.id?.[0] || '',
}

const { result: data } = useQuery(placeQuery, vars)

const {
  result: relatedResult,
  load: loadRelated,
  loading: loadingRelated,
} = useLazyQuery(placeRelatedQuery, vars)

const shortAddress = computed(() => {
  const a = data.value?.place?.address
  if (!a) return ''
  return [a.city, a.region, a.country].filter(Boolean).join(', ')
})

const hasFullAddress = computed(() => {
  const a = data.value?.place?.address
  if (!a) return false
  return !!(a.street || a.housenumber || a.postcode || a.city || a.region || a.country)
})

const recentStore = useRecentStore()
onMounted(() => {
  recentStore.add({ id: vars.id, __typename: 'Place' })
  loadRelated()
})
</script>
