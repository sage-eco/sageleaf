<template>
  <div class="flex justify-center">
    <div class="w-full max-w-2xl p-5">
      <!-- Hero -->
      <div class="mb-8 flex flex-col gap-2">
        <h1 class="text-2xl font-bold">
          <T ns="frontend" key-name="contribute.hero.title" />
        </h1>
        <p class="text-base-content/60"><T ns="frontend" key-name="contribute.hero.subtitle" /></p>
      </div>

      <!-- Locked feature cards 2×2 grid -->
      <div class="mb-8 grid grid-cols-2 gap-3">
        <div class="relative overflow-hidden rounded-2xl bg-base-200 p-4 opacity-60">
          <Pencil class="mb-2 h-5 w-5 text-base-content/40" />
          <p class="text-sm font-medium">
            <T ns="frontend" key-name="contribute.features.suggestEdits" />
          </p>
          <div class="pointer-events-none absolute inset-0" />
        </div>
        <div class="relative overflow-hidden rounded-2xl bg-base-200 p-4 opacity-60">
          <MapPin class="mb-2 h-5 w-5 text-base-content/40" />
          <p class="text-sm font-medium">
            <T ns="frontend" key-name="contribute.features.findEvents" />
          </p>
          <div class="pointer-events-none absolute inset-0" />
        </div>
        <div class="relative overflow-hidden rounded-2xl bg-base-200 p-4 opacity-60">
          <CalendarPlus class="mb-2 h-5 w-5 text-base-content/40" />
          <p class="text-sm font-medium">
            <T ns="frontend" key-name="contribute.features.addEvents" />
          </p>
          <div class="pointer-events-none absolute inset-0" />
        </div>
        <div class="relative overflow-hidden rounded-2xl bg-base-200 p-4 opacity-60">
          <Camera class="mb-2 h-5 w-5 text-base-content/40" />
          <p class="text-sm font-medium">
            <T ns="frontend" key-name="contribute.features.uploadPhotos" />
          </p>
          <div class="pointer-events-none absolute inset-0" />
        </div>
      </div>

      <!-- Related Projects carousel -->
      <div v-if="projectFeed?.feed.nodes?.length" class="mb-8">
        <h2 class="mb-3 text-xl font-bold">
          <T ns="frontend" key-name="contribute.relatedProjects" />
        </h2>
        <Carousel class="w-full" :opts="{ align: 'start' }">
          <CarouselContent class="ml-1">
            <CarouselItem
              v-for="item in projectFeed.feed.nodes"
              :key="item.id"
              class="basis-4/5 pl-1 md:basis-1/2"
            >
              <component
                :is="item.externalLink ? 'a' : NuxtLink"
                v-bind="
                  item.externalLink
                    ? { href: item.externalLink.url, target: '_blank', rel: 'noopener noreferrer' }
                    : {
                        to: item.link
                          ? `/explore/${item.link.entityName.toLowerCase()}s/${item.link.id}`
                          : '#',
                      }
                "
              >
                <Card>
                  <CardHeader class="p-4 pb-2">
                    <CardTitle class="text-base">{{ item.title }}</CardTitle>
                  </CardHeader>
                  <CardContent v-if="item.markdownShort" class="px-4 pb-3">
                    <p class="line-clamp-3 text-sm text-base-content/60">
                      {{ item.markdownShort }}
                    </p>
                  </CardContent>
                </Card>
              </component>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>

      <!-- My Changes carousel -->
      <div v-if="meData?.me?.changes.nodes?.length" class="mb-8">
        <NuxtLink to="/contribute/changes">
          <div class="mb-3 flex items-center">
            <h2 class="text-xl font-bold"><T ns="frontend" key-name="contribute.myChanges" /></h2>
            <ArrowRight class="mx-4 text-base-content/70" />
          </div>
        </NuxtLink>
        <Carousel class="w-full" :opts="{ align: 'start' }">
          <CarouselContent class="ml-1">
            <CarouselItem
              v-for="change in meData.me.changes.nodes"
              :key="change.id"
              class="basis-1/2 pl-1 md:basis-1/3"
            >
              <NuxtLink :to="`/contribute/changes/${change.id}`">
                <div class="p-1">
                  <Card>
                    <CardHeader class="p-4 pb-2">
                      <span
                        class="badge badge-sm"
                        :class="{
                          'badge-primary': change.status === ChangeStatus.Merged,
                          'badge-error': change.status === ChangeStatus.Rejected,
                          'badge-warning': change.status === ChangeStatus.Draft,
                          'badge-info': change.status === ChangeStatus.Proposed,
                        }"
                        >{{ change.status }}</span
                      >
                      <CardTitle>{{ change.title || 'Untitled Change' }}</CardTitle>
                    </CardHeader>
                    <CardContent class="flex flex-col justify-center px-4 pb-3">
                      <span class="line-clamp-3 text-xs">{{
                        change.description || 'No description provided'
                      }}</span>
                    </CardContent>
                  </Card>
                </div>
              </NuxtLink>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>

      <!-- Bottom CTAs -->
      <div class="flex flex-col gap-3">
        <button
          class="btn w-full py-8 text-base btn-outline"
          @click="openUrl('https://github.com/sage-eco/sageleaf/discussions')"
        >
          <MessageSquare class="h-4 w-4" />
          <T ns="common" key-name="cta.feedback" />
        </button>
        <button
          class="btn w-full py-8 text-base btn-outline"
          @click="openUrl('https://github.com/sage-eco/sageleaf')"
        >
          <GitBranch class="h-4 w-4" />
          GitHub
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import {
  ArrowRight,
  CalendarPlus,
  Camera,
  GitBranch,
  MapPin,
  MessageSquare,
  Pencil,
} from '@lucide/vue'
import { T, useTranslate } from '@tolgee/vue'

import { graphql } from '~/gql'
import { ChangeStatus, FeedFormat } from '~/gql/types.generated'

const { t } = useTranslate()

useTopbar({ title: computed(() => t.value('contribute.title', { ns: 'frontend' })) })

const { openUrl } = useOpenUrl()

const projectFeedQuery = graphql(`
  query ContributeProjectFeed($format: FeedFormat) {
    feed(format: $format) {
      nodes {
        id
        format
        title
        markdownShort
        link {
          entityName
          id
        }
        externalLink {
          url
        }
      }
    }
  }
`)

const meChangesQuery = graphql(`
  query ContributeMeChanges {
    me {
      id
      changes {
        nodes {
          id
          status
          title
          description
        }
      }
    }
  }
`)

const { result: projectFeed } = useQuery(projectFeedQuery, { format: FeedFormat.Project })
const { result: meData } = useQuery(meChangesQuery)
</script>
