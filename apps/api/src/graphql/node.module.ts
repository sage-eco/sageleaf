import { Module } from '@nestjs/common'

import { NodeResolver } from '@src/graphql/node.resolver'

@Module({
  providers: [NodeResolver],
})
export class NodeModule {}
