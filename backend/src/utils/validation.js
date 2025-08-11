import { z } from 'zod';

// CQL Execution Request Schema
export const CQLExecutionRequestSchema = z.object({
  code: z.string().min(1, 'CQL code is required'),
  terminologyServiceUri: z.string().url().optional(),
  dataServiceUri: z.string().url().optional(),
  patientId: z.string().optional(),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.string(),
    value: z.any()
  })).optional()
});

// CQL Format Request Schema
export const CQLFormatRequestSchema = z.object({
  code: z.string().min(1, 'CQL code is required')
});

// Health Check Query Schema
export const HealthCheckQuerySchema = z.object({
  detailed: z.string().optional().transform(val => val === 'true')
}).optional();