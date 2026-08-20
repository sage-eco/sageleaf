import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { EditModelType, RefModelType } from '@test/gql/types.generated'
import { GraphQLTestClient } from '@test/graphql.utils'

import { ChangeEdits } from '@src/changes/change.entity'
import { ChangeService } from '@src/changes/change.service'
import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { CATEGORY_IDS, TestCategorySeeder } from '@src/db/seeds/TestCategorySeeder'
import { TestMaterialSeeder } from '@src/db/seeds/TestMaterialSeeder'
import { TAG_IDS, TestTagSeeder } from '@src/db/seeds/TestTagSeeder'
import {
  COMPONENT_IDS,
  ITEM_IDS,
  TestVariantSeeder,
  VARIANT_IDS,
} from '@src/db/seeds/TestVariantSeeder'
import { NORMAL_USER_ID, UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { ItemsTags } from '@src/product/item.entity'
import { User } from '@src/users/users.entity'

const DirectEditQuery = graphql(`
  query ChangeResolverDirectEdit($id: ID, $entityName: String, $changeID: ID) {
    directEdit(id: $id, entityName: $entityName, changeID: $changeID) {
      updateInput
    }
  }
`)

const AddRefMutation = graphql(`
  mutation ChangeResolverAddRef($model: EditModelType!, $id: ID!, $input: AddRefInput!) {
    addRef(model: $model, id: $id, input: $input) {
      change {
        id
      }
      model {
        __typename
        ... on Item {
          id
          categories(first: 20) {
            nodes {
              id
            }
          }
          variants(first: 20) {
            nodes {
              id
            }
          }
          tags(first: 20) {
            nodes {
              id
            }
          }
        }
        ... on Category {
          id
          items(first: 20) {
            nodes {
              id
            }
          }
        }
        ... on Variant {
          id
          items(first: 20) {
            nodes {
              id
            }
          }
          components(first: 20) {
            nodes {
              component {
                id
              }
              quantity
              unit
            }
          }
          tags(first: 20) {
            nodes {
              id
            }
          }
        }
      }
      currentModel {
        __typename
        ... on Item {
          id
          categories(first: 20) {
            nodes {
              id
            }
          }
          variants(first: 20) {
            nodes {
              id
            }
          }
          tags(first: 20) {
            nodes {
              id
            }
          }
        }
        ... on Category {
          id
          items(first: 20) {
            nodes {
              id
            }
          }
        }
        ... on Variant {
          id
          items(first: 20) {
            nodes {
              id
            }
          }
          components(first: 20) {
            nodes {
              component {
                id
              }
              quantity
              unit
            }
          }
          tags(first: 20) {
            nodes {
              id
            }
          }
        }
      }
    }
  }
`)

const RemoveRefMutation = graphql(`
  mutation ChangeResolverRemoveRef($model: EditModelType!, $id: ID!, $input: RemoveRefInput!) {
    removeRef(model: $model, id: $id, input: $input) {
      change {
        id
      }
      model {
        __typename
        ... on Variant {
          id
          items(first: 20) {
            nodes {
              id
            }
          }
        }
      }
      currentModel {
        __typename
        ... on Variant {
          id
          items(first: 20) {
            nodes {
              id
            }
          }
        }
      }
    }
  }
`)

describe('ChangeResolver (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  let changeService: ChangeService
  let changeID: string
  let orm: MikroORM
  let user: User

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    }).compile()

    app = module.createNestApplication()
    await app.init()

    gql = new GraphQLTestClient(app)

    changeService = module.get(ChangeService)
    orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'public', ['users'])
    await orm.seeder.seed(
      BaseSeeder,
      UserSeeder,
      TestMaterialSeeder,
      TestCategorySeeder,
      TestTagSeeder,
      TestVariantSeeder,
    )

    user = (await orm.em.findOne(User, {
      username: 'admin',
    })) as User
    if (!user) {
      throw new Error('Admin user not found')
    }

    await gql.signIn('admin', 'password')

    // Insert a change using the service
    const change = await changeService.create(
      {
        title: 'Test Change',
        description: 'Integration test',
      },
      user.id,
    )
    changeID = change.id
  })

  afterAll(async () => {
    await app.close()
  })

  test('should query changes', async () => {
    const res = await gql.send(
      graphql(`
        query ChangeResolverListChanges($after: String, $first: Int) {
          changes(after: $after, first: $first) {
            nodes {
              id
              title
              description
            }
            totalCount
          }
        }
      `),
      { after: null, first: 10 },
    )
    expect(res.data?.changes.nodes?.length).toBeGreaterThan(0)
    expect(res.data?.changes.nodes?.at(0)).toHaveProperty('id')
    expect(res.data?.changes.nodes?.[0].title).toBeDefined()
    expect(res.data?.changes.totalCount).toBeGreaterThanOrEqual(1)
  })

  test('should default-order changes by updatedAt descending', async () => {
    const older = await changeService.create(
      { title: 'Older change', description: 'Should sort after the newer one' },
      user.id,
    )
    await orm.em
      .fork()
      .nativeUpdate('Change', { id: older.id }, { updatedAt: new Date(Date.now() - 60_000) })
    const newer = await changeService.create(
      { title: 'Newer change', description: 'Should sort before the older one' },
      user.id,
    )

    const res = await gql.send(
      graphql(`
        query ChangeResolverListChangesOrdered($first: Int) {
          changes(first: $first) {
            nodes {
              id
              updatedAt
            }
          }
        }
      `),
      { first: 50 },
    )

    const ids = res.data?.changes.nodes?.map((n) => n.id) ?? []
    const olderIdx = ids.indexOf(older.id)
    const newerIdx = ids.indexOf(newer.id)
    expect(olderIdx).toBeGreaterThanOrEqual(0)
    expect(newerIdx).toBeGreaterThanOrEqual(0)
    expect(newerIdx).toBeLessThan(olderIdx)

    const timestamps = (res.data?.changes.nodes ?? []).map((n) => new Date(n.updatedAt).getTime())
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1])
    }
  })

  test('should query a single change', async () => {
    const res = await gql.send(
      graphql(`
        query ChangeResolverGetChange($id: ID!) {
          change(id: $id) {
            id
            title
            description
          }
        }
      `),
      { id: changeID },
    )
    expect(res.data?.change).toBeTruthy()
    expect(res.data?.change?.id).toBe(changeID)
    expect(res.data?.change?.title).toBe('Test Change')
  })

  test('should create a change', async () => {
    const res = await gql.send(
      graphql(`
        mutation ChangeResolverCreateChange($input: CreateChangeInput!) {
          createChange(input: $input) {
            change {
              id
              title
            }
          }
        }
      `),
      {
        input: {
          title: 'New Change',
          description: 'Created by test',
        },
      },
    )
    expect(res.data?.createChange?.change).toHaveProperty('id')
    expect(res.data?.createChange?.change?.title).toBe('New Change')
  })

  test('should reject a description longer than the change_edits.description column (255 chars)', async () => {
    const res = await gql.send(
      graphql(`
        mutation ChangeResolverCreateChangeLongDescription($input: CreateChangeInput!) {
          createChange(input: $input) {
            change {
              id
            }
          }
        }
      `),
      {
        input: {
          title: 'Change with overlong description',
          description: 'x'.repeat(256),
        },
      },
    )
    expect(res.errors).toBeDefined()
  })

  test('should update a change', async () => {
    const res = await gql.send(
      graphql(`
        mutation ChangeResolverUpdateChange($input: UpdateChangeInput!) {
          updateChange(input: $input) {
            change {
              id
              title
            }
          }
        }
      `),
      {
        input: {
          id: changeID,
          title: 'Updated Title',
        },
      },
    )
    expect(res.data?.updateChange?.change?.id).toBe(changeID)
    expect(res.data?.updateChange?.change?.title).toBe('Updated Title')
  })

  test('should make an edit to a Variant', async () => {
    const res = await gql.send(
      graphql(`
        mutation ChangeResolverEditVariant($input: UpdateVariantInput!) {
          updateVariant(input: $input) {
            change {
              id
              edits(first: 10) {
                nodes {
                  id
                  entityName
                }
              }
            }
            variant {
              name
            }
          }
        }
      `),
      {
        input: {
          id: VARIANT_IDS[0],
          changeID,
          name: 'Updated Name',
        },
      },
    )
    expect(res.data?.updateVariant).toBeTruthy()
    const body = res.data?.updateVariant
    expect(body?.change?.id).toBe(changeID)
    // expect(body?.variant?.name).toBe(`Variant ${VARIANT_IDS[0]}`)
    expect(body?.change?.edits?.nodes?.length).toEqual(1)
    expect(body?.change?.edits?.nodes?.[0]?.id).toBe(VARIANT_IDS[0])
    expect(body?.change?.edits?.nodes?.[0]?.entityName).toBe('Variant')

    // Verify copyInput on Edit node
    const editRes = await gql.send(
      graphql(`
        query ChangeResolverEditCopyInput($id: ID!) {
          change(id: $id) {
            edits(first: 10) {
              nodes {
                id
                entityName
                updateInput
                copyInput
              }
            }
          }
        }
      `),
      { id: changeID },
    )
    const editNode = editRes.data?.change?.edits?.nodes?.[0]
    expect(editNode?.copyInput).toBeDefined()
    expect(editNode?.copyInput?.id).toBeUndefined()
    expect(editNode?.copyInput?.name).toBe('Updated Name')
    expect(editNode?.copyInput?.createdAt).toBeUndefined()
    expect(editNode?.copyInput?.updatedAt).toBeUndefined()
  })

  test('should paginate edits with first/after and last/before', async () => {
    const pagChange = await changeService.create(
      { title: 'Pagination Test Change', description: 'Integration test' },
      user.id,
    )
    const editCount = 3
    for (let i = 0; i < editCount; i++) {
      await gql.send(
        graphql(`
          mutation ChangeResolverPaginationEdit($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              change {
                id
              }
            }
          }
        `),
        {
          input: {
            id: VARIANT_IDS[i],
            changeID: pagChange.id,
            name: `Paginated Name ${i}`,
          },
        },
      )
    }

    const EditsPageQuery = graphql(`
      query ChangeResolverEditsPage(
        $id: ID!
        $first: Int
        $after: String
        $last: Int
        $before: String
      ) {
        change(id: $id) {
          edits(first: $first, after: $after, last: $last, before: $before) {
            totalCount
            nodes {
              id
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

    const page1 = await gql.send(EditsPageQuery, { id: pagChange.id, first: 2 })
    expect(page1.data?.change?.edits?.totalCount).toBe(editCount)
    expect(page1.data?.change?.edits?.nodes?.length).toBe(2)
    expect(page1.data?.change?.edits?.pageInfo?.hasNextPage).toBe(true)
    expect(page1.data?.change?.edits?.pageInfo?.hasPreviousPage).toBe(false)

    const page2 = await gql.send(EditsPageQuery, {
      id: pagChange.id,
      first: 2,
      after: page1.data?.change?.edits?.pageInfo?.endCursor,
    })
    expect(page2.data?.change?.edits?.nodes?.length).toBe(1)
    expect(page2.data?.change?.edits?.pageInfo?.hasNextPage).toBe(false)
    expect(page2.data?.change?.edits?.pageInfo?.hasPreviousPage).toBe(true)

    const lastPage = await gql.send(EditsPageQuery, { id: pagChange.id, last: 2 })
    expect(lastPage.data?.change?.edits?.nodes?.length).toBe(2)
    expect(lastPage.data?.change?.edits?.pageInfo?.hasNextPage).toBe(false)
    expect(lastPage.data?.change?.edits?.pageInfo?.hasPreviousPage).toBe(true)
  })

  test('should add a direct Item -> Category reference', async () => {
    const res = await gql.send(AddRefMutation, {
      model: EditModelType.Item,
      id: ITEM_IDS[0],
      input: {
        refModel: RefModelType.Category,
        ref: CATEGORY_IDS[0],
      },
    })

    expect(res.errors).toBeUndefined()
    const itemModel = res.data?.addRef?.model?.__typename === 'Item' ? res.data.addRef.model : null
    const currentItemModel =
      res.data?.addRef?.currentModel?.__typename === 'Item' ? res.data.addRef.currentModel : null
    const categories = itemModel?.categories?.nodes?.map((node) => node.id)
    const currentCategories = currentItemModel?.categories?.nodes?.map((node) => node.id)
    expect(categories).toContain(CATEGORY_IDS[0])
    expect(currentCategories).toContain(CATEGORY_IDS[0])
  })

  test('should remove a Variant -> Item reference through a change and preserve currentModel', async () => {
    const scopedChange = await changeService.create(
      {
        title: 'Variant remove item ref',
      },
      user.id,
    )

    const res = await gql.send(RemoveRefMutation, {
      model: EditModelType.Variant,
      id: VARIANT_IDS[0],
      input: {
        changeID: scopedChange.id,
        refModel: RefModelType.Item,
        ref: ITEM_IDS[1],
      },
    })

    expect(res.errors).toBeUndefined()
    expect(res.data?.removeRef?.change?.id).toBe(scopedChange.id)
    const currentVariantModel =
      res.data?.removeRef?.currentModel?.__typename === 'Variant'
        ? res.data.removeRef.currentModel
        : null
    const currentItems = currentVariantModel?.items?.nodes?.map((node) => node.id)
    expect(currentItems).toEqual(expect.arrayContaining([ITEM_IDS[0], ITEM_IDS[1]]))

    const directEdit = await gql.send(DirectEditQuery, {
      id: VARIANT_IDS[0],
      entityName: 'Variant',
      changeID: scopedChange.id,
    })
    expect(directEdit.errors).toBeUndefined()
    const remainingItemIds = directEdit.data?.directEdit?.updateInput?.items?.map(
      (item: { id: string }) => item.id,
    )
    expect(remainingItemIds).toEqual(
      expect.arrayContaining(ITEM_IDS.filter((id) => id !== ITEM_IDS[1])),
    )
    expect(remainingItemIds).not.toContain(ITEM_IDS[1])
    expect(remainingItemIds).toHaveLength(ITEM_IDS.length - 1)
  })

  test('should update pivot payload when adding an existing Variant -> Component reference directly', async () => {
    const res = await gql.send(AddRefMutation, {
      model: EditModelType.Variant,
      id: VARIANT_IDS[0],
      input: {
        refModel: RefModelType.Component,
        ref: COMPONENT_IDS[0],
        input: {
          quantity: 3.5,
          unit: 'g',
        },
      },
    })

    expect(res.errors).toBeUndefined()
    const currentVariantModel =
      res.data?.addRef?.currentModel?.__typename === 'Variant' ? res.data.addRef.currentModel : null
    const component = currentVariantModel?.components?.nodes?.find(
      (node) => node.component.id === COMPONENT_IDS[0],
    )
    expect(component?.quantity).toBe(3.5)
    expect(component?.unit).toBe('g')
  })

  test('should add a direct Item -> Variant inverse reference', async () => {
    const res = await gql.send(AddRefMutation, {
      model: EditModelType.Item,
      id: ITEM_IDS[0],
      input: {
        refModel: RefModelType.Variant,
        ref: VARIANT_IDS[2],
      },
    })

    expect(res.errors).toBeUndefined()
    const currentItemModel =
      res.data?.addRef?.currentModel?.__typename === 'Item' ? res.data.addRef.currentModel : null
    const variants = currentItemModel?.variants?.nodes?.map((node) => node.id)
    expect(variants).toContain(VARIANT_IDS[2])
  })

  test('should add a direct Category -> Item inverse reference', async () => {
    const res = await gql.send(AddRefMutation, {
      model: EditModelType.Category,
      id: CATEGORY_IDS[0],
      input: {
        refModel: RefModelType.Item,
        ref: ITEM_IDS[0],
      },
    })

    expect(res.errors).toBeUndefined()
    const currentCategoryModel =
      res.data?.addRef?.currentModel?.__typename === 'Category'
        ? res.data.addRef.currentModel
        : null
    const items = currentCategoryModel?.items?.nodes?.map((node) => node.id)
    expect(items).toContain(ITEM_IDS[0])
  })

  test('should add a direct Item -> Tag reference with meta payload', async () => {
    const res = await gql.send(AddRefMutation, {
      model: EditModelType.Item,
      id: ITEM_IDS[0],
      input: {
        refModel: RefModelType.Tag,
        ref: TAG_IDS[0],
        input: {
          meta: { score: 2 },
        },
      },
    })

    expect(res.errors).toBeUndefined()
    const currentItemModel =
      res.data?.addRef?.currentModel?.__typename === 'Item' ? res.data.addRef.currentModel : null
    const tags = currentItemModel?.tags?.nodes?.map((node) => node.id)
    expect(tags).toContain(TAG_IDS[0])

    const persistedTag = await orm.em.fork().findOne(ItemsTags, {
      item: ITEM_IDS[0],
      tag: TAG_IDS[0],
    })
    expect(persistedTag?.meta).toEqual({ score: 2 })
  })

  test('should reject unsupported reference combinations', async () => {
    const res = await gql.send(AddRefMutation, {
      model: EditModelType.Category,
      id: CATEGORY_IDS[0],
      input: {
        refModel: RefModelType.Category,
        ref: CATEGORY_IDS[2],
      },
    })

    expect(res.errors).toBeDefined()
    expect(res.errors?.[0]?.message).toContain('Unsupported reference from Category to Category')
  })

  test('should reject missing referenced entities', async () => {
    const res = await gql.send(AddRefMutation, {
      model: EditModelType.Item,
      id: ITEM_IDS[0],
      input: {
        refModel: RefModelType.Category,
        ref: 'ZZZZZZZZZZZZZZZZZZZZZ',
      },
    })

    expect(res.errors).toBeDefined()
    expect(res.errors?.[0]?.message).toContain('No Category found for IDs: ZZZZZZZZZZZZZZZZZZZZZ')
  })

  test('should create a Variant Change Edit (not Item) when adding Item -> Variant inverse ref via change', async () => {
    // Regression: addRef(Item, variants) delegates to the owning side (Variant).
    // The resulting ChangeEdit must record entityName='Variant' so that merging
    // produces variants_items pivot rows. Previously no owning-side edit was created.
    const scopedChange = await changeService.create({ title: 'Item->Variant delegation' }, user.id)

    const res = await gql.send(AddRefMutation, {
      model: EditModelType.Item,
      id: ITEM_IDS[0],
      input: {
        changeID: scopedChange.id,
        refModel: RefModelType.Variant,
        ref: VARIANT_IDS[2],
      },
    })

    expect(res.errors).toBeUndefined()
    expect(res.data?.addRef?.change?.id).toBe(scopedChange.id)

    const em = orm.em.fork()
    const edits = await em.find(ChangeEdits, { change: scopedChange.id })
    const variantEdit = edits.find(
      (e) => e.entityName === 'Variant' && e.entityID === VARIANT_IDS[2],
    )
    expect(variantEdit).toBeDefined()
    expect(variantEdit?.changes?.variantItems).toBeDefined()

    const itemEdit = edits.find((e) => e.entityName === 'Item')
    expect(itemEdit).toBeUndefined()
  })

  test('should create an Item Change Edit (not Category) when adding Category -> Item inverse ref via change', async () => {
    // Regression: addRef(Category, items) delegates to the owning side (Item).
    // The resulting ChangeEdit must record entityName='Item' so merging produces
    // items_categories pivot rows. Previously no owning-side edit was created.
    const scopedChange = await changeService.create({ title: 'Category->Item delegation' }, user.id)

    const res = await gql.send(AddRefMutation, {
      model: EditModelType.Category,
      id: CATEGORY_IDS[1],
      input: {
        changeID: scopedChange.id,
        refModel: RefModelType.Item,
        ref: ITEM_IDS[0],
      },
    })

    expect(res.errors).toBeUndefined()
    expect(res.data?.addRef?.change?.id).toBe(scopedChange.id)

    const em = orm.em.fork()
    const edits = await em.find(ChangeEdits, { change: scopedChange.id })
    const itemEdit = edits.find((e) => e.entityName === 'Item' && e.entityID === ITEM_IDS[0])
    expect(itemEdit).toBeDefined()
    expect(itemEdit?.changes?.itemCategories).toBeDefined()

    const categoryEdit = edits.find((e) => e.entityName === 'Category')
    expect(categoryEdit).toBeUndefined()
  })

  test('should discard an edit', async () => {
    const res = await gql.send(
      graphql(`
        mutation ChangeResolverDiscardEdit($changeID: ID!, $editID: ID!) {
          discardEdit(changeID: $changeID, editID: $editID) {
            success
            id
          }
        }
      `),
      {
        changeID,
        editID: VARIANT_IDS[0],
      },
    )
    expect(res.data?.discardEdit?.success).toBe(true)
    expect(res.data?.discardEdit?.id).toBe(VARIANT_IDS[0])
  })

  test('should delete a change', async () => {
    const res = await gql.send(
      graphql(`
        mutation ChangeResolverDeleteChange($id: ID!) {
          deleteChange(id: $id) {
            success
          }
        }
      `),
      {
        id: changeID,
      },
    )
    expect(res.data?.deleteChange?.success).toBe(true)
  })

  describe('Change ownership authorization', () => {
    let userGql: GraphQLTestClient
    let adminOwnedChangeID: string
    let userOwnedChangeID: string

    beforeAll(async () => {
      userGql = new GraphQLTestClient(app)
      await userGql.signIn('user', 'password')

      const adminChange = await changeService.create({ title: 'Admin-owned change' }, user.id)
      adminOwnedChangeID = adminChange.id

      const userChange = await changeService.create({ title: 'User-owned change' }, NORMAL_USER_ID!)
      userOwnedChangeID = userChange.id
    })

    test('non-owner non-admin cannot update another user change', async () => {
      const res = await userGql.send(
        graphql(`
          mutation ChangeOwnershipUpdateAsNonOwner($input: UpdateChangeInput!) {
            updateChange(input: $input) {
              change {
                id
              }
            }
          }
        `),
        { input: { id: adminOwnedChangeID, title: 'Hijacked' } },
      )
      expect(res.data?.updateChange).toBeFalsy()
      expect(res.errors).toBeDefined()
    })

    test('non-owner non-admin cannot delete another user change', async () => {
      const res = await userGql.send(
        graphql(`
          mutation ChangeOwnershipDeleteAsNonOwner($id: ID!) {
            deleteChange(id: $id) {
              success
            }
          }
        `),
        { id: adminOwnedChangeID },
      )
      expect(res.data?.deleteChange).toBeFalsy()
      expect(res.errors).toBeDefined()
    })

    test('non-owner non-admin cannot discard an edit on another user change', async () => {
      const res = await userGql.send(
        graphql(`
          mutation ChangeOwnershipDiscardAsNonOwner($changeID: ID!, $editID: ID!) {
            discardEdit(changeID: $changeID, editID: $editID) {
              success
            }
          }
        `),
        { changeID: adminOwnedChangeID, editID: 'nonexistent-edit-id' },
      )
      expect(res.data?.discardEdit).toBeFalsy()
      expect(res.errors).toBeDefined()
    })

    test('non-owner non-admin cannot merge another user change', async () => {
      const res = await userGql.send(
        graphql(`
          mutation ChangeOwnershipMergeAsNonOwner($id: ID!) {
            mergeChange(id: $id) {
              change {
                id
              }
            }
          }
        `),
        { id: adminOwnedChangeID },
      )
      expect(res.data?.mergeChange).toBeFalsy()
      expect(res.errors).toBeDefined()
    })

    test('admin can update another user change (bypass)', async () => {
      const res = await gql.send(
        graphql(`
          mutation ChangeOwnershipUpdateAsAdmin($input: UpdateChangeInput!) {
            updateChange(input: $input) {
              change {
                id
                title
              }
            }
          }
        `),
        { input: { id: userOwnedChangeID, title: 'Edited by admin' } },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateChange?.change?.title).toBe('Edited by admin')
    })

    test('admin can delete another user change (bypass)', async () => {
      const res = await gql.send(
        graphql(`
          mutation ChangeOwnershipDeleteAsAdmin($id: ID!) {
            deleteChange(id: $id) {
              success
            }
          }
        `),
        { id: userOwnedChangeID },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.deleteChange?.success).toBe(true)
    })
  })
})
