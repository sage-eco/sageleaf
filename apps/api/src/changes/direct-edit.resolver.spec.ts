import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { GraphQLTestClient } from '@test/graphql.utils'

import { Change, ChangeEdits } from '@src/changes/change.entity'
import { ChangeService } from '@src/changes/change.service'
import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { CATEGORY_IDS, TestCategorySeeder } from '@src/db/seeds/TestCategorySeeder'
import { MATERIAL_IDS, TestMaterialSeeder } from '@src/db/seeds/TestMaterialSeeder'
import { ORG_IDS, PROCESS_IDS, TestProcessSeeder } from '@src/db/seeds/TestProcessSeeder'
import { TAG_IDS, TestTagSeeder } from '@src/db/seeds/TestTagSeeder'
import {
  COMPONENT_IDS,
  ITEM_IDS,
  TestVariantSeeder,
  VARIANT_IDS,
} from '@src/db/seeds/TestVariantSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { ComponentSchemaService } from '@src/process/component.schema'
import { ProcessSchemaService } from '@src/process/process.schema'
import { CategorySchemaService } from '@src/product/category.schema'
import { ItemSchemaService } from '@src/product/item.schema'
import { VariantSchemaService } from '@src/product/variant.schema'
import { User } from '@src/users/users.entity'

const DirectEditQuery = graphql(`
  query DirectEditResolverTest($id: ID, $entityName: String, $changeID: ID) {
    directEdit(id: $id, entityName: $entityName, changeID: $changeID) {
      entityName
      id
      createInput
      updateInput
      copyInput
    }
  }
`)

