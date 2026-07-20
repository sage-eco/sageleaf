<template>
  <div>
    <div class="flex items-center gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <h1 class="flex-1 text-xl font-bold">Edit Place</h1>
      <Button @click="requireAuth(() => formRef?.submit())">Save</Button>
    </div>
    <ModelForm
      ref="formRef"
      :change-id="selectedChange"
      :model-id="id"
      :schema-query="placeSchema"
      :create-mutation="createPlaceMutation"
      :update-mutation="updatePlaceMutation"
      create-model-key="place"
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

const placeSchema = graphql(`
  query EditPlaceSchema {
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
  mutation CreatePlaceEdit($input: CreatePlaceInput!) {
    createPlace(input: $input) {
      place {
        id
        name
      }
    }
  }
`)

const updatePlaceMutation = graphql(`
  mutation UpdatePlaceEdit($input: UpdatePlaceInput!) {
    updatePlace(input: $input) {
      place {
        id
        name
      }
    }
  }
`)
</script>
