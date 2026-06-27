<template>
  <div>
    <div class="flex items-center gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <h1 class="flex-1 text-xl font-bold">Edit Category</h1>
      <Button :disabled="!isChangeSelected" @click="requireAuth(() => formRef?.submit())">
        Save
      </Button>
    </div>
    <div v-if="!isChangeSelected" role="alert" class="mx-3 mb-3 alert alert-warning">
      <span>Select a change from the sidebar to save edits.</span>
    </div>
    <ModelForm
      ref="formRef"
      :change-id="selectedChange"
      :model-id="id"
      :schema-query="categorySchema"
      :create-mutation="createCategoryMutation"
      :update-mutation="updateCategoryMutation"
      create-model-key="category"
      hide-submit
      @saved="router.back()"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'

import { graphql } from '~/gql'

const id = useRoute().params.id as string
const router = useRouter()
const { requireAuth } = useRequireAuth()
const changeStore = useChangeStore()
const { selectedChange, isChangeSelected } = storeToRefs(changeStore)

const formRef = ref<{ submit: () => void } | null>(null)

const categorySchema = graphql(`
  query EditCategorySchema {
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
  mutation CreateCategoryEdit($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      category {
        id
        name
      }
    }
  }
`)

const updateCategoryMutation = graphql(`
  mutation UpdateCategoryEdit($input: UpdateCategoryInput!) {
    updateCategory(input: $input) {
      category {
        id
        name
      }
    }
  }
`)
</script>
