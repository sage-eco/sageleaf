import { BaseEntity, EntityName } from '@mikro-orm/core'
import { Injectable } from '@nestjs/common'
import { DiscoveryService } from '@nestjs/core'
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper'

import { JSONObject } from '@src/common/z.schema'
import { IEntityService, IsEntityService } from '@src/db/base.entity'
import { BaseModel } from '@src/graphql/base.model'

/**
 * Marks a class as an schema service.
 * Used to dynamically discover schema services at runtime,
 * for example, to get create/update models for entities.
 */
export const IsSchemaService = DiscoveryService.createDecorator()

export interface ISchemaService<E extends BaseEntity = BaseEntity> {
  OutputModel: new () => BaseModel
  CreateInputModel: new () => BaseModel
  UpdateInputModel: new () => BaseModel

  createInputModel(entity: E | null): Promise<JSONObject>
  updateInputModel(entity: E): Promise<JSONObject>
}

@Injectable()
export class MetaService {
  private isInit = false
  private entityServicesByString: Map<string, InstanceWrapper<any>> = new Map()
  private entityServicesByEntity: Map<Function, InstanceWrapper<any>> = new Map()
  private schemaServicesByEntity: Map<Function, InstanceWrapper<any>> = new Map()

  constructor(private readonly discovery: DiscoveryService) {}

  allEntityServices(): IEntityService<any>[] | any {
    return Array.from(this.entityServicesByEntity.values()).map((wrapper) => wrapper.instance)
  }

  findEntityService(
    entity: EntityName<any> | BaseEntity | Function,
  ): [string, IEntityService<any>] | null {
    if (!this.isInit) {
      this.cacheProviders()
      this.isInit = true
    }
    let wrapper: InstanceWrapper<any> | undefined
    if (typeof entity === 'function') {
      wrapper = this.entityServicesByEntity.get(entity)
    } else if (typeof entity === 'string') {
      wrapper = this.entityServicesByString.get(entity)
    } else if (entity instanceof BaseEntity) {
      wrapper = this.entityServicesByEntity.get(entity as any)
    }
    return wrapper?.instance ? [wrapper.name, wrapper.instance] : null
  }

  findSchemaService(
    entity: EntityName<any> | BaseEntity | Function,
  ): [string, ISchemaService<BaseEntity>] | null {
    if (!this.isInit) {
      this.cacheProviders()
      this.isInit = true
    }
    let wrapper: InstanceWrapper<any> | undefined
    if (typeof entity === 'function') {
      wrapper = this.schemaServicesByEntity.get(entity)
    } else if (entity instanceof BaseEntity) {
      wrapper = this.schemaServicesByEntity.get(entity as any)
    }
    return wrapper?.instance ? [wrapper.name, wrapper.instance] : null
  }

  private cacheProviders() {
    const providers = this.discovery.getProviders()
    const entityServices = providers.filter((p) =>
      this.discovery.getMetadataByDecorator(IsEntityService, p),
    )
    for (const p of entityServices) {
      const entityClass = this.discovery.getMetadataByDecorator(IsEntityService, p) as Function
      this.entityServicesByString.set(entityClass.name, p)
      this.entityServicesByEntity.set(entityClass, p)
    }
    const schemaServices = providers.filter((p) =>
      this.discovery.getMetadataByDecorator(IsSchemaService, p),
    )
    for (const p of schemaServices) {
      this.schemaServicesByEntity.set(
        this.discovery.getMetadataByDecorator(IsSchemaService, p) as Function,
        p,
      )
    }
  }
}
