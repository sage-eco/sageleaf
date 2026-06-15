<template>
  <div>
    <SidebarProvider v-model:open="sidebarOpen">
      <Sidebar>
        <SidebarHeader>
          <div class="flex items-center">
            <NuxtLink :to="'/'">
              <div class="p-3"><img src="/favicon-32x32.png" /></div>
            </NuxtLink>
            <div class="text-bold grow px-2 text-lg text-base-content">Sage</div>
            <SidebarTrigger v-if="sidebarOpen" class="self-start text-base-content/70" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton as-child class="h-12 px-4">
                    <SidebarChangeSelector />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible
                  v-for="item in menuItems"
                  :key="item.url"
                  as-child
                  class="group/collapsible"
                  :open="activeTab === item.url"
                  @update:open="(isOpen: boolean) => handleAccordion(isOpen, item.url)"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger as-child>
                      <SidebarMenuButton
                        class="h-12 px-4 hover:bg-primary/30 hover:text-primary"
                        :class="{
                          'text-primary dark:text-accent': activeTab === item.url,
                        }"
                      >
                        <div class="flex w-full items-center">
                          <component :is="item.icon" class="size-5 shrink-0" />
                          <span class="pl-2">{{ item.title }}</span>
                          <ChevronDown
                            v-if="item.subItems && item.subItems.length > 0"
                            class="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180"
                          />
                        </div>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem v-for="sub in item.subItems" :key="sub.url">
                          <SidebarMenuSubButton as-child :is-active="route.path === sub.url">
                            <NuxtLink :to="sub.url">{{ sub.title }}</NuxtLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <SidebarMenuButton
                    class="h-16"
                    @click="!session?.data?.user && (showSignIn = true)"
                  >
                    <div
                      class="avatar px-2"
                      :class="{
                        'avatar-placeholder': !session?.data?.user?.image,
                      }"
                    >
                      <div class="w-8 rounded-full">
                        <span v-if="!session?.data?.user.image" class="text-neutral-400">
                          <User :size="24" />
                        </span>
                        <img v-if="session?.data?.user.image" :src="session.data.user.image" />
                      </div>
                    </div>
                    {{ session?.data?.user.name || 'Sign in' }}
                    <ChevronsUpDown v-if="session?.data?.user" class="mr-1 ml-auto" :size="20" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent v-if="session?.data?.user" side="top" class="w-48">
                  <DropdownMenuItem @click="signOut">
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header class="flex h-12 w-full items-center">
          <SidebarTrigger v-if="!sidebarOpen" class="ml-2 text-neutral-400" />
          <SearchDialog />
          <div class="flex-grow"></div>
          <NavRegionSelector />
        </header>
        <div v-if="breadcrumbs.length > 0" class="breadcrumbs px-6 py-2 text-sm">
          <ul>
            <li><NuxtLink to="/">Home</NuxtLink></li>
            <li v-for="(crumb, index) in breadcrumbs" :key="crumb.url">
              <NuxtLink v-if="index < breadcrumbs.length - 1" :to="crumb.url">
                {{ crumb.name }}
              </NuxtLink>
              <span v-else class="opacity-60">{{ crumb.name }}</span>
            </li>
          </ul>
        </div>
        <slot />
      </SidebarInset>
    </SidebarProvider>
    <Dialog v-model:open="showSignIn">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader class="flex items-center">
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription> Sign in to your account </DialogDescription>
        </DialogHeader>
        <div class="grid w-full max-w-sm grid-cols-1 gap-8">
          <AuthSignIn @sign-in="signIn" />
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import {
  Blocks,
  Building2,
  ChevronsUpDown,
  ChevronDown,
  Database,
  GitMerge,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  List,
  MapPin,
  Shapes,
  User,
  Workflow,
} from '@lucide/vue'
import { useTranslate } from '@tolgee/vue'

const sidebarOpen = ref(true)
const showSignIn = useShowSignIn()

const { t } = useTranslate()

