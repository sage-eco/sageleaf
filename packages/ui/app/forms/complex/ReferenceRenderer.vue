<template>
  <control-wrapper
    v-bind="controlWrapper"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
    :label="refType"
  >
    <div class="flex w-full items-center gap-2">
      <Dialog v-model:open="dialogOpen">
        <DialogTrigger as-child>
          <Button variant="outline" :disabled="!control.enabled">
            {{ selectedId ? 'Change' : 'Search' }}
          </Button>
        </DialogTrigger>
        <DialogContent class="max-h-[70vh] overflow-auto">
          <DialogTitle>
            {{ refType }}
          </DialogTitle>
          <DialogDescription> Search for a {{ refType }} to link </DialogDescription>
          <p>{{ control.description }}</p>
          <FormInput
            :id="control.id + '-input'"
            v-model:model-value="searchInput"
            class="w-full"
            :class="styles.control.input"
            :disabled="!control.enabled"
            :autofocus="appliedOptions.focus"
            placeholder="Search..."
            @focus="isFocused = true"
            @blur="isFocused = false"
          />
          <ul class="list mt-4 mb-6 rounded-box bg-base-100 shadow-md">
            <li class="px-4 py-2 text-xs tracking-wide opacity-60">
              Search Results ({{ searchData?.search.totalCount || 0 }})
            </li>
            <li v-if="searchLoading" class="list-row flex flex-col">
              <div v-for="i in 3" :key="i" class="flex gap-2">
                <div class="h-8 w-8 skeleton p-4"></div>
                <div class="flex grow flex-col gap-2">
                  <div class="h-4 w-48 skeleton"></div>
                  <div class="h-4 w-24 skeleton"></div>
                </div>
              </div>
            </li>

            <div v-if="searchNodes && !searchLoading" class="divide-y border-neutral-200">
              <div v-if="refType === 'Category'">
                <ModelListCategory
                  v-for="(category, i) in searchNodes"
                  :key="i"
                  :category="category"
                  :buttons="['select']"
                  @button="selected"
                />
              </div>
              <div v-if="refType === 'Item'">
                <ModelListItem
                  v-for="(item, i) in searchNodes"
                  :key="i"
                  :item="item"
                  :buttons="['select']"
                  @button="selected"
                />
              </div>
              <div v-if="refType === 'Variant'">
                <ModelListVariant
                  v-for="(variant, i) in searchNodes"
                  :key="i"
                  :variant="variant"
                  :buttons="['select']"
                  @button="selected"
                />
              </div>
              <div v-if="refType === 'Component'">
                <ModelListComponent
                  v-for="(component, i) in searchNodes"
                  :key="i"
                  :component="component"
                  :buttons="['select']"
                  @button="selected"
                />
              </div>
              <div v-if="refType === 'Org'">
                <ModelListOrg
                  v-for="(org, i) in searchNodes"
                  :key="i"
                  :org="org"
                  :buttons="['select']"
                  @button="selected"
                />
              </div>
              <div v-if="refType === 'Region'">
                <ModelListRegion
                  v-for="(region, i) in searchNodes"
                  :key="i"
                  :region="region"
                  :buttons="['select']"
                  @button="selected"
                />
              </div>
              <div v-if="refType === 'Place'">
                <ModelListPlace
                  v-for="(place, i) in searchNodes"
                  :key="i"
                  :place="place"
                  :buttons="['select']"
                  @button="selected"
                />
              </div>
              <div v-if="refType === 'Material'">
                <ModelListMaterial
                  v-for="(material, i) in searchNodes"
                  :key="i"
                  :material="material"
                  :buttons="['select']"
                  @button="selected"
                />
              </div>
            </div>

            <li
              v-if="searchNodes && searchNodes.length === 0 && searchInput.length > 0"
              class="list-row"
            >
              No results found for "{{ searchInput }}"
            </li>
            <li
              v-if="!searchData && searchInput.length === 0"
              class="list-row flex items-center justify-center"
            >
              <div class="text-neutral-500">Search for a {{ refType }}</div>
            </li>
          </ul>
        </DialogContent>
      </Dialog>
      <div v-if="selectedId" class="grow">
        <ModelRef v-if="refType" :id="selectedId" :type="refType" />
      </div>
    </div>
  </control-wrapper>
</template>

<script lang="ts">
import type { ControlElement } from '@jsonforms/core'
import type { RendererProps } from '@jsonforms/vue'
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue'
import { watchDebounced } from '@vueuse/core'
import { defineComponent } from 'vue'

import { graphql } from '~/gql'
import { SearchType } from '~/gql/graphql'

import { ControlWrapper } from '../controls'
import { useVanillaControl } from '../util'

export default defineComponent({
  name: 'ReferenceRenderer',
  components: {
    ControlWrapper,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const input = useJsonFormsControl(props)
    const refType = (input.control.value.schema as { $id?: string }).$id
    if (!refType) {
      throw new Error('Reference type is not defined in the schema')
    }
    const filterTypes: Record<string, SearchType> = {
      Category: SearchType.Category,
      Item: SearchType.Item,
      Variant: SearchType.Variant,
      Component: SearchType.Component,
      Place: SearchType.Place,
      Region: SearchType.Region,
      Org: SearchType.Org,
      Material: SearchType.Material,
    }
    const searchQuery = graphql(`
      query RefSearchQuery($input: String!, $type: SearchType!) {
        search(query: $input, types: [$type]) {
          totalCount
          nodes {
            ...ListCategoryFragment
            ...ListItemFragment
            ...ListVariantFragment
            ...ListComponentFragment
            ...ListOrgFragment
            ...ListRegionFragment
            ...ListPlaceFragment
            ...ListMaterialFragment
          }
        }
      }
    `)
    const dialogOpen = ref<boolean>(false)
    const searchInput = ref<string>('')
    const {
      result: searchData,
      loading: searchLoading,
      load,
      refetch,
    } = useLazyQuery(searchQuery, {
      input: searchInput.value,
      type: filterTypes[refType]!,
    })
    watchDebounced(
      searchInput,
      async (newValue) => {
        if (newValue.length > 0) {
          if (searchData.value) {
            await refetch({ input: newValue, type: filterTypes[refType]! })
          } else {
            await load(searchQuery, {
              input: newValue,
              type: filterTypes[refType]!,
            })
          }
        }
      },
      { debounce: 300, immediate: true },
    )
    const selectedId = computed(() => {
      return input.control.value.data || ''
    })
    const selected = (btn: string, id: string) => {
      if (btn === 'select') {
        input.handleChange(input.control.value.path, id)
        dialogOpen.value = false
      }
    }
    const searchNodes = computed(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (searchData.value?.search.nodes || []) as any[]
    })

    return useVanillaControl(
      {
        ...input,
        refType,
        dialogOpen,
        searchData,
        searchLoading,
        searchInput,
        selected,
        selectedId,
        searchNodes,
      },
      (target) => target.value || undefined,
    )
  },
})
</script>
