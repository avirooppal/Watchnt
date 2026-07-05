import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const CalendarIntegration = () => {
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Find all Google Meet links that haven't been processed yet
      const meetLinks = document.querySelectorAll('a[href^="https://meet.google.com/"]:not(.watchnt-processed)');
      
      meetLinks.forEach(link => {
        link.classList.add('watchnt-processed');
        
        const btn = document.createElement('button');
        btn.innerText = '🎥 Auto-Record';
        btn.style.marginLeft = '10px';
        btn.style.padding = '4px 10px';
        btn.style.background = '#F2A93B';
        btn.style.color = '#131A21';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '12px';
        btn.style.fontWeight = 'bold';
        btn.style.transition = 'all 0.2s';
        
        btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';
        
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          chrome.storage.local.set({ autoRecordNext: true }, () => {
            alert('WatchNT will automatically start recording when you join this meeting!');
            btn.innerText = '✅ Configured';
            btn.style.background = '#4FD8C4';
          });
        };
        
        // Insert right after the link
        if (link.parentNode) {
          link.parentNode.insertBefore(btn, link.nextSibling);
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
};

const init = () => {
  // Only initialize on Google Calendar
  if (window.location.hostname !== 'calendar.google.com') return;
  
  const rootElement = document.createElement('div');
  rootElement.id = 'watchnt-calendar-root';
  document.body.appendChild(rootElement);
  const root = createRoot(rootElement);
  root.render(<CalendarIntegration />);
};

init();