const menuItems = computed(() => [
  {
    title: t.value('nav.dashboard', { ns: 'science' }),
    url: '/dashboard',
    icon: LayoutDashboard,
    subItems: [{ title: t.value('nav.dashboard.index', { ns: 'science' }), url: '/dashboard' }],
  },
  {
    title: t.value('nav.categories', { ns: 'science' }),
    url: '/categories',
    icon: Shapes,
    subItems: [
      { title: t.value('nav.categories.index', { ns: 'science' }), url: '/categories' },
      {
        title: t.value('nav.categories.hierarchy', { ns: 'science' }),
        url: '/categories/hierarchy',
      },
      { title: 'Link Items', url: '/categories/link/items' },
    ],
  },
  {
    title: t.value('nav.items', { ns: 'science' }),
    url: '/items',
    icon: List,
    subItems: [
      { title: t.value('nav.items.index', { ns: 'science' }), url: '/items' },
      { title: 'Link Variants', url: '/items/link/variants' },
    ],
  },
  {
    title: t.value('nav.variants', { ns: 'science' }),
    url: '/variants',
    icon: LayoutGrid,
    subItems: [
      { title: t.value('nav.variants.index', { ns: 'science' }), url: '/variants' },
      { title: 'Link Components', url: '/variants/link/components' },
    ],
  },
  {
    title: t.value('nav.components', { ns: 'science' }),
    url: '/components',
    icon: Blocks,
    subItems: [{ title: t.value('nav.components.index', { ns: 'science' }), url: '/components' }],
  },
  {
    title: t.value('nav.materials', { ns: 'science' }),
    url: '/materials',
    icon: Layers,
    subItems: [{ title: t.value('nav.materials.index', { ns: 'science' }), url: '/materials' }],
  },
  {
    title: t.value('nav.processes', { ns: 'science' }),
    url: '/processes',
    icon: Workflow,
    subItems: [
      { title: t.value('nav.processes.index', { ns: 'science' }), url: '/processes' },
      { title: t.value('nav.processes.materials', { ns: 'science' }), url: '/processes/materials' },
    ],
  },
  {
    title: t.value('nav.sources', { ns: 'science' }),
    url: '/sources',
    icon: Database,
    subItems: [{ title: t.value('nav.sources.index', { ns: 'science' }), url: '/sources' }],
  },
  {
    title: t.value('nav.orgs', { ns: 'science' }),
    url: '/orgs',
    icon: Building2,
    subItems: [{ title: t.value('nav.orgs.index', { ns: 'science' }), url: '/orgs' }],
  },
  {
    title: t.value('nav.places', { ns: 'science' }),
    url: '/places',
    icon: MapPin,
    subItems: [{ title: t.value('nav.places.index', { ns: 'science' }), url: '/places' }],
  },
  {
    title: t.value('nav.changes', { ns: 'science' }),
    url: '/changes',
    icon: GitMerge,
    subItems: [{ title: t.value('nav.changes.index', { ns: 'science' }), url: '/changes' }],
  },
])

const router = useRouter()
const { client: auth, sessionData: session } = useAuth()
const route = useRoute()

const breadcrumbs = computed(() => {
  const fullPath = route.path
  if (fullPath === '/' || fullPath === '/dashboard') return []

  const segments = fullPath.split('/').filter(Boolean)
  const paths: { name: string; url: string }[] = []
  let currentPath = ''

  for (const segment of segments) {
    currentPath += `/${segment}`
    // Filter for 21-character NanoIDs
    const isId = /^[A-Za-z0-9_-]{21}$/.test(segment)
    paths.push({
      name: isId
        ? 'Details'
        : segment.charAt(0).toUpperCase() + segment.slice(1).replaceAll('-', ' '),
      url: currentPath,
    })
  }

  return paths
})

const activeTab = computed(() => {
  const currentPath = route.path
  const currentTab = menuItems.value.find((tab) => {
    return currentPath.startsWith(tab.url)
  })
  return currentTab ? currentTab.url : null
})

const handleAccordion = (isOpen: boolean, url: string) => {
  if (isOpen && route.path !== url && !route.path.startsWith(url + '/')) {
    router.push(url)
  }
}

const signIn = async () => {
  session.value = await auth.getSession()
  if (session.value.data) {
    showSignIn.value = false
  }
}

const signOut = async () => {
  await auth.signOut().then(() => {
    router.push('/')
  })
}
</script>
