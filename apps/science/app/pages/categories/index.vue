<template>
  <div>
    <div class="flex gap-2 p-3">
      <Button @click="requireAuth(() => navigateTo('/categories/new'))">
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
              copyStore.setCopyData(data)
              navigateTo('/categories/new')
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
          :on-row-click="() => panelStore.openPanel('category', node.changes.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/categories/${id}/edit`)"
        />
      </template>
    </GridModelChanges>
    <GridModel title="Categories" :query="categoriesQuery" :query-name="'categories'">
      <template #default="{ node }">
        <ModelListCategory
          :category="node"
          :on-row-click="() => panelStore.openPanel('category', node.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/categories/${id}/edit`)"
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
</script>
