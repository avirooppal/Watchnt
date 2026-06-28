import { success, failure, type Result } from '@watchnt/shared';
import type { RelationalStorage } from '@watchnt/storage';

export interface FlashcardTemplateRecord {
  id: string;
  name: string;
  front_template: string;
  back_template: string;
  created_at: number;
}

export interface FlashcardRecord {
  id: string;
  content_id: string;
  template_id: string;
  front_data: string; // JSON string
  back_data: string; // JSON string
  created_at: number;
  next_review_at: number;
}

export class FlashcardRepository {
  constructor(private db: RelationalStorage) {}

  async createTemplate(template: Omit<FlashcardTemplateRecord, 'created_at'>): Promise<Result<void>> {
    const query = `
      INSERT INTO flashcard_templates (id, name, front_template, back_template, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `;
    const params = [template.id, template.name, template.front_template, template.back_template, Date.now()];
    return this.db.execute(query, params);
  }

  async getTemplates(): Promise<Result<FlashcardTemplateRecord[]>> {
    const query = `SELECT * FROM flashcard_templates ORDER BY created_at ASC`;
    return this.db.query<FlashcardTemplateRecord>(query);
  }

  async createFlashcard(card: Omit<FlashcardRecord, 'created_at'>): Promise<Result<void>> {
    const query = `
      INSERT INTO flashcards (id, content_id, template_id, front_data, back_data, created_at, next_review_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const params = [
      card.id,
      card.content_id,
      card.template_id,
      card.front_data,
      card.back_data,
      Date.now(),
      card.next_review_at
    ];
    return this.db.execute(query, params);
  }

  async getFlashcardsByContentId(contentId: string): Promise<Result<FlashcardRecord[]>> {
    const query = `SELECT * FROM flashcards WHERE content_id = $1 ORDER BY created_at DESC`;
    return this.db.query<FlashcardRecord>(query, [contentId]);
  }

  async getDueFlashcards(limit: number = 20): Promise<Result<FlashcardRecord[]>> {
    const query = `
      SELECT * FROM flashcards 
      WHERE next_review_at <= $1 
      ORDER BY next_review_at ASC 
      LIMIT $2
    `;
    return this.db.query<FlashcardRecord>(query, [Date.now(), limit]);
  }

  async updateNextReview(id: string, nextReviewAt: number): Promise<Result<void>> {
    const query = `UPDATE flashcards SET next_review_at = $1 WHERE id = $2`;
    return this.db.execute(query, [nextReviewAt, id]);
  }
}
