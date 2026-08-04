import { MikroOrmModule } from '@mikro-orm/nestjs'
import { MikroORM } from '@mikro-orm/postgresql'
import { Test, TestingModule } from '@nestjs/testing'

import { AuthModule } from '@src/auth/auth.module'
import { AuthUserService } from '@src/auth/authuser.service'
import { AUTH_USER_SERVICE_MOCK } from '@src/auth/authuser.service.mock'
import { CommonModule } from '@src/common/common.module'
import { TransformService } from '@src/common/transform'
import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { CATEGORY_IDS, TestCategorySeeder } from '@src/db/seeds/TestCategorySeeder'
import { clearDatabase } from '@src/db/test.utils'
import { MIKRO_TEST_CONFIG } from '@src/mikro-orm-test.config'
import { CategoriesArgs } from '@src/product/category.model'
import { CategoryService } from '@src/product/category.service'
import { ProductModule } from '@src/product/product.module'
import { WindmillMockService } from '@src/windmill/windmill.mock.service'
import { WindmillService } from '@src/windmill/windmill.service'

describe('CategoryService', () => {
  let module: TestingModule
  let service: CategoryService
  let transform: TransformService
  let orm: MikroORM

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [CommonModule, MikroOrmModule.forRoot(MIKRO_TEST_CONFIG), AuthModule, ProductModule],
    })
      .overrideProvider(AuthUserService)
      .useValue(AUTH_USER_SERVICE_MOCK)
      .overrideProvider(WindmillService)
      .useClass(WindmillMockService)
      .compile()

    service = module.get<CategoryService>(CategoryService)
    transform = module.get<TransformService>(TransformService)
    orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'public', ['users'])
    await orm.getSeeder().seed(BaseSeeder, TestCategorySeeder)
  }, 60000)

  afterAll(async () => {
    if (module) {
      await module.close()
    }
  })

  test('should be defined', () => {
    expect(service).toBeDefined()
  })

  test('should find categories ordered by relevance with a cursor without crashing on count', async () => {
    const cursor = Buffer.from(JSON.stringify({ order: 0, id: CATEGORY_IDS[0] })).toString('base64')
    const [, filter] = await transform.paginationArgs(CategoriesArgs, { after: cursor } as any)
    const result = await service.find(filter)
    expect(result).toBeDefined()
    expect(typeof result.count).toBe('number')
  })
})
