<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Materials Coverage</h1>
        <p class="text-sm opacity-60">
          Check process definitions for materials across the selected region hierarchy.
        </p>
      </div>
    </div>

    <!-- No Region Selected Warning -->
    <div v-if="!regionStore.selectedRegionId" class="alert alert-warning">
      <span>Please select a region from the top navigation to view coverage.</span>
    </div>

    <!-- Loading State -->
    <div
      v-else-if="loadingHierarchy || loadingMaterials || loadingProcesses"
      class="flex justify-center p-12"
    >
      <span class="loading loading-lg loading-spinner" />
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="mat in materials"
        :key="mat.id"
        class="card bg-base-100 shadow-md transition-shadow hover:shadow-lg"
      >
        <div class="card-body p-5">
          <h2 class="card-title text-lg">
            <NuxtLink :to="`/processes/materials/${mat.id}`" class="hover:underline">
              {{ mat.name }}
            </NuxtLink>
          </h2>

          <div class="mt-4 flex flex-col gap-2">
            <div
              v-for="level in regionLevels"
              :key="level.id"
              class="flex items-center justify-between rounded-lg border border-base-content/10 p-2 text-sm"
            >
              <div class="flex flex-col">
                <span class="font-medium">{{ level.name }}</span>
                <span v-if="level.desc" class="text-xs opacity-80">{{ level.desc }}</span>
                <span class="text-xs opacity-60">{{ level.placetype }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="getProcessCount(mat.id, level.id) > 0"
                  class="badge badge-sm badge-success"
                >
                  {{ getProcessCount(mat.id, level.id) }} Process{{
                    getProcessCount(mat.id, level.id) > 1 ? 'es' : ''
                  }}
                </span>
                <span v-else class="badge badge-sm badge-error">Missing</span>
              </div>
            </div>
            <div v-if="regionLevels.length === 0" class="text-sm opacity-60">
              No region hierarchy available.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { graphql } from '~/gql'

const regionStore = useRegionStore()

// 1. Fetch materials
const materialsQuery = graphql(`
  query CoverageMaterials {
    materials(first: 200) {
      nodes {
        id
        name
      }
    }
  }
`)
const { result: materialsData, loading: loadingMaterials } = useQuery(materialsQuery)
const materials = computed(() => materialsData.value?.materials?.nodes ?? [])

// 2. Fetch region hierarchy
const hierarchyQuery = graphql(`
  query CoverageRegionHierarchy($id: ID!) {
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

// 3. Fetch processes for the selected regions
const processesQuery = graphql(`
  query CoverageProcesses($r0: ID, $r1: ID, $r2: ID, $r3: ID) {
    p0: processes(region: $r0, first: 1000) {
      nodes {
        id
        material {
          id
        }
        region {
          id
        }
      }
    }
    p1: processes(region: $r1, first: 1000) {
      nodes {
        id
        material {
          id
        }
        region {
          id
        }
      }
    }
    p2: processes(region: $r2, first: 1000) {
      nodes {
        id
        material {
          id
        }
        region {
          id
        }
      }
    }
    p3: processes(region: $r3, first: 1000) {
      nodes {
        id
        material {
          id
        }
        region {
          id
        }
      }
    }
  }
`)

const { result: processesData, loading: loadingProcesses } = useQuery(
  processesQuery,
  () => ({
    r0: regionLevels.value[0]?.id,
    r1: regionLevels.value[1]?.id,
    r2: regionLevels.value[2]?.id,
    r3: regionLevels.value[3]?.id,
  }),
  () => ({ enabled: regionLevels.value.length > 0 }),
)

const getProcessCount = (materialId: string, regionId: string) => {
  if (!processesData.value) return 0

  const levelIndex = regionLevels.value.findIndex((l) => l.id === regionId)
  if (levelIndex === -1) return 0

  let processesList: { material?: { id: string } | null; region?: { id: string } | null }[] = []
  if (levelIndex === 0 && processesData.value.p0) processesList = processesData.value.p0.nodes ?? []
  else if (levelIndex === 1 && processesData.value.p1)
    processesList = processesData.value.p1.nodes ?? []
  else if (levelIndex === 2 && processesData.value.p2)
    processesList = processesData.value.p2.nodes ?? []
  else if (levelIndex === 3 && processesData.value.p3)
    processesList = processesData.value.p3.nodes ?? []

  return processesList.filter((p) => p.material?.id === materialId && p.region?.id === regionId)
    .length
}
</script>
