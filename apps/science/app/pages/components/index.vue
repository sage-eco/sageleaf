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
        Add Component
      </Button>
      <CopyEntityDialog
        entity-type="COMPONENT"
        entity-name="Component"
        label="Component"
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
      :query="componentChangesQuery"
      :type="EditModelType.Component"
    >
      <template #default="{ node }">
        <ModelListComponent
          :component="node.changes"
          :href="`/components/${node.changes.id}`"
          :buttons="['edit']"
          @button="actionButton"
        />
      </template>
    </GridModelChanges>
    <GridModel title="Components" :query="componentQuery" :query-name="'components'">
      <template #default="{ node }">
        <ModelListComponent
          :component="node"
          :href="`/components/${node.id}`"
          :buttons="['edit']"
          @button="actionButton"
        />
      </template>
    </GridModel>
    <Dialog v-model:open="showEdit">
      <DialogContent class="max-h-[80vh] overflow-auto sm:max-w-[70vw]">
        <DialogTitle>
          <span v-if="editId === 'new'">Create Component</span>
          <span v-else>Edit Component</span>
        </DialogTitle>
        <ModelForm
          :change-id="selectedChange"
          :model-id="editId"
          :schema-query="componentSchema"
          :create-mutation="createComponentMutation"
          :update-mutation="updateComponentMutation"
          :create-model-key="'component'"
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

const componentSchema = graphql(`
  query ComponentsSchema {
    componentSchema {
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
const createComponentMutation = graphql(`
  mutation MainCreateComponent($input: CreateComponentInput!) {
    createComponent(input: $input) {
      component {
        id
        name
      }
    }
  }
`)
const updateComponentMutation = graphql(`
  mutation UpdateComponent($input: UpdateComponentInput!) {
    updateComponent(input: $input) {
      component {
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
