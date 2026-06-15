<template>
  <div>
    <div class="flex gap-2 p-3">
      <Button
        @click="
          requireAuth(() => {
            copyData = undefined
            editItemId = 'new'
            showEditItem = true
          })
        "
      >
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
              copyData = data
              editItemId = 'new'
              showEditItem = true
            })
          }
        "
      />
    </div>
    <GridModelChanges v-if="selectedChange" :query="itemsChangesQuery" :type="EditModelType.Item">
      <template #default="{ node }">
        <ModelListItem
          :item="node.changes"
          :href="`/items/${node.changes.id}`"
          :buttons="['edit']"
          @button="actionButton"
        />
      </template>
    </GridModelChanges>
    <GridModel title="Items" :query="itemsQuery" :query-name="'items'">
      <template #default="{ node }">
        <ModelListItem
          :item="node"
          :href="`/items/${node.id}`"
          :buttons="['edit']"
          @button="actionButton"
        />
      </template>
    </GridModel>
    <Dialog v-model:open="showEditItem">
      <DialogContent class="max-h-[80vh] overflow-auto sm:max-w-[70vw]">
        <DialogTitle>
          <span v-if="editItemId === 'new'">Create Item</span>
          <span v-else>Edit Item</span>
        </DialogTitle>
        <ModelForm
          :change-id="selectedChange"
          :model-id="editItemId"
          :schema-query="itemSchema"
          :create-mutation="createItemMutation"
          :update-mutation="updateItemMutation"
          :create-model-key="'item'"
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
    editItemId.value = id
    showEditItem.value = true
  }
}

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

const itemSchema = graphql(`
  query ItemsSchema {
    itemSchema {
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
const createItemMutation = graphql(`
  mutation CreateItem($input: CreateItemInput!) {
    createItem(input: $input) {
      item {
        id
        name
      }
    }
  }
`)
const updateItemMutation = graphql(`
  mutation UpdateItem($input: UpdateItemInput!) {
    updateItem(input: $input) {
      item {
        id
        name
      }
    }
  }
`)

const showEditItem = ref(false)
const editItemId = ref<string>('new')
const copyData = ref<Record<string, unknown> | undefined>(undefined)
const onSaved = () => {
  showEditItem.value = false
  editItemId.value = 'new'
  copyData.value = undefined
}
</script>
