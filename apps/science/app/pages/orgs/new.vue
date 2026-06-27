<template>
  <div>
    <div class="flex items-center gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <h1 class="flex-1 text-xl font-bold">New Org</h1>
      <Button @click="requireAuth(() => formRef?.submit())">Save</Button>
    </div>
    <ModelForm
      ref="formRef"
      :change-id="selectedChange"
      model-id="new"
      :schema-query="orgSchema"
      :create-mutation="createOrgMutation"
      :update-mutation="updateOrgMutation"
      create-model-key="org"
      :initial-data="initialData"
      hide-submit
      @saved="(id) => navigateTo(`/orgs/${id}`)"
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

const orgSchema = graphql(`
  query NewOrgSchema {
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
  mutation CreateOrgNew($input: CreateOrgInput!) {
    createOrg(input: $input) {
      org {
        id
        name
      }
    }
  }
`)

const updateOrgMutation = graphql(`
  mutation UpdateOrgNew($input: UpdateOrgInput!) {
    updateOrg(input: $input) {
      org {
        id
        name
      }
    }
  }
`)
</script>
