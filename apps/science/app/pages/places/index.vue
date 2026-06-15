<template>
  <div>
    <div class="flex gap-2 p-3">
      <Button
        @click="
          requireAuth(() => {
            copyData = undefined
            editId = 'new'
            showEdit = true
          })
        "
      >
        <Plus />
        Add Place
      </Button>
      <CopyEntityDialog
        entity-type="PLACE"
        entity-name="Place"
        label="Place"
        @selected="
          (data) => {
            requireAuth(() => {
              copyData = data
              editId = 'new'
              showEdit = true
            })
          }
        "
      />
    </div>
    <GridModelChanges v-if="selectedChange" :query="placesChangesQuery" :type="EditModelType.Place">
      <template #default="{ node }">
        <ModelListPlace
          :place="node.changes"
          :href="`/places/${node.changes.id}`"
          :buttons="['edit']"
          @button="actionButton"
        />
      </template>
    </GridModelChanges>
    <GridModel title="Places" :query="placesQuery" :query-name="'places'">
      <template #default="{ node }">
        <ModelListPlace
          :place="node"
          :href="`/places/${node.id}`"
          :buttons="['edit']"
          @button="actionButton"
        />
      </template>
    </GridModel>
    <Dialog v-model:open="showEdit">
      <DialogContent class="max-h-[80vh] overflow-auto sm:max-w-[70vw]">
        <DialogTitle>
          <span v-if="editId === 'new'">Create Place</span>
          <span v-else>Edit Place</span>
        </DialogTitle>
        <ModelForm
          :change-id="selectedChange"
          :model-id="editId"
          :schema-query="placeSchema"
          :create-mutation="createPlaceMutation"
          :update-mutation="updatePlaceMutation"
          :create-model-key="'place'"
          :initial-data="copyData"
          @saved="onSaved"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@lucide/vue'

import { graphql } from '~/gql'
import { EditModelType } from '~/gql/graphql'

const changeStore = useChangeStore()
const { selectedChange } = storeToRefs(changeStore)

const { requireAuth } = useRequireAuth()

const placesQuery = graphql(`
  query PlacesQuery($first: Int, $last: Int, $before: String, $after: String) {
    places(first: $first, last: $last, before: $before, after: $after) {
      nodes {
        ...ListPlaceFragment
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`)

const placesChangesQuery = graphql(`
  query PlacesChangesQuery(
    $changeID: ID!
    $type: EditModelType
    $first: Int
    $last: Int
    $before: String
    $after: String
  ) {
    change(id: $changeID) {
      edits(type: $type, first: $first, last: $last, before: $before, after: $after) {
        nodes {
          changes {
            ...ListPlaceFragment
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  }
`)

const placeSchema = graphql(`
  query PlaceSchema {
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
  mutation CreatePlace($input: CreatePlaceInput!) {
    createPlace(input: $input) {
      place {
        id
        name
      }
    }
  }
`)

const updatePlaceMutation = graphql(`
  mutation UpdatePlace($input: UpdatePlaceInput!) {
    updatePlace(input: $input) {
      place {
        id
        name
      }
    }
  }
`)

const actionButton = (btn: string, id: string) => {
  if (btn === 'edit') {
    editId.value = id
    showEdit.value = true
  }
}

const showEdit = ref(false)
const editId = ref<string>('new')
const copyData = ref<Record<string, unknown> | undefined>(undefined)
const onSaved = () => {
  showEdit.value = false
  editId.value = 'new'
  copyData.value = undefined
}
</script>
