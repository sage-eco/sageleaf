<template>
  <div>
    <div class="flex items-center gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <h1 class="flex-1 text-xl font-bold">New Place</h1>
      <Button @click="requireAuth(() => formRef?.submit())">Save</Button>
    </div>
    <ModelForm
      ref="formRef"
      :change-id="selectedChange"
      model-id="new"
      :schema-query="placeSchema"
      :create-mutation="createPlaceMutation"
      :update-mutation="updatePlaceMutation"
      create-model-key="place"
      :initial-data="initialData"
      hide-submit
      @saved="(id) => navigateTo(`/places/${id}`)"
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

const placeSchema = graphql(`
  query NewPlaceSchema {
    placeSchema {
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

const createPlaceMutation = graphql(`
  mutation CreatePlaceNew($input: CreatePlaceInput!) {
    createPlace(input: $input) {
      place {
        id
        name
      }
    }
  }
`)

const updatePlaceMutation = graphql(`
  mutation UpdatePlaceNew($input: UpdatePlaceInput!) {
    updatePlace(input: $input) {
      place {
        id
        name
      }
    }
  }
`)
</script>
