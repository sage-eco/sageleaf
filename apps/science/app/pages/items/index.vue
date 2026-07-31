<template>
  <div>
    <div class="flex gap-2 p-3">
      <Button @click="requireAuth(() => navigateTo('/items/new'))">
        <Plus />
        Add Item
      </Button>
      <CopyEntityDialog
        entity-type="ITEM"
        entity-name="Item"
        label="Item"
        @selected="
          (data) => {
            requireAuth(() => {
              copyStore.setCopyData(data)
              navigateTo('/items/new')
            })
          }
        "
      />
    </div>
    <GridModelChanges v-if="selectedChange" :query="itemsChangesQuery" :type="EditModelType.Item">
      <template #default="{ node }">
        <ModelListItem
          :item="node.changes"
          :on-row-click="() => panelStore.openPanel('item', node.changes.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/items/${id}/edit`)"
        />
      </template>
    </GridModelChanges>
    <GridModel title="Items" :query="itemsQuery" :query-name="'items'">
      <template #default="{ node }">
        <ModelListItem
          :item="node"
          :on-row-click="() => panelStore.openPanel('item', node.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/items/${id}/edit`)"
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

const itemsQuery = graphql(`
  query ItemsQuery($first: Int, $last: Int, $before: String, $after: String) {
    items(first: $first, last: $last, before: $before, after: $after) {
      nodes {
        ...ListItemFragment
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

const itemsChangesQuery = graphql(`
  query ItemsChangesQuery(
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
            ...ListItemFragment
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
