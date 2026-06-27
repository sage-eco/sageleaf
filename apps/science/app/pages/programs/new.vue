<template>
  <div>
    <div class="flex items-center gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <h1 class="flex-1 text-xl font-bold">New Program</h1>
      <Button @click="requireAuth(() => formRef?.submit())">Save</Button>
    </div>
    <ModelForm
      ref="formRef"
      :change-id="selectedChange"
      model-id="new"
      :schema-query="programSchema"
      :create-mutation="createProgramMutation"
      :update-mutation="updateProgramMutation"
      create-model-key="program"
      :initial-data="initialData"
      hide-submit
      @saved="(id) => navigateTo(`/programs/${id}`)"
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

const programSchema = graphql(`
  query NewProgramSchema {
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
  mutation CreateProgramNew($input: CreateProgramInput!) {
    createProgram(input: $input) {
      program {
        id
        name
      }
    }
  }
`)

const updateProgramMutation = graphql(`
  mutation UpdateProgramNew($input: UpdateProgramInput!) {
    updateProgram(input: $input) {
      program {
        id
        name
      }
    }
  }
`)
</script>
