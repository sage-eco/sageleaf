<template>
  <div>
    <div class="flex gap-2 p-3">
      <Button @click="requireAuth(() => navigateTo('/programs/new'))">
        <Plus />
        Add Program
      </Button>
      <CopyEntityDialog
        entity-type="PROGRAM"
        entity-name="Program"
        label="Program"
        @selected="
          (data) => {
            requireAuth(() => {
              copyStore.setCopyData(data)
              navigateTo('/programs/new')
            })
          }
        "
      />
    </div>
    <GridModelChanges
      v-if="selectedChange"
      :query="programsChangesQuery"
      :type="EditModelType.Program"
    >
      <template #default="{ node }">
        <ModelListProgram
          :program="node.changes"
          :on-row-click="() => panelStore.openPanel('program', node.changes.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/programs/${id}/edit`)"
        />
      </template>
    </GridModelChanges>
    <GridModel title="Programs" :query="programsQuery" :query-name="'programs'">
      <template #default="{ node }">
        <ModelListProgram
          :program="node"
          :on-row-click="() => panelStore.openPanel('program', node.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/programs/${id}/edit`)"
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

const programsQuery = graphql(`
  query ProgramsQuery($first: Int, $last: Int, $before: String, $after: String) {
    programs(first: $first, last: $last, before: $before, after: $after) {
      nodes {
        ...ListProgramFragment
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

const programsChangesQuery = graphql(`
  query ProgramsChangesQuery(
    $changeID: ID!
    $type: EditModelType
    $first: Int
    $last: Int
    $before: String
    $after: String
  ) {
    change(id: $changeID) {
      edits(type: $type, first: $first, last: $last, before: $before, after: $after) {
        nodes {
          changes {
            ...ListProgramFragment
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
