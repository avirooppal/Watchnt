import type { JobId } from '@watchnt/shared';
import type { JobRequest, JobResponse } from './types.js';

export interface WorkerPoolOptions {
  maxWorkers?: number;
  workerScriptUrl?: string; // URL or factory
  workerFactory?: () => Worker;
  defaultTimeoutMs?: number;
}

interface QueuedJob {
  request: JobRequest;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  onProgress?: (progress: number) => void;
  timeoutMs?: number;
}

interface ActiveJob extends QueuedJob {
  worker: Worker;
  timerId?: ReturnType<typeof setTimeout>;
}

export class WorkerPool {
  private workers: Set<Worker> = new Set();
  private idleWorkers: Worker[] = [];
  private activeJobs: Map<JobId, ActiveJob> = new Map();
  private queue: QueuedJob[] = [];
  
  private maxWorkers: number;
  private workerFactory: () => Worker;
  private defaultTimeoutMs: number;

  constructor(options: WorkerPoolOptions) {
    this.maxWorkers = options.maxWorkers || 2; // conservative default
    this.defaultTimeoutMs = options.defaultTimeoutMs || 30000;
    
    if (options.workerFactory) {
      this.workerFactory = options.workerFactory;
    } else if (options.workerScriptUrl) {
      this.workerFactory = () => new Worker(options.workerScriptUrl!, { type: 'module' });
    } else {
      throw new Error('Must provide workerScriptUrl or workerFactory');
    }
  }

  public dispatch<T, R = unknown>(
    request: JobRequest<T>, 
    options?: { onProgress?: (p: number) => void; timeoutMs?: number }
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      const job: QueuedJob = {
        request,
        resolve,
        reject,
        onProgress: options?.onProgress,
        timeoutMs: options?.timeoutMs || this.defaultTimeoutMs
      };

      this.queue.push(job);
      this.processQueue();
    });
  }

  public cancel(jobId: JobId): void {
    // Check queue first
    const qIndex = this.queue.findIndex(j => j.request.jobId === jobId);
    if (qIndex >= 0) {
      const job = this.queue[qIndex];
      this.queue.splice(qIndex, 1);
      job.reject(new Error('Job cancelled'));
      return;
    }

    // Check active jobs
    const active = this.activeJobs.get(jobId);
    if (active) {
      // Terminate the worker since it might be stuck
      this.terminateWorker(active.worker);
      this.cleanupJob(jobId, new Error('Job cancelled'));
    }
  }

  public destroy(): void {
    this.queue.forEach(job => job.reject(new Error('Pool destroyed')));
    this.queue = [];
    
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.timerId) clearTimeout(job.timerId);
      job.reject(new Error('Pool destroyed'));
    }
    this.activeJobs.clear();

    this.workers.forEach(w => w.terminate());
    this.workers.clear();
    this.idleWorkers = [];
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;

    let worker = this.idleWorkers.pop();

    if (!worker && this.workers.size < this.maxWorkers) {
      worker = this.createWorker();
    }

    if (!worker) {
      // All workers busy, wait for one to free up
      return;
    }

    const job = this.queue.shift()!;
    this.assignJob(worker, job);
  }

  private createWorker(): Worker {
    const worker = this.workerFactory();
    this.workers.add(worker);
    
    worker.onmessage = (e: MessageEvent<JobResponse>) => {
      this.handleWorkerMessage(worker, e.data);
    };

    worker.onerror = (e) => {
      // Find what job this worker was running
      const jobId = this.findJobByWorker(worker);
      if (jobId) {
        this.cleanupJob(jobId, new Error(`Worker error: ${e.message}`));
      }
      this.terminateWorker(worker);
    };

    return worker;
  }

  private assignJob(worker: Worker, job: QueuedJob): void {
    let timerId: ReturnType<typeof setTimeout> | undefined;

    if (job.timeoutMs && job.timeoutMs > 0) {
      timerId = setTimeout(() => {
        this.cancel(job.request.jobId);
      }, job.timeoutMs);
    }

    this.activeJobs.set(job.request.jobId, { ...job, worker, timerId });

    if (job.request.transfer && job.request.transfer.length > 0) {
      worker.postMessage(job.request, { transfer: job.request.transfer });
    } else {
      worker.postMessage(job.request);
    }
  }

  private handleWorkerMessage(worker: Worker, response: JobResponse): void {
    const active = this.activeJobs.get(response.jobId);
    if (!active || active.worker !== worker) {
      return; // Stale message or mismatch
    }

    if (response.type === 'progress' && active.onProgress) {
      active.onProgress(response.progress || 0);
      return;
    }

    if (response.type === 'error') {
      this.cleanupJob(response.jobId, new Error(response.error || 'Unknown worker error'));
    } else if (response.type === 'success') {
      this.cleanupJob(response.jobId, null, response.payload);
    }
  }

  private cleanupJob(jobId: JobId, error: Error | null, result?: any): void {
    const active = this.activeJobs.get(jobId);
    if (!active) return;

    if (active.timerId) clearTimeout(active.timerId);
    this.activeJobs.delete(jobId);

    if (error) {
      active.reject(error);
    } else {
      active.resolve(result);
    }

    // Recycle worker if it hasn't been terminated
    if (this.workers.has(active.worker)) {
      this.idleWorkers.push(active.worker);
      this.processQueue();
    }
  }

  private terminateWorker(worker: Worker): void {
    worker.terminate();
    this.workers.delete(worker);
    this.idleWorkers = this.idleWorkers.filter(w => w !== worker);
    // processQueue might be able to spawn a new worker now
    this.processQueue();
  }

  private findJobByWorker(worker: Worker): JobId | undefined {
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.worker === worker) return jobId;
    }
    return undefined;
  }
}
