<template>
  <div>
    <div class="flex gap-2 p-3">
      <Button @click="requireAuth(() => navigateTo('/orgs/new'))">
        <Plus />
        Add Org
      </Button>
      <CopyEntityDialog
        entity-type="ORG"
        entity-name="Org"
        label="Org"
        @selected="
          (data) => {
            requireAuth(() => {
              copyStore.setCopyData(data)
              navigateTo('/orgs/new')
            })
          }
        "
      />
    </div>
    <GridModelChanges v-if="selectedChange" :query="orgsChangesQuery" :type="EditModelType.Org">
      <template #default="{ node }">
        <ModelListOrg
          :org="node.changes"
          :on-row-click="() => panelStore.openPanel('org', node.changes.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/orgs/${id}/edit`)"
        />
      </template>
    </GridModelChanges>
    <GridModel
      title="Organizations"
      :query="orgsQuery"
      :query-name="'orgs'"
      :search-query="orgsSearchQuery"
      search-placeholder="Search organizations..."
    >
      <template #default="{ node }">
        <ModelListOrg
          :org="node"
          :on-row-click="() => panelStore.openPanel('org', node.id)"
          :buttons="['edit']"
          @button="(btn, id) => btn === 'edit' && navigateTo(`/orgs/${id}/edit`)"
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

const orgsQuery = graphql(`
  query GridOrgsQuery($first: Int, $last: Int, $after: String, $before: String) {
    orgs(first: $first, last: $last, after: $after, before: $before) {
      nodes {
        ...ListOrgFragment
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`)

const orgsSearchQuery = graphql(`
  query GridOrgsSearchQuery($query: String!, $first: Int) {
    orgs: search(query: $query, types: [ORG], limit: $first) {
      nodes {
        ... on Org {
          ...ListOrgFragment
        }
      }
      totalCount
    }
  }
`)

const orgsChangesQuery = graphql(`
  query OrgsChangesQuery(
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
            ...ListOrgFragment
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
