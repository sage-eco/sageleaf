import { ConsoleLogger } from '@nestjs/common'
import { logs, SeverityNumber } from '@opentelemetry/api-logs'

const otelLogger = logs.getLogger('api')

export class OtelLogger extends ConsoleLogger {
  error(message: unknown, ...rest: unknown[]) {
    super.error(message, ...rest)
    otelLogger.emit({
      severityText: 'error',
      severityNumber: SeverityNumber.ERROR,
      body: message instanceof Error ? message.message : String(message),
      attributes: {
        context: this.context,
        stack: message instanceof Error ? message.stack : undefined,
      },
    })
  }

  warn(message: unknown, ...rest: unknown[]) {
    super.warn(message, ...rest)
    otelLogger.emit({
      severityText: 'warn',
      severityNumber: SeverityNumber.WARN,
      body: String(message),
      attributes: { context: this.context },
    })
  }
}
