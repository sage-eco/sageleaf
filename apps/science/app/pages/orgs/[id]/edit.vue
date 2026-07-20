<template>
  <div>
    <div class="flex items-center gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <h1 class="flex-1 text-xl font-bold">Edit Org</h1>
      <Button @click="requireAuth(() => formRef?.submit())">Save</Button>
    </div>
    <ModelForm
      ref="formRef"
      :change-id="selectedChange"
      :model-id="id"
      :schema-query="orgSchema"
      :create-mutation="createOrgMutation"
      :update-mutation="updateOrgMutation"
      create-model-key="org"
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
const { selectedChange } = storeToRefs(changeStore)
const formRef = ref<{ submit: () => void } | null>(null)

const orgSchema = graphql(`
  query EditOrgSchema {
    orgSchema {
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

const createOrgMutation = graphql(`
  mutation CreateOrgEdit($input: CreateOrgInput!) {
    createOrg(input: $input) {
      org {
        id
        name
      }
    }
  }
`)

const updateOrgMutation = graphql(`
  mutation UpdateOrgEdit($input: UpdateOrgInput!) {
    updateOrg(input: $input) {
      org {
        id
        name
      }
    }
  }
`)
</script>
