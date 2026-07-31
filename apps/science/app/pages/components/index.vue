<template>
  <div>
    <div class="flex gap-2 p-3">
      <Button @click="requireAuth(() => navigateTo('/components/new'))">
        <Plus />
        Add Component
      </Button>
      <CopyEntityDialog
        entity-type="COMPONENT"
        entity-name="Component"
        label="Component"
        @selected="
          (data) => {
            requireAuth(() => {
              copyStore.setCopyData(data)
              navigateTo('/components/new')
            })
          }
        "
      />
    </div>
    <GridModelChanges
      v-if="selectedChange"
      :query="componentChangesQuery"
      :type="EditModelType.Component"
    >
      <template #default="{ node }">
        <ModelListComponent
          :component="node.changes"
          :on-row-click="() => panelStore.openPanel('component', node.changes.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/components/${id}/edit`)"
        />
      </template>
    </GridModelChanges>
    <GridModel title="Components" :query="componentQuery" :query-name="'components'">
      <template #default="{ node }">
        <ModelListComponent
          :component="node"
          :on-row-click="() => panelStore.openPanel('component', node.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/components/${id}/edit`)"
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

const componentQuery = graphql(`
  query ComponentsQuery($first: Int, $last: Int, $before: String, $after: String) {
    components(first: $first, last: $last, before: $before, after: $after) {
      nodes {
        ...ListComponentFragment
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

const componentChangesQuery = graphql(`
  query ComponentChangesQuery(
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
            ...ListComponentFragment
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
