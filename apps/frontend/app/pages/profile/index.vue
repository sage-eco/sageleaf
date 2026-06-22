<template>
  <div>
    <div class="grid grid-cols-4 md:grid-cols-12">
      <div class="col-span-4 bg-base-200 px-6 pt-10 pb-8 md:col-span-6 md:col-start-4">
        <div class="flex items-center justify-between gap-4">
          <div v-if="sessionData?.data" class="flex-1">
            <h1 class="text-2xl font-bold tracking-tight">
              Hello, {{ sessionData.data.user.name.split(' ')[0] }}
            </h1>
            <p class="text-sm opacity-50">{{ sessionData.data.user.email }}</p>
          </div>
          <div v-else-if="status === 'pending'" class="flex-1">
            <div class="mb-2 h-8 w-48 skeleton" />
            <div class="h-4 w-32 skeleton opacity-50" />
          </div>
          <div v-else class="flex-1">
            <h1 class="text-2xl font-bold tracking-tight">Welcome to Sageleaf</h1>
            <p class="mt-1.5 max-w-xs text-sm leading-relaxed opacity-60">
              Explore the project and customize your local experience.
            </p>
          </div>

          <div v-if="status !== 'pending'" class="-mr-2 shrink-0">
            <NuxtLink v-if="!sessionData?.data" to="/profile/sign_in" aria-label="Sign In">
              <button class="btn gap-2 px-3 opacity-30 btn-ghost btn-sm hover:opacity-100">
                <LogInIcon class="size-4" />
              </button>
            </NuxtLink>
            <button
              v-else
              class="btn gap-2 px-3 opacity-30 btn-ghost btn-sm hover:opacity-100"
              aria-label="Sign Out"
              @click="signOut"
            >
              <LogOutIcon class="size-4" />
            </button>
          </div>
        </div>
      </div>
      <div class="col-span-4 flex flex-col gap-3 px-4 py-3 md:col-span-6 md:col-start-4">
        <!-- Region -->
        <NuxtLink to="/profile/region">
          <Card class="bg-base-200">
            <CardContent
              class="flex items-center gap-4 px-5 py-4 transition-colors active:bg-base-300"
            >
              <div class="text-accent">
                <MapIcon class="size-5" />
              </div>
              <div class="flex flex-1 flex-col">
                <span
                  v-if="currentRegion?.name"
                  class="pb-1 text-[10px] font-bold tracking-widest uppercase opacity-60"
                  >Region</span
                >
                <h2 class="leading-tight font-medium">{{ currentRegion?.name || 'Set Region' }}</h2>
                <p v-if="currentRegion?.desc" class="mt-0.5 text-xs opacity-50">
                  {{ currentRegion.desc }}
                </p>
              </div>
              <ChevronRightIcon class="size-4 opacity-40" />
            </CardContent>
          </Card>
        </NuxtLink>

        <!-- Edit Profile (auth-gated) -->
        <NuxtLink v-if="isAuthenticated" to="/profile/edit">
          <Card class="bg-base-200">
            <CardContent
              class="flex items-center gap-4 px-5 py-4 transition-colors active:bg-base-300"
            >
              <div class="text-accent">
                <UserIcon class="size-5" />
              </div>
              <div class="flex-1 font-medium">Edit Profile</div>
              <ChevronRightIcon class="size-4 opacity-40" />
            </CardContent>
          </Card>
        </NuxtLink>

        <!-- App Settings -->
        <NuxtLink to="/profile/settings">
          <Card class="bg-base-200">
            <CardContent
              class="flex items-center gap-4 px-5 py-4 transition-colors active:bg-base-300"
            >
              <div class="text-accent">
                <SettingsIcon class="size-5" />
              </div>
              <div class="flex-1 font-medium">Preferences</div>
              <ChevronRightIcon class="size-4 opacity-40" />
            </CardContent>
          </Card>
        </NuxtLink>

        <!-- Support -->
        <div class="mt-3 flex flex-col gap-2">
          <span class="px-1 pb-1 text-sm font-bold tracking-widest uppercase opacity-60">
            <T ns="frontend" key-name="profile.support.title" />
          </span>
          <button
            type="button"
            class="block text-left"
            @click="openUrl('https://sageleaf.eco/help')"
          >
            <Card class="bg-base-200">
              <CardContent
                class="flex items-center gap-4 px-5 py-4 transition-colors active:bg-base-300"
              >
                <div class="text-accent">
                  <HelpCircleIcon class="size-5" />
                </div>
                <div class="flex-1 font-medium">
                  <T ns="frontend" key-name="profile.support.help" />
                </div>
                <ChevronRightIcon class="size-4 opacity-40" />
              </CardContent>
            </Card>
          </button>
          <button
            type="button"
            class="block text-left"
            @click="openUrl('https://sageleaf.eco/guides')"
          >
            <Card class="bg-base-200">
              <CardContent
                class="flex items-center gap-4 px-5 py-4 transition-colors active:bg-base-300"
              >
                <div class="text-accent">
                  <BookOpenIcon class="size-5" />
                </div>
                <div class="flex-1 font-medium">
                  <T ns="frontend" key-name="profile.support.guides" />
                </div>
                <ChevronRightIcon class="size-4 opacity-40" />
              </CardContent>
            </Card>
          </button>
          <button
            type="button"
            class="block text-left"
            @click="openUrl('https://sageleaf.eco/feedback')"
          >
            <Card class="bg-base-200">
              <CardContent
                class="flex items-center gap-4 px-5 py-4 transition-colors active:bg-base-300"
              >
                <div class="text-accent">
                  <MessageSquareIcon class="size-5" />
                </div>
                <div class="flex-1 font-medium">
                  <T ns="frontend" key-name="profile.support.leaveFeedback" />
                </div>
                <ChevronRightIcon class="size-4 opacity-40" />
              </CardContent>
            </Card>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  BookOpen as BookOpenIcon,
  ChevronRight as ChevronRightIcon,
  HelpCircle as HelpCircleIcon,
  LogInIcon,
  LogOutIcon,
  Map as MapIcon,
  MessageSquare as MessageSquareIcon,
  Settings as SettingsIcon,
  UserIcon,
} from '@lucide/vue'
import { T } from '@tolgee/vue'

import { graphql } from '~/gql'

useTopbar(null)

const { client: auth, sessionData, status, isAuthenticated } = useAuth()
const { openUrl } = useOpenUrl()
const regionStore = useRegionStore()
regionStore.load()

const currentRegionQuery = graphql(`
  query CurrentRegionProfile {
    currentRegion {
      region {
        id
        name
        desc
      }
    }
  }
`)

const { result: currentRegionData } = useQuery(currentRegionQuery)
const currentRegion = computed(() => currentRegionData.value?.currentRegion?.region)

const signOut = async () => {
  await auth.signOut()
}
</script>
