import { resolveBestProvider, KnowledgeSource } from '@watchnt/capture';

console.log('WatchNT Content Script Loaded');

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_PAGE_FOR_CAPTURE') {
    console.log('Analyzing page for WatchNT capture...');
    
    // Resolve the best KnowledgeSourceProvider for this page
    const provider = await resolveBestProvider(window.location.href, document);
    
    if (provider) {
      console.log('Found capable provider, extracting source...');
      try {
        const source: KnowledgeSource = await provider.extract(window.location.href, document);
        
        // Send the extracted source back to the background worker to start the pipeline
        chrome.runtime.sendMessage({ type: 'START_PIPELINE_JOB', source });
        
        // Inject a lightweight toast notification
        showToast('WatchNT Capture Started');
      } catch (err) {
        console.error('WatchNT extraction failed:', err);
        showToast('Capture failed');
      }
    } else {
      console.log('No WatchNT provider capable of handling this page.');
      showToast('No compatible content found');
    }
  }
});

function showToast(text: string) {
  const toast = document.createElement('div');
  toast.textContent = text;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.backgroundColor = '#10b981';
  toast.style.color = 'white';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '8px';
  toast.style.zIndex = '999999';
  toast.style.fontFamily = 'system-ui, sans-serif';
  toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
