import { z } from 'zod'
import { eq, sql, and, gte, lte, desc, count, avg, sum, or, like } from 'drizzle-orm'
import { 
  db, 
  users, 
  auditLog
} from '../db/index.js'
import { adminProcedure, router } from './trpc.js'

// Mock cron jobs data structure - in production, you'd have a proper cronJobs table
const mockCronJobs = [
  {
    id: 1,
    name: 'Update Item Prices',
    description: 'Fetches latest item prices from OSRS Wiki API and updates database',
    schedule: '*/5 * * * *',
    scheduleDescription: 'Every 5 minutes',
    command: 'npm run update-prices',
    category: 'data-sync',
    enabled: true,
    timeout: 300,
    retries: 3,
    notifications: true,
    lastRun: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    nextRun: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    status: 'success',
    duration: 45,
    successRate: 98.5,
    totalRuns: 2880,
    failedRuns: 43,
    avgDuration: 42,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: 2,
    name: 'Generate Daily Reports',
    description: 'Creates and emails daily performance reports to administrators',
    schedule: '0 6 * * *',
    scheduleDescription: 'Daily at 6:00 AM',
    command: 'npm run generate-reports',
    category: 'reporting',
    enabled: true,
    timeout: 600,
    retries: 2,
    notifications: true,
    lastRun: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    nextRun: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    status: 'success',
    duration: 120,
    successRate: 100,
    totalRuns: 25,
    failedRuns: 0,
    avgDuration: 115,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z'
  },
  {
    id: 3,
    name: 'Clean Temp Files',
    description: 'Removes temporary files and clears cache directories',
    schedule: '0 2 * * 0',
    scheduleDescription: 'Weekly on Sunday at 2:00 AM',
    command: 'npm run cleanup',
    category: 'maintenance',
    enabled: true,
    timeout: 1800,
    retries: 1,
    notifications: false,
    lastRun: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    nextRun: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'success',
    duration: 890,
    successRate: 95.2,
    totalRuns: 21,
    failedRuns: 1,
    avgDuration: 850,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-10T16:45:00Z'
  },
  {
    id: 4,
    name: 'Database Backup',
    description: 'Creates encrypted backup of main database and uploads to cloud storage',
    schedule: '0 3 * * *',
    scheduleDescription: 'Daily at 3:00 AM',
    command: 'npm run backup-db',
    category: 'backup',
    enabled: true,
    timeout: 3600,
    retries: 3,
    notifications: true,
    lastRun: new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString(),
    nextRun: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    status: 'failed',
    duration: 3600,
    successRate: 92.0,
    totalRuns: 25,
    failedRuns: 2,
    avgDuration: 1820,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-22T11:20:00Z'
  }
]

const mockExecutions = [
  {
    id: 1,
    jobId: 1,
    jobName: 'Update Item Prices',
    status: 'success',
    startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 4.25 * 60 * 1000).toISOString(),
    duration: 45,
    output: 'Successfully updated 15,234 item prices\nProcessed 8 new items\nUpdated 234 price changes\nExecution completed successfully',
    errorMessage: null
  },
  {
    id: 2,
    jobId: 2,
    jobName: 'Generate Daily Reports',
    status: 'success',
    startTime: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 18 * 60 * 60 * 1000 + 120 * 1000).toISOString(),
    duration: 120,
    output: 'Generated daily performance report\nSent reports to 3 administrators\nReport includes: user metrics, revenue data, system performance\nAll emails delivered successfully',
    errorMessage: null
  },
  {
    id: 3,
    jobId: 4,
    jobName: 'Database Backup',
    status: 'failed',
    startTime: new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    duration: 3600,
    output: 'Starting database backup...\nCreating dump of main database...\nCompressing backup file...\nUploading to cloud storage...',
    errorMessage: 'Upload failed: Connection timeout after 3600 seconds. Cloud storage may be unreachable.'
  }
]

