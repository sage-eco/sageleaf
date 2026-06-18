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
        Add Category
      </Button>
      <CopyEntityDialog
        entity-type="CATEGORY"
        entity-name="Category"
        label="Category"
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
      :query="categoriesChangesQuery"
      :type="EditModelType.Category"
    >
      <template #default="{ node }">
        <ModelListCategory
          :category="node.changes"
          :href="`/categories/${node.changes.id}`"
          :buttons="['edit']"
          @button="actionButton"
        />
      </template>
    </GridModelChanges>
    <GridModel title="Categories" :query="categoriesQuery" :query-name="'categories'">
      <template #default="{ node }">
        <ModelListCategory
          :category="node"
          :href="`/categories/${node.id}`"
          :buttons="['edit']"
          @button="actionButton"
        />
      </template>
    </GridModel>
    <Dialog v-model:open="showEdit">
      <DialogContent class="max-h-[80vh] overflow-auto sm:max-w-[70vw]">
        <DialogTitle>
          <span v-if="editId === 'new'">Create Category</span>
          <span v-else>Edit Category</span>
        </DialogTitle>
        <ModelForm
          :change-id="selectedChange"
          :model-id="editId"
          :schema-query="categorySchema"
          :create-mutation="createCategoryMutation"
          :update-mutation="updateCategoryMutation"
          :create-model-key="'category'"
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

const categoriesQuery = graphql(`
  query GridCategoriesQuery($first: Int, $last: Int, $after: String, $before: String) {
    categories(first: $first, last: $last, after: $after, before: $before) {
      nodes {
        ...ListCategoryFragment
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
`)

const categoriesChangesQuery = graphql(`
  query CategoryChangesQuery(
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
            ...ListCategoryFragment
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

const categorySchema = graphql(`
  query CategoriesSchema {
    categorySchema {
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
const createCategoryMutation = graphql(`
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      category {
        id
        name
      }
    }
  }
`)
const updateCategoryMutation = graphql(`
  mutation UpdateCategory($input: UpdateCategoryInput!) {
    updateCategory(input: $input) {
      category {
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
