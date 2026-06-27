<template>
  <div>
    <div class="flex gap-2 p-3">
      <Button @click="requireAuth(() => navigateTo('/places/new'))">
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
              copyStore.setCopyData(data)
              navigateTo('/places/new')
            })
          }
        "
      />
    </div>
    <GridModelChanges v-if="selectedChange" :query="placesChangesQuery" :type="EditModelType.Place">
      <template #default="{ node }">
        <ModelListPlace
          :place="node.changes"
          :on-row-click="() => panelStore.openPanel('place', node.changes.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/places/${id}/edit`)"
        />
      </template>
    </GridModelChanges>
    <GridModel title="Places" :query="placesQuery" :query-name="'places'">
      <template #default="{ node }">
        <ModelListPlace
          :place="node"
          :on-row-click="() => panelStore.openPanel('place', node.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/places/${id}/edit`)"
        />
      </template>
    </GridModel>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@lucide/vue'

import { graphql } from '~/gql'
import { EditModelType } from '~/gql/graphql'
import { useDetailPanelStore } from '~/stores/detail_panel_store'
import { useEntityCopyStore } from '~/stores/entity_copy_store'

const changeStore = useChangeStore()
const { selectedChange } = storeToRefs(changeStore)
const { requireAuth } = useRequireAuth()
const copyStore = useEntityCopyStore()
const panelStore = useDetailPanelStore()

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
</script>
