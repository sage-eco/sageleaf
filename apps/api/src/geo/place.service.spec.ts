import { MikroOrmModule } from '@mikro-orm/nestjs'
import { MikroORM } from '@mikro-orm/postgresql'
import { Test, TestingModule } from '@nestjs/testing'

import { AuthModule } from '@src/auth/auth.module'
import { AuthUserService } from '@src/auth/authuser.service'
import { AUTH_USER_SERVICE_MOCK } from '@src/auth/authuser.service.mock'
import { CommonModule } from '@src/common/common.module'
import { TransformService } from '@src/common/transform'
import { generateID } from '@src/db/base.entity'
import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { GeoModule } from '@src/geo/geo.module'
import { PlacesArgs } from '@src/geo/place.model'
import { PlaceService } from '@src/geo/place.service'
import { MIKRO_TEST_CONFIG } from '@src/mikro-orm-test.config'
import { WindmillMockService } from '@src/windmill/windmill.mock.service'
import { WindmillService } from '@src/windmill/windmill.service'

describe('PlaceService', () => {
  let module: TestingModule
  let service: PlaceService
  let transform: TransformService
  let orm: MikroORM

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [CommonModule, MikroOrmModule.forRoot(MIKRO_TEST_CONFIG), AuthModule, GeoModule],
    })
      .overrideProvider(AuthUserService)
      .useValue(AUTH_USER_SERVICE_MOCK)
      .overrideProvider(WindmillService)
      .useClass(WindmillMockService)
      .compile()

    service = module.get<PlaceService>(PlaceService)
    transform = module.get<TransformService>(TransformService)
    orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'public', ['users'])
    await orm.getSeeder().seed(BaseSeeder, UserSeeder)
  }, 60000)

  afterAll(async () => {
    if (module) {
      await module.close()
    }
  })

  test('should be defined', () => {
    expect(service).toBeDefined()
  })

  test('should find places ordered by relevance with a cursor without crashing on count', async () => {
    const cursor = Buffer.from(JSON.stringify({ order: 0, id: generateID() })).toString('base64')
    const [, filter] = await transform.paginationArgs(PlacesArgs, { after: cursor } as any)
    const result = await service.find(filter)
    expect(result).toBeDefined()
    expect(typeof result.count).toBe('number')
  })
})
