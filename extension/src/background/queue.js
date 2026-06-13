let jobQueue = [];
let isProcessing = false;
let onJob = null;

export function setJobHandler(fn) {
  onJob = fn;
}

export async function processNext() {
  if (isProcessing || jobQueue.length === 0) return;
  
  isProcessing = true;
  const job = jobQueue.shift();
  
  if (onJob) {
    try {
      await onJob(job);
    } catch (err) {
      console.error('[Watchnt] Queue job failed', err);
    }
  }
  
  isProcessing = false;
  processNext();
}

export function enqueue(session) {
  jobQueue.push(session);
  processNext();
}

export function getQueueLength() {
  return jobQueue.length;
}
