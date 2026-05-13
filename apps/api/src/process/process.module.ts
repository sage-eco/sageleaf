import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'
import { ClsModule } from 'nestjs-cls'

import { AuthModule } from '@src/auth/auth.module'
import { EditsModule } from '@src/changes/edits.module'
import { CommonModule } from '@src/common/common.module'
import { GeoModule } from '@src/geo/geo.module'
import { ComponentHistoryResolver, ComponentResolver } from '@src/process/component.resolver'
import { ComponentSchemaService } from '@src/process/component.schema'
import { ComponentService } from '@src/process/component.service'
import { MaterialResolver } from '@src/process/material.resolver'
import { MaterialSchemaService } from '@src/process/material.schema'
import { MaterialService } from '@src/process/material.service'
import { ProcessHistoryResolver, ProcessResolver } from '@src/process/process.resolver'
import { ProcessSchemaService } from '@src/process/process.schema'
import { ProcessService } from '@src/process/process.service'
import { ProgramResolver } from '@src/process/program.resolver'
import { ProgramSchemaService } from '@src/process/program.schema'
import { ProgramService } from '@src/process/program.service'
import {
  RecyclingStreamResolver,
  ReduceStreamResolver,
  ReuseStreamResolver,
} from '@src/process/stream.resolver'
import { StreamService } from '@src/process/stream.service'
import { TagResolver } from '@src/process/tag.resolver'
import { TagSchemaService } from '@src/process/tag.schema'
import { TagService } from '@src/process/tag.service'
import { ImageSchemaService } from '@src/product/image.schema'
import { VariantService } from '@src/product/variant.service'
import { SearchModule } from '@src/search/search.module'
import { UsersModule } from '@src/users/users.module'

@Module({
  imports: [
    CommonModule,
    MikroOrmModule.forFeature([]),
    AuthModule,
    ClsModule.forFeature(),
    EditsModule,
    GeoModule,
    SearchModule,
    UsersModule,
  ],
  providers: [
    MaterialResolver,
    MaterialService,
    MaterialSchemaService,
    ComponentResolver,
    ComponentService,
    ComponentSchemaService,
    ComponentHistoryResolver,
    ImageSchemaService,
    ProcessResolver,
    ProcessService,
    ProcessSchemaService,
    ProcessHistoryResolver,
    ProgramResolver,
    ProgramService,
    ProgramSchemaService,
    TagResolver,
    TagService,
    TagSchemaService,
    StreamService,
    RecyclingStreamResolver,
    ReduceStreamResolver,
    ReuseStreamResolver,
    VariantService,
  ],
  exports: [
    TagService,
    TagSchemaService,
    StreamService,
    ComponentService,
    ComponentSchemaService,
    ProcessService,
    ProcessSchemaService,
    ProgramService,
    ProgramSchemaService,
    MaterialService,
    MaterialSchemaService,
  ],
})
export class ProcessModule {}
