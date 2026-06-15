<template>
  <div class="p-6">
    <div v-if="loadingMaterial" class="flex justify-center p-12">
      <span class="loading loading-lg loading-spinner" />
    </div>
    <div v-else-if="material">
      <div class="mb-6 flex items-start justify-between">
        <div class="flex items-center gap-4">
          <Button variant="ghost" size="icon" class="shrink-0" @click="router.back()">
            <ArrowLeft class="size-5" />
          </Button>
          <div>
            <h1 class="text-2xl font-bold">Processes for {{ material.name }}</h1>
            <p v-if="selectedRegion" class="text-sm opacity-60">
              In region: {{ selectedRegion.name }}
              <span v-if="selectedRegion.desc"> — {{ selectedRegion.desc }}</span>
              and its hierarchy
            </p>
          </div>
        </div>
        <Button
          @click="
            requireAuth(() => {
              editId = 'new'
              showEdit = true
            })
          "
        >
          <Plus class="mr-2 size-4" />
          Add Process
        </Button>
      </div>
      <div v-if="!selectedRegion" class="alert-sm mt-2 alert alert-warning">
        <span>No region selected. Process list may be incomplete.</span>
      </div>

      <div v-if="loadingHierarchy || loadingProcesses" class="flex justify-center p-12">
        <span class="loading loading-lg loading-spinner" />
      </div>
      <div v-else class="space-y-8">
        <div v-for="level in regionLevels" :key="level.id">
          <h2 class="mb-3 border-b border-base-300 pb-2 text-lg font-semibold">
            {{ level.name }}
            <span class="text-xs font-normal opacity-50">{{ level.placetype }}</span>
            <div v-if="level.desc" class="mt-0.5 text-sm font-normal opacity-60">
              {{ level.desc }}
            </div>
          </h2>

          <div
            v-if="getProcessesForRegion(level.id).length > 0"
            class="grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            <div
              v-for="process in getProcessesForRegion(level.id)"
              :key="process.id"
              class="card bg-base-100 shadow"
            >
              <div class="card-body p-5">
                <div class="flex items-start justify-between">
                  <div>
                    <h3 class="card-title text-base">{{ process.name }}</h3>
                    <p v-if="process.org" class="text-xs opacity-70">
                      by
                      <NuxtLink :to="`/orgs/${process.org.id}`" class="link">{{
                        process.org.name
                      }}</NuxtLink>
                    </p>
                  </div>
                  <span v-if="process.intent" class="badge badge-outline">{{
                    process.intent
                  }}</span>
                </div>
                <p v-if="process.desc" class="mt-2 text-sm opacity-80">{{ process.desc }}</p>
              </div>
            </div>
          </div>
          <div v-else>
            <p class="rounded-lg bg-base-200 p-4 text-center text-sm italic opacity-60">
              No specific processes found for this material in {{ level.name }}.
            </p>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="alert alert-error">
      <span>Material not found.</span>
    </div>

    <Dialog v-model:open="showEdit">
      <DialogContent class="max-h-[80vh] overflow-auto sm:max-w-[70vw]">
        <DialogTitle>
          <span v-if="editId === 'new'">Create Process</span>
          <span v-else>Edit Process</span>
        </DialogTitle>
        <ModelForm
          :change-id="selectedChange"
          :model-id="editId"
          :schema-query="processSchema"
          :create-mutation="createProcessMutation"
          :update-mutation="updateProcessMutation"
          :create-model-key="'process'"
          :initial-data="{ material: { id: materialId } }"
          @saved="onSaved"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Plus } from '@lucide/vue'

import { graphql } from '~/gql'

const route = useRoute()
const router = useRouter()
const regionStore = useRegionStore()
const changeStore = useChangeStore()
const { selectedChange } = storeToRefs(changeStore)
const { requireAuth } = useRequireAuth()

const materialId = computed(() => route.params.id as string)

// --- Page Data Fetching ---

