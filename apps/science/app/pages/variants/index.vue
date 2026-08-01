<template>
  <div>
    <div class="flex gap-2 p-3">
      <Button @click="requireAuth(() => navigateTo('/variants/new'))">
        <Plus />
        Add Variant
      </Button>
      <CopyEntityDialog
        entity-type="VARIANT"
        entity-name="Variant"
        label="Variant"
        @selected="
          (data) => {
            requireAuth(() => {
              copyStore.setCopyData(data)
              navigateTo('/variants/new')
            })
          }
        "
      />
    </div>
    <GridModelChanges
      v-if="selectedChange"
      :query="variantsChangesQuery"
      :type="EditModelType.Variant"
    >
      <template #default="{ node }">
        <ModelListVariant
          :variant="node.changes"
          :on-row-click="() => panelStore.openPanel('variant', node.changes.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/variants/${id}/edit`)"
        />
      </template>
    </GridModelChanges>
    <GridModel title="Variants" :query="variantsQuery" :query-name="'variants'">
      <template #default="{ node }">
        <ModelListVariant
          :variant="node"
          :on-row-click="() => panelStore.openPanel('variant', node.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/variants/${id}/edit`)"
        />
      </template>
    </GridModel>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@lucide/vue'

import { graphql } from '~/gql'
import { EditModelType } from '~/gql/graphql'
import { useDetailPanelStore } from '~/stores/detail_panel_store'
import { useEntityCopyStore } from '~/stores/entity_copy_store'

const changeStore = useChangeStore()
const { selectedChange } = storeToRefs(changeStore)
const { requireAuth } = useRequireAuth()
const copyStore = useEntityCopyStore()
const panelStore = useDetailPanelStore()

const variantsQuery = graphql(`
  query VariantsQuery($first: Int, $last: Int, $before: String, $after: String) {
    variants(first: $first, last: $last, before: $before, after: $after) {
      nodes {
        ...ListVariantFragment
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`)

const variantsChangesQuery = graphql(`
  query VariantsChangesQuery(
    $changeID: ID!
    $type: EditModelType
    $first: Int
    $last: Int
    $before: String
    $after: String
  ) {
    change(id: $changeID) {
      edits(type: $type, first: $first, last: $last, before: $before, after: $after) {
        totalCount
        nodes {
          changes {
            ...ListVariantFragment
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  }
`)
</script>
