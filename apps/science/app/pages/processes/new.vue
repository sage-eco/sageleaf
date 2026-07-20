<template>
  <div>
    <div class="flex items-center gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <h1 class="flex-1 text-xl font-bold">New Process</h1>
      <Button @click="requireAuth(() => formRef?.submit())">Save</Button>
    </div>
    <ModelForm
      ref="formRef"
      :change-id="selectedChange"
      model-id="new"
      :schema-query="processSchema"
      :create-mutation="createProcessMutation"
      :update-mutation="updateProcessMutation"
      create-model-key="process"
      :initial-data="initialData"
      hide-submit
      @saved="(id) => navigateTo(`/processes/${id}`)"
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

const processSchema = graphql(`
  query NewProcessSchema {
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
  mutation CreateProcessNew($input: CreateProcessInput!) {
    createProcess(input: $input) {
      process {
        id
        name
      }
    }
  }
`)

const updateProcessMutation = graphql(`
  mutation UpdateProcessNew($input: UpdateProcessInput!) {
    updateProcess(input: $input) {
      process {
        id
        name
      }
    }
  }
`)
</script>
