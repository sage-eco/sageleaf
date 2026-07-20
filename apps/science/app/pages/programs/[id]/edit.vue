<template>
  <div>
    <div class="flex items-center gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <h1 class="flex-1 text-xl font-bold">Edit Program</h1>
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
      :schema-query="programSchema"
      :create-mutation="createProgramMutation"
      :update-mutation="updateProgramMutation"
      create-model-key="program"
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

const programSchema = graphql(`
  query EditProgramSchema {
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
  mutation CreateProgramEdit($input: CreateProgramInput!) {
    createProgram(input: $input) {
      program {
        id
        name
      }
    }
  }
`)

const updateProgramMutation = graphql(`
  mutation UpdateProgramEdit($input: UpdateProgramInput!) {
    updateProgram(input: $input) {
      program {
        id
        name
      }
    }
  }
`)
</script>
