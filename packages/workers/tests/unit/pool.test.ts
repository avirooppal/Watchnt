import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkerPool } from '../../src/pool.js';
import { createJobId } from '@watchnt/shared';

// Mock Web Worker
class MockWorker {
  onmessage: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;
  
  postMessage(msg: any) {
    // In actual implementation, we might want to trigger onmessage asynchronously
    // to simulate real worker behavior
  }
  
  terminate = vi.fn();
}

describe('WorkerPool', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', MockWorker);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('queues jobs when workers are busy', async () => {
    const pool = new WorkerPool({ maxWorkers: 1, workerFactory: () => new MockWorker() as any });
    
    // Dispatch 2 jobs
    const job1 = pool.dispatch({ jobId: createJobId('j1'), type: 'test', payload: null });
    const job2 = pool.dispatch({ jobId: createJobId('j2'), type: 'test', payload: null });
    
    // Reach into private state for testing
    const workersSet = (pool as any).workers as Set<MockWorker>;
    expect(workersSet.size).toBe(1); // Only 1 worker should be created
    
    const queue = (pool as any).queue;
    expect(queue.length).toBe(1); // 1 job should be in the queue
    expect(queue[0].request.jobId).toBe('j2');

    // Simulate worker finishing job1
    const worker = Array.from(workersSet)[0];
    worker.onmessage!({ data: { jobId: createJobId('j1'), type: 'success', payload: 'res1' } });
    
    await expect(job1).resolves.toBe('res1');
    
    // Now job2 should be active and queue should be empty
    expect((pool as any).queue.length).toBe(0);
    
    // Finish job2
    worker.onmessage!({ data: { jobId: createJobId('j2'), type: 'success', payload: 'res2' } });
    await expect(job2).resolves.toBe('res2');
  });

  it('handles cancellation and worker termination', async () => {
    const pool = new WorkerPool({ maxWorkers: 1, workerFactory: () => new MockWorker() as any });
    const jobPromise = pool.dispatch({ jobId: createJobId('j1'), type: 'test', payload: null });
    
    const worker = Array.from((pool as any).workers)[0] as MockWorker;
    
    pool.cancel(createJobId('j1'));
    
    await expect(jobPromise).rejects.toThrow('Job cancelled');
    expect(worker.terminate).toHaveBeenCalled(); // Active worker must be terminated
  });

  it('handles timeouts', async () => {
    const pool = new WorkerPool({ maxWorkers: 1, workerFactory: () => new MockWorker() as any });
    const jobPromise = pool.dispatch(
      { jobId: createJobId('j1'), type: 'test', payload: null }, 
      { timeoutMs: 1000 }
    );
    
    const worker = Array.from((pool as any).workers)[0] as MockWorker;
    
    // Advance time past timeout
    vi.advanceTimersByTime(1100);
    
    await expect(jobPromise).rejects.toThrow('Job cancelled');
    expect(worker.terminate).toHaveBeenCalled(); // Worker terminated on timeout cancellation
  });

  it('recycles workers when jobs complete normally', async () => {
    const pool = new WorkerPool({ maxWorkers: 1, workerFactory: () => new MockWorker() as any });
    
    const job1 = pool.dispatch({ jobId: createJobId('j1'), type: 'test', payload: null });
    
    const workersSet = (pool as any).workers as Set<MockWorker>;
    const worker = Array.from(workersSet)[0];
    
    worker.onmessage!({ data: { jobId: createJobId('j1'), type: 'success' } });
    await job1;
    
    expect((pool as any).idleWorkers.length).toBe(1);
    expect(workersSet.size).toBe(1);
    
    // Second job should reuse the worker
    const job2 = pool.dispatch({ jobId: createJobId('j2'), type: 'test', payload: null });
    expect(workersSet.size).toBe(1);
    expect((pool as any).idleWorkers.length).toBe(0);
    
    worker.onmessage!({ data: { jobId: createJobId('j2'), type: 'success' } });
    await job2;
  });
});
