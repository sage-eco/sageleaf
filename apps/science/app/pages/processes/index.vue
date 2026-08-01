<template>
  <div>
    <div class="flex gap-2 p-3">
      <Button @click="requireAuth(() => navigateTo('/processes/new'))">
        <Plus />
        Add Process
      </Button>
      <CopyEntityDialog
        entity-name="Process"
        label="Process"
        @selected="
          (data) => {
            requireAuth(() => {
              copyStore.setCopyData(data)
              navigateTo('/processes/new')
            })
          }
        "
      />
    </div>
    <GridModelChanges
      v-if="selectedChange"
      :query="processesChangesQuery"
      :type="EditModelType.Process"
    >
      <template #default="{ node }">
        <ModelListProcess
          :process="node.changes"
          :on-row-click="() => panelStore.openPanel('process', node.changes.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/processes/${id}/edit`)"
        />
      </template>
    </GridModelChanges>
    <GridModel title="Processes" :query="processQuery" :query-name="'processes'">
      <template #default="{ node }">
        <ModelListProcess
          :process="node"
          :on-row-click="() => panelStore.openPanel('process', node.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/processes/${id}/edit`)"
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

const processQuery = graphql(`
  query ProcessesQuery($first: Int, $last: Int, $before: String, $after: String) {
    processes(first: $first, last: $last, before: $before, after: $after) {
      nodes {
        ...ListProcessFragment
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

const processesChangesQuery = graphql(`
  query ProcessesChangesQuery(
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
            ...ListProcessFragment
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
