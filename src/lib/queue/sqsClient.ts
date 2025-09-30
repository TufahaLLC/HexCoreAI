import type { MatchWorkItem } from '@/types/queue';

/**
 * Temporary in-memory queue used during local development.
 * This will be replaced by a real SQS-backed implementation in a future phase.
 */
const inMemoryQueue: MatchWorkItem[] = [];

export async function enqueueMatchWorkItem(item: MatchWorkItem): Promise<void> {
  inMemoryQueue.push(item);
}

export async function dequeueBatch(limit = 10): Promise<MatchWorkItem[]> {
  if (limit <= 0) return [];
  return inMemoryQueue.splice(0, limit);
}

export function getQueueDepth(): number {
  return inMemoryQueue.length;
}

export function clearQueue(): void {
  inMemoryQueue.length = 0;
}
