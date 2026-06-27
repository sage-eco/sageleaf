<template>
  <div>
    <div class="flex items-center gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <h1 class="flex-1 text-xl font-bold">New Category</h1>
      <Button @click="requireAuth(() => formRef?.submit())">Save</Button>
    </div>
    <ModelForm
      ref="formRef"
      :change-id="selectedChange"
      model-id="new"
      :schema-query="categorySchema"
      :create-mutation="createCategoryMutation"
      :update-mutation="updateCategoryMutation"
      create-model-key="category"
      :initial-data="initialData"
      hide-submit
      @saved="(id) => navigateTo(`/categories/${id}`)"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'

import { graphql } from '~/gql'
import { useEntityCopyStore } from '~/stores/entity_copy_store'

const router = useRouter()
const { requireAuth } = useRequireAuth()
const changeStore = useChangeStore()
const { selectedChange } = storeToRefs(changeStore)
const copyStore = useEntityCopyStore()

const initialData = copyStore.consumeCopyData()

const formRef = ref<{ submit: () => void } | null>(null)

const categorySchema = graphql(`
  query NewCategorySchema {
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
  mutation CreateCategoryNew($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      category {
        id
        name
      }
    }
  }
`)

const updateCategoryMutation = graphql(`
  mutation UpdateCategoryNew($input: UpdateCategoryInput!) {
    updateCategory(input: $input) {
      category {
        id
        name
      }
    }
  }
`)
</script>