export const adminCronJobsRouter = router({
  // Get all cron jobs
  getAllJobs: adminProcedure
    .query(async () => {
      // In production, this would query a cronJobs table
      // For now, return mock data with calculated next runs
      const jobs = mockCronJobs.map(job => ({
        ...job,
        nextRun: job.enabled ? job.nextRun : null
      }))

      return {
        jobs,
        stats: {
          totalJobs: jobs.length,
          activeJobs: jobs.filter(j => j.enabled).length,
          runningJobs: jobs.filter(j => j.status === 'running').length,
          failedJobs: jobs.filter(j => j.status === 'failed').length
        }
      }
    }),

  // Get job execution history
  getExecutionHistory: adminProcedure
    .input(z.object({
      jobId: z.number().optional(),
      limit: z.number().default(50),
      page: z.number().default(1)
    }))
    .query(async ({ input }) => {
      const { jobId, limit, page } = input
      
      let executions = mockExecutions
      if (jobId) {
        executions = executions.filter(e => e.jobId === jobId)
      }

      // Generate execution trend data for the last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return date.toISOString().split('T')[0]
      })

      const executionTrend = last7Days.map(date => {
        const dayExecutions = executions.filter(e => 
          e.startTime.startsWith(date)
        )
        return {
          date,
          total: dayExecutions.length + Math.floor(Math.random() * 10), // Mock data
          success: dayExecutions.filter(e => e.status === 'success').length + Math.floor(Math.random() * 8),
          failed: dayExecutions.filter(e => e.status === 'failed').length + Math.floor(Math.random() * 2)
        }
      })

      const offset = (page - 1) * limit
      const paginatedExecutions = executions.slice(offset, offset + limit)

      return {
        executions: paginatedExecutions,
        executionTrend,
        pagination: {
          page,
          limit,
          total: executions.length,
          totalPages: Math.ceil(executions.length / limit)
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
      // In production, this would insert into cronJobs table
      const newJob = {
        ...input,
        id: Math.max(...mockCronJobs.map(j => j.id)) + 1,
        status: input.enabled ? 'idle' : 'disabled',
        lastRun: null,
        nextRun: input.enabled ? new Date(Date.now() + 60000).toISOString() : null,
        duration: 0,
        successRate: 0,
        totalRuns: 0,
        failedRuns: 0,
        avgDuration: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      mockCronJobs.push(newJob)

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'create_cron_job',
        resource: 'cron_job',
        resourceId: newJob.id.toString(),
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
      jobId: z.number(),
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
      
      // In production, this would update the cronJobs table
      const jobIndex = mockCronJobs.findIndex(j => j.id === jobId)
      if (jobIndex === -1) {
        throw new Error('Job not found')
      }

      const updatedJob = {
        ...mockCronJobs[jobIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      }

      mockCronJobs[jobIndex] = updatedJob

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'update_cron_job',
        resource: 'cron_job',
        resourceId: jobId.toString(),
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
      jobId: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      const { jobId } = input
      
      const jobIndex = mockCronJobs.findIndex(j => j.id === jobId)
      if (jobIndex === -1) {
        throw new Error('Job not found')
      }

      const deletedJob = mockCronJobs[jobIndex]
      mockCronJobs.splice(jobIndex, 1)

      // Also remove executions for this job
      const executionIndices = []
      mockExecutions.forEach((exec, index) => {
        if (exec.jobId === jobId) {
          executionIndices.push(index)
        }
      })
      executionIndices.reverse().forEach(index => {
        mockExecutions.splice(index, 1)
      })

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'delete_cron_job',
        resource: 'cron_job',
        resourceId: jobId.toString(),
        details: {
          deletedJobName: deletedJob.name,
          schedule: deletedJob.schedule
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return { success: true, message: 'Job deleted successfully' }
    }),

  // Toggle job enabled/disabled
  toggleJob: adminProcedure
    .input(z.object({
      jobId: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      const { jobId } = input
      
      const jobIndex = mockCronJobs.findIndex(j => j.id === jobId)
      if (jobIndex === -1) {
        throw new Error('Job not found')
      }

      const job = mockCronJobs[jobIndex]
      const newEnabledState = !job.enabled
      
      mockCronJobs[jobIndex] = {
        ...job,
        enabled: newEnabledState,
        status: newEnabledState ? 'idle' : 'disabled',
        nextRun: newEnabledState ? new Date(Date.now() + 60000).toISOString() : null,
        updatedAt: new Date().toISOString()
      }

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: newEnabledState ? 'enable_cron_job' : 'disable_cron_job',
        resource: 'cron_job',
        resourceId: jobId.toString(),
        details: {
          jobName: job.name,
          enabled: newEnabledState
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return mockCronJobs[jobIndex]
    }),

  // Manually run job
  runJob: adminProcedure
    .input(z.object({
      jobId: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      const { jobId } = input
      
      const job = mockCronJobs.find(j => j.id === jobId)
      if (!job) {
        throw new Error('Job not found')
      }

      if (!job.enabled) {
        throw new Error('Cannot run disabled job')
      }

      // Update job status to running
      const jobIndex = mockCronJobs.findIndex(j => j.id === jobId)
      mockCronJobs[jobIndex] = {
        ...job,
        status: 'running',
        lastRun: new Date().toISOString()
      }

      // Create execution record
      const execution = {
        id: Math.max(...mockExecutions.map(e => e.id), 0) + 1,
        jobId,
        jobName: job.name,
        status: 'running',
        startTime: new Date().toISOString(),
        endTime: null,
        duration: 0,
        output: 'Job started manually...',
        errorMessage: null
      }

      mockExecutions.unshift(execution)

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'run_cron_job',
        resource: 'cron_job',
        resourceId: jobId.toString(),
        details: {
          jobName: job.name,
          manualTrigger: true
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      // Simulate job completion after a delay (in a real system, this would be handled by the job runner)
      setTimeout(() => {
        const success = Math.random() > 0.1 // 90% success rate
        const duration = Math.floor(Math.random() * 120) + 30 // 30-150 seconds
        
        // Update execution
        const execIndex = mockExecutions.findIndex(e => e.id === execution.id)
        if (execIndex !== -1) {
          mockExecutions[execIndex] = {
            ...execution,
            status: success ? 'success' : 'failed',
            endTime: new Date().toISOString(),
            duration,
            output: success 
              ? `${execution.output}\nJob completed successfully after ${duration} seconds`
              : `${execution.output}\nJob failed after ${duration} seconds`,
            errorMessage: success ? null : 'Simulated random failure for testing'
          }
        }

        // Update job status
        const currentJobIndex = mockCronJobs.findIndex(j => j.id === jobId)
        if (currentJobIndex !== -1) {
          mockCronJobs[currentJobIndex] = {
            ...mockCronJobs[currentJobIndex],
            status: success ? 'success' : 'failed',
            duration,
            totalRuns: mockCronJobs[currentJobIndex].totalRuns + 1,
            failedRuns: success ? mockCronJobs[currentJobIndex].failedRuns : mockCronJobs[currentJobIndex].failedRuns + 1
          }
        }
      }, 5000) // Complete after 5 seconds

      return execution
    })
})