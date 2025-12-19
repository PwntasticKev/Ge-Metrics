import { z } from 'zod'
import { eq, sql, and, gte, lte, desc, count, avg, sum, or, like } from 'drizzle-orm'
import { 
  db, 
  users, 
  auditLog,
  cronJobs,
  cronJobLogs
} from '../db/index.js'
import { adminProcedure, router } from './trpc.js'

export const adminCronJobsRouter = router({
  // Get all cron jobs
  getAllJobs: adminProcedure
    .query(async () => {
      // Get all cron jobs from database
      const jobs = await db.select().from(cronJobs).orderBy(desc(cronJobs.createdAt))

      // Calculate stats for each job from execution logs
      const jobsWithStats = await Promise.all(
        jobs.map(async (job) => {
          const [totalExecutions] = await db
            .select({ count: count() })
            .from(cronJobLogs)
            .where(eq(cronJobLogs.jobName, job.name))

          const [successfulExecutions] = await db
            .select({ count: count() })
            .from(cronJobLogs)
            .where(and(
              eq(cronJobLogs.jobName, job.name),
              eq(cronJobLogs.status, 'completed')
            ))

          const [averageDuration] = await db
            .select({ avg: avg(cronJobLogs.duration) })
            .from(cronJobLogs)
            .where(and(
              eq(cronJobLogs.jobName, job.name),
              eq(cronJobLogs.status, 'completed')
            ))

          const [lastExecution] = await db
            .select()
            .from(cronJobLogs)
            .where(eq(cronJobLogs.jobName, job.name))
            .orderBy(desc(cronJobLogs.startedAt))
            .limit(1)

          const totalRuns = totalExecutions.count || 0
          const successRuns = successfulExecutions.count || 0
          const failedRuns = totalRuns - successRuns
          const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0
          const avgDuration = Math.round(Number(averageDuration.avg) / 1000) || 0 // Convert to seconds

          return {
            ...job,
            lastRun: lastExecution?.startedAt || null,
            duration: lastExecution?.duration ? Math.round(lastExecution.duration / 1000) : 0,
            successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
            totalRuns,
            failedRuns,
            avgDuration
          }
        })
      )

      const stats = {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => j.enabled).length,
        runningJobs: jobs.filter(j => j.status === 'running').length,
        failedJobs: jobs.filter(j => j.status === 'failed').length
      }

      return {
        jobs: jobsWithStats,
        stats
      }
    }),

  // Get job execution history
  getExecutionHistory: adminProcedure
    .input(z.object({
      jobId: z.string().optional(),
      limit: z.number().default(50),
      page: z.number().default(1)
    }))
    .query(async ({ input }) => {
      const { jobId, limit, page } = input
      
      let jobName: string | undefined
      
      if (jobId) {
        // Find job name by ID for filtering
        const [job] = await db.select().from(cronJobs).where(eq(cronJobs.id, jobId))
        if (job) {
          jobName = job.name
        }
      }

      const query = db.select().from(cronJobLogs)
      const executions = await (
        jobName ? 
          query.where(eq(cronJobLogs.jobName, jobName)) :
          query
      )
        .orderBy(desc(cronJobLogs.startedAt))
        .limit(limit)
        .offset((page - 1) * limit)

      // Get execution trend data for the last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return date.toISOString().split('T')[0]
      })

      const executionTrend = await Promise.all(
        last7Days.map(async (date) => {
          const startOfDay = new Date(date + 'T00:00:00Z')
          const endOfDay = new Date(date + 'T23:59:59Z')

          const [total] = await db
            .select({ count: count() })
            .from(cronJobLogs)
            .where(and(
              gte(cronJobLogs.startedAt, startOfDay),
              lte(cronJobLogs.startedAt, endOfDay)
            ))

          const [successful] = await db
            .select({ count: count() })
            .from(cronJobLogs)
            .where(and(
              gte(cronJobLogs.startedAt, startOfDay),
              lte(cronJobLogs.startedAt, endOfDay),
              eq(cronJobLogs.status, 'completed')
            ))

          const [failed] = await db
            .select({ count: count() })
            .from(cronJobLogs)
            .where(and(
              gte(cronJobLogs.startedAt, startOfDay),
              lte(cronJobLogs.startedAt, endOfDay),
              eq(cronJobLogs.status, 'failed')
            ))

          return {
            date,
            total: total.count || 0,
            success: successful.count || 0,
            failed: failed.count || 0
          }
        })
      )

      // Get total count for pagination
      const [totalCount] = await db
        .select({ count: count() })
        .from(cronJobLogs)

      return {
        executions: executions.map(exec => ({
          id: exec.id,
          jobName: exec.jobName,
          status: exec.status,
          startTime: exec.startedAt,
          endTime: exec.completedAt,
          duration: exec.duration ? Math.round(exec.duration / 1000) : 0, // Convert to seconds
          output: exec.logs || 'No output available',
          errorMessage: exec.errorMessage
        })),
        executionTrend,
        pagination: {
          page,
          limit,
          total: totalCount.count || 0,
          totalPages: Math.ceil((totalCount.count || 0) / limit)
        }
      }
    }),

  // Create new cron job
  createJob: adminProcedure
    .input(z.object({
      name: z.string(),
      description: z.string(),
      schedule: z.string(),
      command: z.string(),
      category: z.string(),
      enabled: z.boolean().default(true),
      timeout: z.number().default(300),
      retries: z.number().default(3),
      notifications: z.boolean().default(true)
    }))
    .mutation(async ({ input, ctx }) => {
      const [newJob] = await db.insert(cronJobs).values({
        ...input,
        status: input.enabled ? 'idle' : 'disabled',
        createdBy: ctx.user.id
      }).returning()

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'create_cron_job',
        resource: 'cron_job',
        resourceId: newJob.id,
        details: {
          jobName: newJob.name,
          schedule: newJob.schedule,
          enabled: newJob.enabled
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return newJob
    }),

  // Update cron job
  updateJob: adminProcedure
    .input(z.object({
      jobId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      schedule: z.string().optional(),
      command: z.string().optional(),
      category: z.string().optional(),
      enabled: z.boolean().optional(),
      timeout: z.number().optional(),
      retries: z.number().optional(),
      notifications: z.boolean().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { jobId, ...updateData } = input
      
      const [updatedJob] = await db
        .update(cronJobs)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(cronJobs.id, jobId))
        .returning()

      if (!updatedJob) {
        throw new Error('Job not found')
      }

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'update_cron_job',
        resource: 'cron_job',
        resourceId: jobId,
        details: {
          jobName: updatedJob.name,
          changes: updateData
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return updatedJob
    }),

  // Delete cron job
  deleteJob: adminProcedure
    .input(z.object({
      jobId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { jobId } = input
      
      // Get job before deletion for logging
      const [job] = await db.select().from(cronJobs).where(eq(cronJobs.id, jobId))
      if (!job) {
        throw new Error('Job not found')
      }

      // Delete the job
      await db.delete(cronJobs).where(eq(cronJobs.id, jobId))

      // Delete associated execution logs
      await db.delete(cronJobLogs).where(eq(cronJobLogs.jobName, job.name))

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'delete_cron_job',
        resource: 'cron_job',
        resourceId: jobId,
        details: {
          deletedJobName: job.name,
          schedule: job.schedule
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return { success: true, message: 'Job deleted successfully' }
    }),

  // Toggle job enabled/disabled
  toggleJob: adminProcedure
    .input(z.object({
      jobId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { jobId } = input
      
      // Get current job state
      const [job] = await db.select().from(cronJobs).where(eq(cronJobs.id, jobId))
      if (!job) {
        throw new Error('Job not found')
      }

      const newEnabledState = !job.enabled
      
      const [updatedJob] = await db
        .update(cronJobs)
        .set({
          enabled: newEnabledState,
          status: newEnabledState ? 'idle' : 'disabled',
          updatedAt: new Date()
        })
        .where(eq(cronJobs.id, jobId))
        .returning()

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: newEnabledState ? 'enable_cron_job' : 'disable_cron_job',
        resource: 'cron_job',
        resourceId: jobId,
        details: {
          jobName: job.name,
          enabled: newEnabledState
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return updatedJob
    }),

  // Manually run job
  runJob: adminProcedure
    .input(z.object({
      jobId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { jobId } = input
      
      const [job] = await db.select().from(cronJobs).where(eq(cronJobs.id, jobId))
      if (!job) {
        throw new Error('Job not found')
      }

      if (!job.enabled) {
        throw new Error('Cannot run disabled job')
      }

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'run_cron_job',
        resource: 'cron_job',
        resourceId: jobId,
        details: {
          jobName: job.name,
          manualTrigger: true
        },
        ipAddress: ctx.req?.ip,
        userAgent: ctx.req?.headers?.['user-agent']
      })

      // Import executor dynamically to avoid circular dependencies
      const { executeJob } = await import('../services/cronJobExecutor.js')
      
      // Execute the job (this will handle status updates and logging)
      const result = await executeJob(job.name)

      // Get the latest execution log
      const [execution] = await db
        .select()
        .from(cronJobLogs)
        .where(eq(cronJobLogs.jobName, job.name))
        .orderBy(desc(cronJobLogs.startedAt))
        .limit(1)

      return {
        id: execution?.id || null,
        jobName: job.name,
        status: result.success ? 'completed' : 'failed',
        startTime: execution?.startedAt || new Date(),
        endTime: execution?.completedAt || new Date(),
        duration: result.duration,
        output: result.logs,
        errorMessage: result.error || null
      }
    })
})