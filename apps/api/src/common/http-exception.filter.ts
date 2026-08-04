import { DriverException } from '@mikro-orm/core'
import { ArgumentsHost, Catch, HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql'
import { logs, SeverityNumber } from '@opentelemetry/api-logs'
import { Response } from 'express'
import { GraphQLError } from 'graphql'
import { ZodError } from 'zod/v4'

import { isDev, isProd } from '@src/common/common.utils'
import {
  BaseException,
  ErrorEntry,
  httpStatusToCode,
  zodIssuesToFieldErrors,
} from '@src/common/exceptions'
import { PosthogService } from '@src/common/posthog.service'

const otelLogger = logs.getLogger('api')

@Injectable()
@Catch()
export class HttpExceptionFilter implements GqlExceptionFilter {
  constructor(private readonly posthog: PosthogService) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const gql = GqlArgumentsHost.create(host)
    const ctx = gql.switchToHttp()
    const response = ctx.getResponse<Response>()

    // If there is no HTTP response object we are in a GraphQL context —
    // return a GraphQLError so Apollo formats it correctly.
    if (!response?.status) {
      return this.toGraphQLError(exception)
    }

    // HTTP (REST) context — send a JSON response.
    const { status, errors } = this.toHttpResponse(exception)
    response.status(status).json({ errors })
  }

  private toGraphQLError(exception: unknown): GraphQLError {
    if (exception instanceof GraphQLError) {
      return exception
    }

    if (exception instanceof ZodError) {
      return new GraphQLError('Validation failed', {
        extensions: {
          code: 'BAD_REQUEST',
          fieldErrors: zodIssuesToFieldErrors(exception.issues),
        },
      })
    }

    if (exception instanceof BaseException) {
      return new GraphQLError(exception.errors[0]?.message || 'Request failed', {
        extensions: {
          code: httpStatusToCode(exception.getStatus()),
          fieldErrors: exception.errors,
        },
      })
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      return new GraphQLError(exception.message, {
        extensions: {
          code: httpStatusToCode(status),
        },
      })
    }

    if (exception instanceof DriverException) {
      this.logError(exception)
      return new GraphQLError('Internal server error', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      })
    }

    this.logError(exception)
    return new GraphQLError('Internal server error', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    })
  }

  private toHttpResponse(exception: unknown): { status: number; errors: ErrorEntry[] } {
    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        errors: zodIssuesToFieldErrors(exception.issues),
      }
    }

    if (exception instanceof BaseException) {
      return { status: exception.getStatus(), errors: exception.errors }
    }

    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        errors: [{ message: exception.message }],
      }
    }

    this.logError(exception)
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errors: [{ message: 'Internal server error' }],
    }
  }

  private logError(exception: unknown) {
    const err = exception instanceof Error ? exception : new Error(String(exception))
    otelLogger.emit({
      severityText: 'error',
      severityNumber: SeverityNumber.ERROR,
      body: err.message,
      attributes: {
        exceptionType: err.constructor?.name,
        stack: err.stack,
      },
    })

    this.posthog.captureException(exception)

    if (!isProd() || isDev()) {
      // oxlint-disable-next-line no-console
      console.error('Unhandled exception:', exception)
    }
  }
}