describe('DirectEdit (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  let changeService: ChangeService
  let categorySchema: CategorySchemaService
  let itemSchema: ItemSchemaService
  let variantSchema: VariantSchemaService
  let componentSchema: ComponentSchemaService
  let processSchema: ProcessSchemaService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    }).compile()

    app = module.createNestApplication()
    await app.init()

    gql = new GraphQLTestClient(app)
    changeService = module.get(ChangeService)
    categorySchema = module.get(CategorySchemaService)
    itemSchema = module.get(ItemSchemaService)
    variantSchema = module.get(VariantSchemaService)
    componentSchema = module.get(ComponentSchemaService)
    processSchema = module.get(ProcessSchemaService)

    const orm = module.get<MikroORM>(MikroORM)
    await clearDatabase(orm, 'public', ['users'])
    await orm.seeder.seed(
      BaseSeeder,
      UserSeeder,
      TestMaterialSeeder,
      TestTagSeeder,
      TestCategorySeeder,
      TestVariantSeeder,
      TestProcessSeeder,
    )

    await gql.signIn('admin', 'password')
  })

  afterAll(async () => {
    await app.close()
  })

  // Map entityName to its schema service
  function schemaFor(entityName: string) {
    const map: Record<string, any> = {
      Category: categorySchema,
      Item: itemSchema,
      Variant: variantSchema,
      Component: componentSchema,
      Process: processSchema,
    }
    return map[entityName]
  }

  describe('entityName only (no id) — returns createInput', () => {
    it.each(['Category', 'Item', 'Variant', 'Component', 'Process'])(
      'returns a createInput for %s',
      async (entityName) => {
        const res = await gql.send(DirectEditQuery, { entityName })

        expect(res.errors).toBeUndefined()
        const result = res.data?.directEdit
        expect(result).toBeTruthy()
        expect(result?.entityName).toBe(entityName)
        expect(result?.id).toBeNull()
        expect(result?.updateInput).toBeNull()
        expect(result?.createInput).toBeDefined()
      },
    )

    // Entities whose blank createInput is a valid (all-optional) Zod input
    it.each(['Category', 'Item', 'Variant'])(
      'createInput for %s contains only schema-allowed fields and passes Zod parse',
      async (entityName) => {
        const res = await gql.send(DirectEditQuery, { entityName })
        const result = res.data?.directEdit
        await expect(
          schemaFor(entityName).parseCreateInput(result!.createInput as any),
        ).resolves.toBeDefined()
      },
    )

    // Component requires primaryMaterial on create, so its blank createInput
    // (no entity to seed defaults from) is intentionally not a valid create input
    it('createInput for Component omits primaryMaterial and fails Zod parse', async () => {
      const res = await gql.send(DirectEditQuery, { entityName: 'Component' })
      const result = res.data?.directEdit
      await expect(
        schemaFor('Component').parseCreateInput(result!.createInput as any),
      ).rejects.toBeDefined()
    })
  })

  describe('with id + entityName — returns updateInput', () => {
    it.each([
      ['Category', CATEGORY_IDS[0]],
      ['Item', ITEM_IDS[0]],
      ['Variant', VARIANT_IDS[0]],
      ['Component', COMPONENT_IDS[0]],
      ['Process', PROCESS_IDS[0]],
    ])('returns an updateInput for %s', async (entityName, entityID) => {
      const res = await gql.send(DirectEditQuery, { id: entityID, entityName })

      expect(res.errors).toBeUndefined()
      const result = res.data?.directEdit
      expect(result?.entityName).toBe(entityName)
      expect(result?.id).toBe(entityID)
      expect(result?.createInput).toBeNull()
      expect(result?.updateInput).toBeDefined()
      expect(result?.updateInput?.id).toBe(entityID)

      expect(result?.copyInput).toBeDefined()
      expect(result?.copyInput?.id).toBeUndefined()
      expect(result?.copyInput?.createdAt).toBeUndefined()
      expect(result?.copyInput?.updatedAt).toBeUndefined()

      // Ensure other fields are copied correctly (e.g. name if it exists)
      if (result?.updateInput?.name) {
        expect(result?.copyInput?.name).toBe(result.updateInput.name)
      }

      // Check that it's mostly the same as updateInput
      const { id: _id, createdAt: _c, updatedAt: _u, ...restOfUpdate } = result!.updateInput as any
      expect(result?.copyInput).toEqual(restOfUpdate)

      await expect(
        schemaFor(entityName).parseUpdateInput(result!.updateInput as any),
      ).resolves.toBeDefined()
    })
  })

  describe('with changeID — updateInput reflects pending ChangeEdit', () => {
    let changeID1: string
    let changeID2: string
    const VARIANT_NAME_CHANGE1 = 'DirectEdit Change-One Variant Name'
    const VARIANT_NAME_CHANGE2 = 'DirectEdit Change-Two Variant Name'
    const CATEGORY_NAME_CHANGE1 = 'DirectEdit Change-One Category Name'

    beforeAll(async () => {
      const orm = app.get<MikroORM>(MikroORM)
      const user = await orm.em.findOne(User, { username: 'admin' })
      if (!user) throw new Error('Admin user not found')

      const change1 = await changeService.create({ title: 'Change One' }, user.id)
      const change2 = await changeService.create({ title: 'Change Two' }, user.id)
      changeID1 = change1.id
      changeID2 = change2.id

      // Edit VARIANT_IDS[0] on change1 with one name
      await gql.send(
        graphql(`
          mutation DirectEditUpdateVariantChange1($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
              }
            }
          }
        `),
        { input: { id: VARIANT_IDS[0], changeID: changeID1, name: VARIANT_NAME_CHANGE1 } },
      )

      // Edit VARIANT_IDS[0] on change2 with a different name
      await gql.send(
        graphql(`
          mutation DirectEditUpdateVariantChange2($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
              }
            }
          }
        `),
        { input: { id: VARIANT_IDS[0], changeID: changeID2, name: VARIANT_NAME_CHANGE2 } },
      )

      // Edit CATEGORY_IDS[0] on change1
      await gql.send(
        graphql(`
          mutation DirectEditUpdateCategoryChange1($input: UpdateCategoryInput!) {
            updateCategory(input: $input) {
              category {
                id
              }
            }
          }
        `),
        { input: { id: CATEGORY_IDS[0], changeID: changeID1, name: CATEGORY_NAME_CHANGE1 } },
      )
    })

    it('returns updateInput from ChangeEdit.changes for Variant with changeID1', async () => {
      const res = await gql.send(DirectEditQuery, {
        id: VARIANT_IDS[0],
        entityName: 'Variant',
        changeID: changeID1,
      })

      expect(res.errors).toBeUndefined()
      const result = res.data?.directEdit
      expect(result?.entityName).toBe('Variant')
      expect(result?.id).toBe(VARIANT_IDS[0])
      expect(result?.updateInput).toBeDefined()
      expect(result?.updateInput?.id).toBe(VARIANT_IDS[0])
      expect(result?.updateInput?.name).toBe(VARIANT_NAME_CHANGE1)
      await expect(
        variantSchema.parseUpdateInput(result!.updateInput as any),
      ).resolves.toBeDefined()
    })

    it('returns updateInput from ChangeEdit.changes for Variant with changeID2', async () => {
      const res = await gql.send(DirectEditQuery, {
        id: VARIANT_IDS[0],
        entityName: 'Variant',
        changeID: changeID2,
      })

      expect(res.errors).toBeUndefined()
      const result = res.data?.directEdit
      expect(result?.updateInput?.name).toBe(VARIANT_NAME_CHANGE2)
    })

    it('changeID1 and changeID2 return different updateInputs for the same Variant', async () => {
      const [res1, res2] = await Promise.all([
        gql.send(DirectEditQuery, {
          id: VARIANT_IDS[0],
          entityName: 'Variant',
          changeID: changeID1,
        }),
        gql.send(DirectEditQuery, {
          id: VARIANT_IDS[0],
          entityName: 'Variant',
          changeID: changeID2,
        }),
      ])

      expect(res1.data?.directEdit?.updateInput?.name).toBe(VARIANT_NAME_CHANGE1)
      expect(res2.data?.directEdit?.updateInput?.name).toBe(VARIANT_NAME_CHANGE2)
      expect(res1.data?.directEdit?.updateInput?.name).not.toBe(
        res2.data?.directEdit?.updateInput?.name,
      )
    })

    it('returns updateInput from ChangeEdit.changes for Category with changeID1', async () => {
      const res = await gql.send(DirectEditQuery, {
        id: CATEGORY_IDS[0],
        entityName: 'Category',
        changeID: changeID1,
      })

      expect(res.errors).toBeUndefined()
      const result = res.data?.directEdit
      expect(result?.entityName).toBe('Category')
      expect(result?.id).toBe(CATEGORY_IDS[0])
      expect(result?.updateInput).toBeDefined()
      expect(result?.updateInput?.name).toBe(CATEGORY_NAME_CHANGE1)
      await expect(
        categorySchema.parseUpdateInput(result!.updateInput as any),
      ).resolves.toBeDefined()
    })

    it('returns updateInput without changeID when entity has no matching ChangeEdit', async () => {
      // VARIANT_IDS[1] has no edits in any change, so changeID1 has no ChangeEdit for it
      const [resWithChange, resWithout] = await Promise.all([
        gql.send(DirectEditQuery, {
          id: VARIANT_IDS[1],
          entityName: 'Variant',
          changeID: changeID1,
        }),
        gql.send(DirectEditQuery, { id: VARIANT_IDS[1], entityName: 'Variant' }),
      ])

      // Both should return the same updateInput (DB state) since no pending edit exists
      expect(resWithChange.errors).toBeUndefined()
      expect(resWithChange.data?.directEdit?.updateInput?.id).toBe(VARIANT_IDS[1])
      expect(resWithChange.data?.directEdit?.updateInput?.name).toEqual(
        resWithout.data?.directEdit?.updateInput?.name,
      )
    })
  })

  describe('pivot relation field preservation in updateInput', () => {
    let changeID: string

    beforeAll(async () => {
      const orm = app.get<MikroORM>(MikroORM)
      const em = orm.em.fork()
      const user = await em.findOne(User, { username: 'admin' })
      if (!user) throw new Error('Admin user not found')

      const change = await changeService.create({ title: 'Pivot Fields Change' }, user.id)
      changeID = change.id

      // Component edit: materials with materialFraction, tags with meta
      const componentEdit = new ChangeEdits({
        entityName: 'Component',
        entityID: COMPONENT_IDS[0],
        userID: user.id,
        changes: {
          id: COMPONENT_IDS[0],
          componentMaterials: [
            { component: COMPONENT_IDS[0], material: MATERIAL_IDS[0], materialFraction: 0.75 },
            { component: COMPONENT_IDS[0], material: MATERIAL_IDS[1], materialFraction: 0.25 },
          ],
          componentTags: [
            { component: COMPONENT_IDS[0], tag: TAG_IDS[0], meta: { source: 'test_source' } },
          ],
        },
      })
      componentEdit.change = em.getReference(Change, changeID)
      em.persist(componentEdit)

      // Variant edit: components with quantity and unit
      const variantEdit = new ChangeEdits({
        entityName: 'Variant',
        entityID: VARIANT_IDS[0],
        userID: user.id,
        changes: {
          id: VARIANT_IDS[0],
          variantOrgs: [{ variant: VARIANT_IDS[0], org: ORG_IDS[0] }],
          variantComponents: [
            { variant: VARIANT_IDS[0], component: COMPONENT_IDS[0], quantity: 3, unit: 'g' },
          ],
        },
      })
      variantEdit.change = em.getReference(Change, changeID)
      em.persist(variantEdit)

      const itemEdit = new ChangeEdits({
        entityName: 'Item',
        entityID: ITEM_IDS[0],
        userID: user.id,
        changes: {
          id: ITEM_IDS[0],
          itemTags: [{ item: ITEM_IDS[0], tag: TAG_IDS[1], meta: { time: 'moderate' } }],
        },
      })
      itemEdit.change = em.getReference(Change, changeID)
      em.persist(itemEdit)

      await em.flush()
    })

    it('preserves materialFraction on Component materials', async () => {
      const res = await gql.send(DirectEditQuery, {
        id: COMPONENT_IDS[0],
        entityName: 'Component',
        changeID,
      })

      expect(res.errors).toBeUndefined()
      const updateInput = res.data?.directEdit?.updateInput
      expect(updateInput).toBeDefined()
      const mat0 = updateInput?.materials?.find((m: any) => m.id === MATERIAL_IDS[0])
      const mat1 = updateInput?.materials?.find((m: any) => m.id === MATERIAL_IDS[1])
      expect(mat0?.materialFraction).toBe(0.75)
      expect(mat1?.materialFraction).toBe(0.25)
      await expect(componentSchema.parseUpdateInput(updateInput as any)).resolves.toBeDefined()
    })

    it('preserves meta on Component tags', async () => {
      const res = await gql.send(DirectEditQuery, {
        id: COMPONENT_IDS[0],
        entityName: 'Component',
        changeID,
      })

      expect(res.errors).toBeUndefined()
      const updateInput = res.data?.directEdit?.updateInput
      const tag = updateInput?.tags?.find((t: any) => t.id === TAG_IDS[0])
      expect(tag?.meta).toEqual({ source: 'test_source' })
      await expect(componentSchema.parseUpdateInput(updateInput as any)).resolves.toBeDefined()
    })

    it('preserves quantity and unit on Variant components', async () => {
      const res = await gql.send(DirectEditQuery, {
        id: VARIANT_IDS[0],
        entityName: 'Variant',
        changeID,
      })

      expect(res.errors).toBeUndefined()
      const updateInput = res.data?.directEdit?.updateInput
      const comp = updateInput?.components?.find((c: any) => c.id === COMPONENT_IDS[0])
      expect(comp?.quantity).toBe(3)
      expect(comp?.unit).toBe('g')
      await expect(variantSchema.parseUpdateInput(updateInput as any)).resolves.toBeDefined()
    })

    it('preserves orgs on Variant orgs', async () => {
      const res = await gql.send(DirectEditQuery, {
        id: VARIANT_IDS[0],
        entityName: 'Variant',
        changeID,
      })

      expect(res.errors).toBeUndefined()
      const updateInput = res.data?.directEdit?.updateInput
      expect(updateInput?.orgs).toContainEqual({ id: ORG_IDS[0] })
      await expect(variantSchema.parseUpdateInput(updateInput as any)).resolves.toBeDefined()
    })

    it('preserves meta on Item tags', async () => {
      const res = await gql.send(DirectEditQuery, {
        id: ITEM_IDS[0],
        entityName: 'Item',
        changeID,
      })

      expect(res.errors).toBeUndefined()
      const updateInput = res.data?.directEdit?.updateInput
      const tag = updateInput?.tags?.find((t: any) => t.id === TAG_IDS[1])
      expect(tag?.meta).toEqual({ time: 'moderate' })
      await expect(itemSchema.parseUpdateInput(updateInput as any)).resolves.toBeDefined()
    })
  })

  describe('error cases', () => {
    it('returns 400/error when neither id nor entityName is provided', async () => {
      const res = await gql.send(
        DirectEditQuery,
        {} as { id?: string; entityName?: string; changeID?: string },
      )
      expect(res.errors).toBeDefined()
    })

    it('returns an error in res.errors for an invalid entityName', async () => {
      const res = await gql.send(DirectEditQuery, { entityName: 'NonExistentEntity' })
      expect(res.errors).toBeDefined()
    })

    it('returns 404 for an id that does not exist in any entity', async () => {
      const res = await gql.send(DirectEditQuery, {
        id: 'nonexistent-id-00000000000',
        entityName: 'Variant',
      })
      expect(res.errors).toBeDefined()
    })
  })
})
