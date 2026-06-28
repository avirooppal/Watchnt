import type { JobId } from '@watchnt/shared';

export interface WorkerMessage<T = unknown> {
  type: string;
  payload: T;
  jobId?: JobId;
}

export interface JobRequest<T = unknown> {
  jobId: JobId;
  type: string;
  payload: T;
  transfer?: Transferable[];
}

export interface JobResponse<T = unknown> {
  jobId: JobId;
  type: 'success' | 'error' | 'progress';
  payload?: T;
  error?: string;
  progress?: number;
}
