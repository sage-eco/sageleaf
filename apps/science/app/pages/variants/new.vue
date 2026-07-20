<template>
  <div>
    <div class="flex items-center gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <h1 class="flex-1 text-xl font-bold">New Variant</h1>
      <Button @click="requireAuth(() => formRef?.submit())">Save</Button>
    </div>
    <ModelForm
      ref="formRef"
      :change-id="selectedChange"
      model-id="new"
      :schema-query="variantSchema"
      :create-mutation="createVariantMutation"
      :update-mutation="updateVariantMutation"
      create-model-key="variant"
      :initial-data="initialData"
      hide-submit
      @saved="(id) => navigateTo(`/variants/${id}`)"
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

const variantSchema = graphql(`
  query NewVariantSchema {
    variantSchema {
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

const createVariantMutation = graphql(`
  mutation CreateVariantNew($input: CreateVariantInput!) {
    createVariant(input: $input) {
      variant {
        id
        name
      }
    }
  }
`)

const updateVariantMutation = graphql(`
  mutation UpdateVariantNew($input: UpdateVariantInput!) {
    updateVariant(input: $input) {
      variant {
        id
        name
      }
    }
  }
`)
</script>
