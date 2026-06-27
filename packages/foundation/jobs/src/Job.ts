
export interface Job<T = any> {
    id: string;
    type: string;
    payload: T;
    status: 'queued' | 'running' | 'completed' | 'failed';
}

export interface JobWorker<TJob extends Job> {
    process(job: TJob): Promise<void>;
}

export class JobQueue {
    private queue: Job[] = [];
    
    enqueue(job: Job) {
        this.queue.push(job);
    }
}
