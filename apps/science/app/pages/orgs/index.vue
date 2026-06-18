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
        Add Org
      </Button>
      <CopyEntityDialog
        entity-type="ORG"
        entity-name="Org"
        label="Org"
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
    <GridModelChanges v-if="selectedChange" :query="orgsChangesQuery" :type="EditModelType.Org">
      <template #default="{ node }">
        <ModelListOrg
          :org="node.changes"
          :href="`/orgs/${node.changes.id}`"
          :buttons="['edit']"
          @button="actionButton"
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
          :href="`/orgs/${node.id}`"
          :buttons="['edit']"
          @button="actionButton"
        />
      </template>
    </GridModel>
    <Dialog v-model:open="showEdit">
      <DialogContent class="max-h-[80vh] overflow-auto sm:max-w-[70vw]">
        <DialogTitle>
          <span v-if="editId === 'new'">Create Org</span>
          <span v-else>Edit Org</span>
        </DialogTitle>
        <ModelForm
          :change-id="selectedChange"
          :model-id="editId"
          :schema-query="orgSchema"
          :create-mutation="createOrgMutation"
          :update-mutation="updateOrgMutation"
          :create-model-key="'org'"
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

const orgSchema = graphql(`
  query OrgSchema {
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
  mutation CreateOrg($input: CreateOrgInput!) {
    createOrg(input: $input) {
      org {
        id
        name
      }
    }
  }
`)

const updateOrgMutation = graphql(`
  mutation UpdateOrg($input: UpdateOrgInput!) {
    updateOrg(input: $input) {
      org {
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
