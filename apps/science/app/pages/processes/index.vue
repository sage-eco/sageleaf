<template>
  <div>
    <div class="flex gap-2 p-3">
      <Button
        @click="
          requireAuth(() => {
            copyData = undefined
            editId = 'new'
            showEdit = true
          })
        "
      >
        <Plus />
        Add Process
      </Button>
      <CopyEntityDialog
        entity-name="Process"
        label="Process"
        @selected="
          (data) => {
            requireAuth(() => {
              copyData = data
              editId = 'new'
              showEdit = true
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
          :href="`/processes/${node.changes.id}`"
          :buttons="['edit']"
          @button="actionButton"
        />
      </template>
    </GridModelChanges>
    <GridModel title="Processes" :query="processQuery" :query-name="'processes'">
      <template #default="{ node }">
        <ModelListProcess
          :process="node"
          :href="`/processes/${node.id}`"
          :buttons="['edit']"
          @button="actionButton"
        />
      </template>
    </GridModel>
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
          :initial-data="copyData"
          @saved="onSaved"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@lucide/vue'

import { graphql } from '~/gql'
import { EditModelType } from '~/gql/graphql'

const changeStore = useChangeStore()
const { selectedChange } = storeToRefs(changeStore)

const { requireAuth } = useRequireAuth()

const actionButton = (btn: string, id: string) => {
  if (btn === 'edit') {
    editId.value = id
    showEdit.value = true
  }
}

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

const showEdit = ref(false)
const editId = ref<string>('new')
const copyData = ref<Record<string, unknown> | undefined>(undefined)
const onSaved = () => {
  showEdit.value = false
  editId.value = 'new'
  copyData.value = undefined
}
</script>
