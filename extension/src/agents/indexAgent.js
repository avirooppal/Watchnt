import { api } from '../storage/api.js';
import { generateEmbedding } from '../storage/embeddings.js';
import logger from '../shared/logger.js';

export async function runIndexAgent({ session, context, cards, category }) {
  logger.log(`[IndexAgent] Starting index for session ${session.tabId || 'unknown'}`);
  
  const sourceRes = await api.post('/sources', {
    platform: session.platform,
    sourceUrl: session.url,
    title: session.title,
    channel: session.channel,
    contentType: context.contentType,
    primaryTopic: context.primaryTopic,
    detectedLanguage: context.detectedLanguage
  });
  
  const sourceId = sourceRes.id || sourceRes.sourceId || sourceRes[0]?.id; // handles various possible postgres return shapes
  logger.log(`[IndexAgent] Created source ${sourceId}`);

  for (const card of cards) {
    const textToEmbed = `${card.title} ${card.summary} ${card.insights.join(' ')}`;
    card.embedding = await generateEmbedding(textToEmbed);
    card.category = category;
  }
  logger.log(`[IndexAgent] Generated embeddings for ${cards.length} cards`);

  const cardsRes = await api.post('/cards', {
    sourceId,
    cards: cards
  });
  
  logger.log(`[IndexAgent] Indexed cards successfully`);

  return { sourceId, cardIds: cardsRes.cardIds || [], status: 'indexed' };
}
