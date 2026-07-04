export interface TranscriptBlock {
  speaker: string;
  text: string;
  timestamp: string;
}

let transcript: TranscriptBlock[] = [];
let observer: MutationObserver | null = null;
let transcriptTargetNode: Element | null = null;
let buffer = { speaker: '', text: '', timestamp: '' };
let interval: ReturnType<typeof setInterval> | null = null;

export function startObserver() {
  transcript = [];
  buffer = { speaker: '', text: '', timestamp: '' };
  
  // Attempt to auto-enable CC
  const icons = Array.from(document.querySelectorAll('.google-symbols'));
  const ccButton = icons.find(el => el.textContent?.includes('closed_caption_off'));
  if (ccButton) {
    (ccButton as HTMLElement).click();
  }

  const init = () => {
    const targetNode = document.querySelector(`div[role="region"][tabindex="0"]`);
    if (targetNode) {
      attachObserver(targetNode);
    }
  };
  
  // Delay to allow CC DOM to inject
  setTimeout(init, 2000);
  
  // Keep polling in case CC is toggled off and on, resetting the container
  interval = setInterval(() => {
    const currentNode = document.querySelector(`div[role="region"][tabindex="0"]`);
    if (currentNode && (!transcriptTargetNode || currentNode !== transcriptTargetNode || !transcriptTargetNode.isConnected)) {
      attachObserver(currentNode);
    }
  }, 2000);
}

function attachObserver(node: Element) {
  pushBuffer();
  
  if (observer) {
    observer.disconnect();
  }
  
  transcriptTargetNode = node;
  
  observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === "characterData") {
        const target = mutation.target.parentElement;
        const blocks = target?.parentElement?.parentElement?.children;
        if (!blocks) return;
        
        // Meet updates the last but second element when typing out live
        const isLastButSecond = blocks[blocks.length - 3] === target?.parentElement;
        
        if (isLastButSecond) {
          const speaker = target?.previousSibling?.textContent;
          const text = target?.textContent;
          
          if (speaker && text) {
            // New meeting or resume
            if (buffer.text === "") {
              buffer = { speaker, text, timestamp: new Date().toISOString() };
            } else {
              // Speaker changed
              if (buffer.speaker !== speaker) {
                pushBuffer();
                buffer = { speaker, text, timestamp: new Date().toISOString() };
              } else {
                // Same speaker, handle very long continuous speaking reset
                if ((text.length - buffer.text.length) < -250) {
                  pushBuffer();
                  buffer = { speaker, text, timestamp: new Date().toISOString() };
                } else {
                  buffer.text = text;
                }
              }
            }
          } else {
            pushBuffer();
          }
        }
      }
    });
  });
  
  observer.observe(node, { childList: true, attributes: true, subtree: true, characterData: true });
}

function pushBuffer() {
  if (buffer.speaker && buffer.text) {
    transcript.push({ ...buffer });
  }
  buffer = { speaker: '', text: '', timestamp: '' };
}

export function stopObserver(): TranscriptBlock[] {
  if (interval) clearInterval(interval);
  if (observer) observer.disconnect();
  pushBuffer();
  return transcript;
}
