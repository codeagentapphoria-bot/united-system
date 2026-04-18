/**
 * Bull-backed queue for audit events.
 *
 * Audit logging was previously synchronous (Winston file write + dev-dashboard
 * ring-buffer push on every login / permission denial / sensitive endpoint
 * access). At 80k users that added measurable I/O to every request path. This
 * queue decouples the "record the event" work from the request path: producers
 * call `enqueueAudit`, a processor registered at startup drains the queue and
 * invokes a handler that does the actual Winston write.
 *
 * Running the processor in the same Node process is fine — Bull's value here
 * isn't multi-process fan-out, it's unblocking the request thread.
 *
 * When Redis is unreachable the queue .add falls back to the in-process
 * handler so events aren't lost. Audit correctness > audit throughput.
 */

import Bull from 'bull';
import type { Queue } from 'bull';

const REDIS_URL =
  process.env.REDIS_URL || process.env.REDIS_INTERNAL_URL || 'redis://localhost:6379';

export interface AuditJobData {
  event: string;
  eventDetails: {
    userId?: string;
    userType?: string;
    ip?: string;
    userAgent?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    error?: string;
    [key: string]: unknown;
  };
  devLog?: {
    level: 'info' | 'warn' | 'error';
    message: string;
    context: Record<string, unknown>;
  };
}

export type AuditHandler = (data: AuditJobData) => void | Promise<void>;

let queue: Queue<AuditJobData> | null = null;
let inlineHandler: AuditHandler | null = null;
let processorStarted = false;

const getQueue = (): Queue<AuditJobData> | null => {
  if (queue) return queue;
  try {
    queue = new Bull<AuditJobData>('audit-log', REDIS_URL, {
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 500 },
      },
    });
    queue.on('error', (err) => {
      console.warn('[AUDIT-QUEUE] Error:', err.message);
    });
    return queue;
  } catch (err) {
    console.warn('[AUDIT-QUEUE] init failed:', (err as Error).message);
    return null;
  }
};

/**
 * Register the handler that the processor will invoke for each job.
 * Must be called before `startAuditProcessor`. Also used as the inline
 * fallback when the queue is unreachable.
 */
export const setAuditHandler = (handler: AuditHandler): void => {
  inlineHandler = handler;
};

/**
 * Enqueue an audit event. Non-blocking on the request path.
 * Falls back to invoking the handler inline if the queue is unavailable.
 */
export const enqueueAudit = async (data: AuditJobData): Promise<void> => {
  const q = getQueue();
  if (!q) {
    if (inlineHandler) await inlineHandler(data);
    return;
  }
  try {
    await q.add(data);
  } catch (err) {
    console.warn('[AUDIT-QUEUE] enqueue failed, writing inline:', (err as Error).message);
    if (inlineHandler) await inlineHandler(data);
  }
};

/**
 * Start the processor. Idempotent — safe to call more than once.
 */
export const startAuditProcessor = (concurrency = 10): void => {
  if (processorStarted) return;
  const q = getQueue();
  if (!q || !inlineHandler) return;
  const handler = inlineHandler;
  q.process(concurrency, async (job) => {
    await handler(job.data);
  });
  processorStarted = true;
};
