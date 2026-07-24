import { MikroOrmModule } from '@mikro-orm/nestjs'
import { MikroORM } from '@mikro-orm/postgresql'
import { Test, TestingModule } from '@nestjs/testing'

import { AuthModule } from '@src/auth/auth.module'
import { AuthUserService } from '@src/auth/authuser.service'
import { AUTH_USER_SERVICE_MOCK } from '@src/auth/authuser.service.mock'
import { EditsModule } from '@src/changes/edits.module'
import { CommonModule } from '@src/common/common.module'
import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { TestMaterialSeeder } from '@src/db/seeds/TestMaterialSeeder'
import { ORG_IDS, REGION_IDS, TestProcessSeeder } from '@src/db/seeds/TestProcessSeeder'
import {
  COMPONENT_IDS,
  ITEM_IDS,
  TestVariantSeeder,
  VARIANT_IDS,
} from '@src/db/seeds/TestVariantSeeder'
import { ADMIN_USER_ID, UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { GeoModule } from '@src/geo/geo.module'
import { MIKRO_TEST_CONFIG } from '@src/mikro-orm-test.config'
import { ProcessModule } from '@src/process/process.module'
import { VariantService } from '@src/product/variant.service'
import { WindmillMockService } from '@src/windmill/windmill.mock.service'
import { WindmillService } from '@src/windmill/windmill.service'

describe('VariantService', () => {
  let module: TestingModule
  let service: VariantService
  let orm: MikroORM

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        CommonModule,
        MikroOrmModule.forRoot(MIKRO_TEST_CONFIG),
        AuthModule,
        EditsModule,
        GeoModule,
        ProcessModule,
      ],
      providers: [VariantService],
    })
      .overrideProvider(AuthUserService)
      .useValue(AUTH_USER_SERVICE_MOCK)
      .overrideProvider(WindmillService)
      .useClass(WindmillMockService)
      .compile()

    service = module.get<VariantService>(VariantService)
    orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'public', ['users'])
    await orm
      .getSeeder()
      .seed(BaseSeeder, UserSeeder, TestMaterialSeeder, TestProcessSeeder, TestVariantSeeder)
  }, 60000)

  afterAll(async () => {
    if (module) {
      await module.close()
    }
  })

  test('should be defined', () => {
    expect(service).toBeDefined()
  })

  test('should find one variant by ID', async () => {
    const result = await service.findOneByID(VARIANT_IDS[0])
    expect(result).toBeDefined()
    expect(result?.id).toBe(VARIANT_IDS[0])
  })

  test('should find variants with options', async () => {
    const result = await service.find({
      where: { id: VARIANT_IDS[1] },
      options: {},
    })
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe(VARIANT_IDS[1])
  })

  test('should retrieve items for a variant', async () => {
    const result = await service.items(VARIANT_IDS[2], {
      where: {},
      options: {
        orderBy: { id: 'DESC' },
      },
    })
    expect(result.items).toHaveLength(ITEM_IDS.length)
    expect(result.items.map((item) => item.id)).toEqual(expect.arrayContaining(ITEM_IDS))
  })

  test('should retrieve components for a variant', async () => {
    const result = await service.components(VARIANT_IDS[0], {
      where: {},
      options: {
        orderBy: { component: 'ASC' },
      },
    })
    expect(result.items).toHaveLength(COMPONENT_IDS.length)
    expect(result.items.map((item) => item.component.id)).toEqual(
      expect.arrayContaining(COMPONENT_IDS),
    )
  })

  test('should create a new variant', async () => {
    const input = {
      nameTr: [{ lang: 'en', text: 'New Variant', auto: false }],
      descTr: [{ lang: 'en', text: 'Description for new variant', auto: false }],
    }
    const result = await service.create(input, ADMIN_USER_ID!)
    expect(result).toBeDefined()
    expect(result.variant.name).toStrictEqual({ en: 'New Variant' })
    expect(result.variant.desc).toStrictEqual({ en: 'Description for new variant' })
  })

  test('should create a variant with an org, then update it with the same org in addOrgs without error', async () => {
    const createResult = await service.create(
      {
        nameTr: [{ lang: 'en', text: 'Org Variant', auto: false }],
        orgs: [{ id: ORG_IDS[0] }],
      },
      ADMIN_USER_ID!,
    )
    expect(createResult.variant).toBeDefined()
    const variantId = createResult.variant.id

    const updateResult = await service.update(
      {
        id: variantId,
        addOrgs: [{ id: ORG_IDS[0] }],
      },
      ADMIN_USER_ID!,
    )
    expect(updateResult.variant).toBeDefined()
    expect(updateResult.variant!.id).toBe(variantId)

    const found = await service.orgs(variantId, { where: {}, options: {} })
    expect(found.count).toBe(1)
  })

  test('should set region on a variant', async () => {
    const createResult = await service.create(
      { nameTr: [{ lang: 'en', text: 'Region Variant', auto: false }] },
      ADMIN_USER_ID!,
    )
    const variantId = createResult.variant.id

    const updateResult = await service.update(
      { id: variantId, region: { id: REGION_IDS[0] } },
      ADMIN_USER_ID!,
    )
    expect(updateResult.variant).toBeDefined()
    expect(updateResult.variant!.region?.id).toBe(REGION_IDS[0])
  })

  test('addRegions with change syncs variant.region to first item', async () => {
    const { variant } = await service.create(
      { nameTr: [{ lang: 'en', text: 'Change Sync Variant', auto: false }] },
      ADMIN_USER_ID!,
    )

    const { variant: updated } = await service.update(
      {
        id: variant.id,
        addRegions: [{ id: REGION_IDS[0] }, { id: REGION_IDS[1] }],
        change: { title: 'test change' },
      },
      ADMIN_USER_ID!,
    )

    expect(updated!.region?.id).toBe(REGION_IDS[0])
    expect(updated!.regions).toContain(REGION_IDS[0])
    expect(updated!.regions).toContain(REGION_IDS[1])
  })

  test('singular region with change also updates regions array', async () => {
    const { variant } = await service.create(
      { nameTr: [{ lang: 'en', text: 'Change Region Variant', auto: false }] },
      ADMIN_USER_ID!,
    )

    const { variant: updated } = await service.update(
      {
        id: variant.id,
        region: { id: REGION_IDS[0] },
        change: { title: 'test change' },
      },
      ADMIN_USER_ID!,
    )

    expect(updated!.region?.id).toBe(REGION_IDS[0])
    expect(updated!.regions![0]).toBe(REGION_IDS[0])
  })

  test('addRegions syncs region (FK) to first item and regions contains all', async () => {
    const { variant } = await service.create(
      { nameTr: [{ lang: 'en', text: 'Sync Regions Variant', auto: false }] },
      ADMIN_USER_ID!,
    )

    const { variant: updated } = await service.update(
      { id: variant.id, addRegions: [{ id: REGION_IDS[0] }, { id: REGION_IDS[1] }] },
      ADMIN_USER_ID!,
    )

    expect(updated!.region?.id).toBe(REGION_IDS[0])
    expect(updated!.regions).toContain(REGION_IDS[0])
    expect(updated!.regions).toContain(REGION_IDS[1])
    expect(updated!.regions).toHaveLength(2)
  })

  test('setting singular region prepends it as primary in regions array', async () => {
    const { variant } = await service.create(
      {
        nameTr: [{ lang: 'en', text: 'Primary Region Variant', auto: false }],
        regions: [{ id: REGION_IDS[1] }],
      },
      ADMIN_USER_ID!,
    )

    const { variant: updated } = await service.update(
      { id: variant.id, region: { id: REGION_IDS[0] } },
      ADMIN_USER_ID!,
    )

    expect(updated!.region?.id).toBe(REGION_IDS[0])
    expect(updated!.regions![0]).toBe(REGION_IDS[0])
    expect(updated!.regions).toContain(REGION_IDS[1])
  })

  test('removeRegions updates region (FK) to new first item', async () => {
    const { variant } = await service.create(
      {
        nameTr: [{ lang: 'en', text: 'Remove Region Variant', auto: false }],
        regions: [{ id: REGION_IDS[0] }, { id: REGION_IDS[1] }],
      },
      ADMIN_USER_ID!,
    )

    const { variant: updated } = await service.update(
      { id: variant.id, removeRegions: [REGION_IDS[0]] },
      ADMIN_USER_ID!,
    )

    expect(updated!.region?.id).toBe(REGION_IDS[1])
    expect(updated!.regions).not.toContain(REGION_IDS[0])
    expect(updated!.regions).toHaveLength(1)
  })
})
