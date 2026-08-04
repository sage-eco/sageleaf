import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JobService, OpenAPI } from 'windmill-client'
import type { CompletedJob, Job } from 'windmill-client'

import { OtelLogger } from '@src/common/otel-logger.service'

export interface RunOpts {
  workspace?: string
  scheduledFor?: string
  scheduledInSecs?: number
  jobId?: string
}

/** Options for wait-result variants — scheduling is not supported when blocking for a result. */
export type WaitRunOpts = Omit<RunOpts, 'scheduledFor' | 'scheduledInSecs'>

export interface PollOpts {
  workspace?: string
  intervalMs?: number
  timeoutMs?: number
}

export interface IWindmillService {
  runScript(path: string, args: Record<string, unknown>, opts?: RunOpts): Promise<string>
  runFlow(path: string, args: Record<string, unknown>, opts?: RunOpts): Promise<string>
  runScriptAndWait<T = unknown>(
    path: string,
    args: Record<string, unknown>,
    opts?: WaitRunOpts,
  ): Promise<T>
  runFlowAndWait<T = unknown>(
    path: string,
    args: Record<string, unknown>,
    opts?: WaitRunOpts,
  ): Promise<T>
  getJob(id: string, workspace?: string): Promise<Job>
  getJobResult<T = unknown>(id: string, workspace?: string): Promise<T>
  getCompletedJob(id: string, workspace?: string): Promise<CompletedJob>
  pollJobResult<T = unknown>(id: string, opts?: PollOpts): Promise<T>
}

@Injectable()
export class WindmillService implements OnModuleInit, IWindmillService {
  private readonly logger = new OtelLogger(WindmillService.name)
  private defaultWorkspace!: string

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const baseUrl = this.config.get<string>('windmill.baseUrl')
    const token = this.config.get<string>('windmill.token')
    const workspace = this.config.get<string>('windmill.workspace')

    if (!baseUrl) throw new Error('WINDMILL_BASE_URL is required')
    if (!workspace) throw new Error('WINDMILL_WORKSPACE is required')

    this.defaultWorkspace = workspace
    OpenAPI.BASE = baseUrl
    if (token) {
      OpenAPI.TOKEN = token
    }

    this.logger.log(`Windmill client configured: ${baseUrl} (workspace: ${this.defaultWorkspace})`)
  }

  private workspace(override?: string): string {
    return override ?? this.defaultWorkspace
  }

  /** Run a script by path. Returns the job UUID. */
  async runScript(
    path: string,
    args: Record<string, unknown>,
    opts: RunOpts = {},
  ): Promise<string> {
    return JobService.runScriptByPath({
      workspace: this.workspace(opts.workspace),
      path,
      requestBody: args,
      scheduledFor: opts.scheduledFor,
      scheduledInSecs: opts.scheduledInSecs,
      jobId: opts.jobId,
    })
  }

  /** Run a flow by path. Returns the job UUID. */
  async runFlow(path: string, args: Record<string, unknown>, opts: RunOpts = {}): Promise<string> {
    return JobService.runFlowByPath({
      workspace: this.workspace(opts.workspace),
      path,
      requestBody: args,
      scheduledFor: opts.scheduledFor,
      scheduledInSecs: opts.scheduledInSecs,
      jobId: opts.jobId,
    })
  }

  /** Run a script and block until it completes. Returns the result value. */
  async runScriptAndWait<T = unknown>(
    path: string,
    args: Record<string, unknown>,
    opts: WaitRunOpts = {},
  ): Promise<T> {
    return JobService.runWaitResultScriptByPath({
      workspace: this.workspace(opts.workspace),
      path,
      requestBody: args,
      jobId: opts.jobId,
    }) as Promise<T>
  }

  /** Run a flow and block until it completes. Returns the result value. */
  async runFlowAndWait<T = unknown>(
    path: string,
    args: Record<string, unknown>,
    opts: WaitRunOpts = {},
  ): Promise<T> {
    return JobService.runWaitResultFlowByPath({
      workspace: this.workspace(opts.workspace),
      path,
      requestBody: args,
      jobId: opts.jobId,
    }) as Promise<T>
  }

  /** Get a job by ID (queued or completed). */
  async getJob(id: string, workspace?: string): Promise<Job> {
    return JobService.getJob({
      workspace: this.workspace(workspace),
      id,
    })
  }

  /** Get the result of a completed job. Throws if the job is not yet complete. */
  async getJobResult<T = unknown>(id: string, workspace?: string): Promise<T> {
    return JobService.getCompletedJobResult({
      workspace: this.workspace(workspace),
      id,
    }) as Promise<T>
  }

  /** Get the full details of a completed job. */
  async getCompletedJob(id: string, workspace?: string): Promise<CompletedJob> {
    return JobService.getCompletedJob({
      workspace: this.workspace(workspace),
      id,
    })
  }

  /**
   * Poll a job until it completes and return the result.
   * Uses getCompletedJobResultMaybe to avoid throwing on in-progress jobs.
   */
  async pollJobResult<T = unknown>(id: string, opts: PollOpts = {}): Promise<T> {
    const { intervalMs = 1000, timeoutMs = 5_000 } = opts
    const workspace = this.workspace(opts.workspace)
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      const result = await JobService.getCompletedJobResultMaybe({
        workspace,
        id,
      })

      if (result.completed) {
        return result.result as T
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    throw new Error(`Job ${id} did not complete within ${timeoutMs}ms`)
  }
}
