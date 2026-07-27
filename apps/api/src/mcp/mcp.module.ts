import { Module } from '@nestjs/common'

import { AuthModule } from '@src/auth/auth.module'
import { ChangesModule } from '@src/changes/changes.module'
import { GeoModule } from '@src/geo/geo.module'
import { McpRateLimitGuard } from '@src/mcp/mcp-rate-limit.guard'
import { McpController } from '@src/mcp/mcp.controller'
import { ProcessModule } from '@src/process/process.module'
import { ProductModule } from '@src/product/product.module'
import { RateLimitModule } from '@src/rate-limit/rate-limit.module'
import { SearchModule } from '@src/search/search.module'
import { UsersModule } from '@src/users/users.module'

@Module({
  imports: [
    AuthModule,
    SearchModule,
    ProductModule,
    ProcessModule,
    GeoModule,
    ChangesModule,
    RateLimitModule,
    UsersModule,
  ],
  controllers: [McpController],
  providers: [McpRateLimitGuard],
})
export class McpModule {}
