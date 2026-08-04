import { Mistral } from '@mistralai/mistralai'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { OtelLogger } from '@src/common/otel-logger.service'

@Injectable()
export class MistralService {
  private readonly mistral: Mistral | null = null
  private readonly logger = new OtelLogger(MistralService.name)

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('mistral.apiKey')
    if (apiKey) {
      this.mistral = new Mistral({ apiKey })
      this.logger.log('MistralService initialized')
    } else {
      this.logger.warn('MISTRAL_API_KEY is not configured, embeddings will not be generated')
    }
  }

  async getEmbedding(text: string): Promise<number[] | null> {
    if (!this.mistral) {
      return null
    }

    try {
      const response = await this.mistral.embeddings.create({
        model: 'mistral-embed',
        inputs: [text],
      })

      return (response.data?.[0]?.embedding as number[]) ?? null
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to generate embedding for query: ${message}`)
      return null
    }
  }
}
