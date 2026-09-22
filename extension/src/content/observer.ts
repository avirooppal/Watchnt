export interface TranscriptBlock {
  speaker: string;
  text: string;
  timestamp: string;
}
let transcript: TranscriptBlock[] = [];
let pending: TranscriptBlock | null = null;
let observer: MutationObserver | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const selectors = location.hostname.includes("zoom.us")
  ? [".closed-caption__content"]
  : location.hostname.includes("teams.")
    ? [
        '[data-tid="closed-caption-text"]',
        '[data-tid="closed-captions-renderer"]',
      ]
    : [".nMcdL", '[jsname="tgaKEf"]'];
function commit() {
  if (pending?.text) transcript.push(pending);
  pending = null;
}
function scan() {
  for (const selector of selectors) {
    const blocks = Array.from(document.querySelectorAll(selector));
    const block = blocks.at(-1);
    if (!block) continue;
    const speaker =
      block
        .querySelector('.NWpY1d, [data-tid="author"], .speaker-name')
        ?.textContent?.trim() || "Unknown";
    const textNode = block.querySelector('.ygicle, [data-tid="caption-text"]');
    let text = (textNode?.textContent || block.textContent || "").trim();
    if (!textNode && speaker !== "Unknown" && text.startsWith(speaker))
      text = text.slice(speaker.length).trim();
    if (!text) continue;
    if (
      pending &&
      (pending.speaker !== speaker ||
        (!text.startsWith(pending.text) &&
          !pending.text.startsWith(text) &&
          text !== pending.text))
    )
      commit();
    pending = {
      speaker,
      text,
      timestamp: pending?.timestamp || new Date().toISOString(),
    };
    break;
  }
}
export function startObserver() {
  stopObserver();
  transcript = [];
  pending = null;
  observer = new MutationObserver(scan);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  timer = setInterval(scan, 1000);
  scan();
}
export function currentTranscript() {
  return [...transcript, ...(pending ? [pending] : [])];
}
export function stopObserver() {
  observer?.disconnect();
  observer = null;
  if (timer) clearInterval(timer);
  timer = null;
  commit();
  return transcript;
}
