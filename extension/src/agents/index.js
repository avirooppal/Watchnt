import { runCaptureAgent } from './captureAgent.js';
import { runContextAgent } from './contextAgent.js';
import { runTranslationAgent } from './translationAgent.js';
import { runExtractionAgent } from './extractionAgent.js';
import { runActionAgent } from './actionAgent.js';
import { runCardAgent } from './cardAgent.js';
import { runOrganiserAgent } from './organiserAgent.js';
import { runIndexAgent } from './indexAgent.js';

import { setStatus, removeSession } from '../background/session.js';
import { setCaptureStatus } from '../storage/local.js';
import { AGENT_STEPS, SESSION_STATUS } from '../shared/constants.js';
import logger from '../shared/logger.js';

async function updateProgress(tabId, step, progress) {
  if (!tabId) return;
  await setCaptureStatus({ tabId, step, progress });
}

export async function runPipeline(session) {
  const tabId = session.tabId;

  try {
    logger.log(`[Pipeline] Started for ${session.title}`);
    
    await updateProgress(tabId, AGENT_STEPS.CAPTURE, 1/8);
    const captureResult = await runCaptureAgent(session);
    
    await updateProgress(tabId, AGENT_STEPS.CONTEXT, 2/8);
    const contextResult = await runContextAgent({ session, ...captureResult });
    
    await updateProgress(tabId, AGENT_STEPS.TRANSLATION, 3/8);
    const translationResult = await runTranslationAgent({ ...captureResult, ...contextResult });
    
    await updateProgress(tabId, AGENT_STEPS.EXTRACTION, 4/8);
    const extractionResult = await runExtractionAgent({ ...translationResult, context: contextResult });
    
    await updateProgress(tabId, AGENT_STEPS.ACTION, 5/8);
    const actionResult = await runActionAgent({ ...translationResult, ...extractionResult });
    
    await updateProgress(tabId, AGENT_STEPS.CARD, 6/8);
    const cardResult = await runCardAgent({ 
      context: contextResult, 
      ...extractionResult, 
      ...actionResult, 
      ...translationResult 
    });
    
    await updateProgress(tabId, AGENT_STEPS.ORGANISER, 7/8);
    const organiserResult = await runOrganiserAgent({ ...cardResult, context: contextResult });
    
    await updateProgress(tabId, AGENT_STEPS.INDEX, 8/8);
    await runIndexAgent({ session, context: contextResult, ...organiserResult, ...cardResult });

    if (tabId) {
      await setStatus(tabId, SESSION_STATUS.DONE);
      await removeSession(tabId);
    }
    
    logger.log(`[Pipeline] Finished for ${session.title}`);
  } catch (err) {
    logger.error(`[Pipeline] Error for ${session.title}:`, err);
    if (tabId) {
      await setStatus(tabId, SESSION_STATUS.ERROR, { errorMessage: err.message });
    }
  }
}