// 1. Fetch Material Name
const materialNameQuery = graphql(`
  query MaterialNameForProcessDetails($id: ID!) {
    material(id: $id) {
      id
      name
    }
  }
`)
const { result: materialData, loading: loadingMaterial } = useQuery(materialNameQuery, () => ({
  id: materialId.value,
}))
const material = computed(() => materialData.value?.material)

// 2. Fetch Region Hierarchy
const hierarchyQuery = graphql(`
  query ProcessDetailsRegionHierarchy($id: ID!) {
    region(id: $id) {
      id
      name
      desc
      placetype
      county {
        id
        name
        desc
        placetype
      }
      province {
        id
        name
        desc
        placetype
      }
      country {
        id
        name
        desc
        placetype
      }
    }
  }
`)
const { result: hierarchyData, loading: loadingHierarchy } = useQuery(
  hierarchyQuery,
  () => ({ id: regionStore.selectedRegionId ?? '' }),
  () => ({ enabled: !!regionStore.selectedRegionId }),
)
const selectedRegion = computed(() => hierarchyData.value?.region)

type RegionLevel = {
  id: string
  name?: string | null
  desc?: string | null
  placetype?: string | null
}
const regionLevels = computed<RegionLevel[]>(() => {
  const reg = hierarchyData.value?.region
  if (!reg) return []
  const levels: RegionLevel[] = []
  if (reg.id) levels.push({ id: reg.id, name: reg.name, desc: reg.desc, placetype: reg.placetype })
  if (reg.county?.id && !levels.some((l) => l.id === reg.county!.id)) {
    levels.push({
      id: reg.county.id,
      name: reg.county.name,
      desc: reg.county.desc,
      placetype: reg.county.placetype,
    })
  }
  if (reg.province?.id && !levels.some((l) => l.id === reg.province!.id)) {
    levels.push({
      id: reg.province.id,
      name: reg.province.name,
      desc: reg.province.desc,
      placetype: reg.province.placetype,
    })
  }
  if (reg.country?.id && !levels.some((l) => l.id === reg.country!.id)) {
    levels.push({
      id: reg.country.id,
      name: reg.country.name,
      desc: reg.country.desc,
      placetype: reg.country.placetype,
    })
  }
  return levels
})
const topRegionId = computed(() => regionLevels.value.at(-1)?.id)

// 3. Fetch all processes for the material in the top-level region
const processesQuery = graphql(`
  query ProcessesForMaterialDetails($materialId: ID!, $regionId: ID) {
    processes(material: $materialId, region: $regionId, first: 1000) {
      nodes {
        id
        name
        desc
        intent
        region {
          id
        }
        org {
          id
          name
        }
      }
    }
  }
`)
const { result: processesData, loading: loadingProcesses } = useQuery(
  processesQuery,
  () => ({
    materialId: materialId.value,
    regionId: topRegionId.value,
  }),
  () => ({ enabled: !!materialId.value && !!topRegionId.value }),
)
const allProcesses = computed(() => processesData.value?.processes?.nodes ?? [])

// 4. Filter processes for each region level
const getProcessesForRegion = (regionId: string) => {
  return allProcesses.value.filter((p) => p.region?.id === regionId)
}

// --- Add/Edit Process Dialog Logic ---

const showEdit = ref(false)
const editId = ref<string>('new')
const onSaved = () => {
  showEdit.value = false
  editId.value = 'new'
  // Could refetch processes here if needed
}

const processSchema = graphql(`
  query ProcessesSchema {
    processSchema {
      create {
        schema
        uischema
      }
      update {
        schema
        uischema
      }
    }
  }
`)
const createProcessMutation = graphql(`
  mutation MainCreateProcess($input: CreateProcessInput!) {
    createProcess(input: $input) {
      process {
        id
        name
      }
    }
  }
`)
const updateProcessMutation = graphql(`
  mutation UpdateProcess($input: UpdateProcessInput!) {
    updateProcess(input: $input) {
      process {
        id
        name
      }
    }
  }
`)
</script>
