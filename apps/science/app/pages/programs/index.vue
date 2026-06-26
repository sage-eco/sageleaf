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
        Add Program
      </Button>
      <CopyEntityDialog
        entity-type="PROGRAM"
        entity-name="Program"
        label="Program"
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
      :query="programsChangesQuery"
      :type="EditModelType.Program"
    >
      <template #default="{ node }">
        <ModelListProgram
          :program="node.changes"
          :href="`/programs/${node.changes.id}`"
          :buttons="['edit']"
          @button="actionButton"
        />
      </template>
    </GridModelChanges>
    <GridModel title="Programs" :query="programsQuery" :query-name="'programs'">
      <template #default="{ node }">
        <ModelListProgram
          :program="node"
          :href="`/programs/${node.id}`"
          :buttons="['edit']"
          @button="actionButton"
        />
      </template>
    </GridModel>
    <Dialog v-model:open="showEdit">
      <DialogContent class="max-h-[80vh] overflow-auto sm:max-w-[70vw]">
        <DialogTitle>
          <span v-if="editId === 'new'">Create Program</span>
          <span v-else>Edit Program</span>
        </DialogTitle>
        <ModelForm
          :change-id="selectedChange"
          :model-id="editId"
          :schema-query="programSchema"
          :create-mutation="createProgramMutation"
          :update-mutation="updateProgramMutation"
          :create-model-key="'program'"
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

const programSchema = graphql(`
  query ProgramsSchema {
    programSchema {
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
const createProgramMutation = graphql(`
  mutation CreateProgram($input: CreateProgramInput!) {
    createProgram(input: $input) {
      program {
        id
        name
      }
    }
  }
`)
const updateProgramMutation = graphql(`
  mutation UpdateProgram($input: UpdateProgramInput!) {
    updateProgram(input: $input) {
      program {
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
