<template>
  <div>
    <div class="flex items-center gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <h1 class="flex-1 text-xl font-bold">New Item</h1>
      <Button @click="requireAuth(() => formRef?.submit())">Save</Button>
    </div>
    <ModelForm
      ref="formRef"
      :change-id="selectedChange"
      model-id="new"
      :schema-query="itemSchema"
      :create-mutation="createItemMutation"
      :update-mutation="updateItemMutation"
      create-model-key="item"
      :initial-data="initialData"
      hide-submit
      @saved="(id) => navigateTo(`/items/${id}`)"
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

const itemSchema = graphql(`
  query NewItemSchema {
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
  mutation CreateItemNew($input: CreateItemInput!) {
    createItem(input: $input) {
      item {
        id
        name
      }
    }
  }
`)

const updateItemMutation = graphql(`
  mutation UpdateItemNew($input: UpdateItemInput!) {
    updateItem(input: $input) {
      item {
        id
        name
      }
    }
  }
`)
</script>
