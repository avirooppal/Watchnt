import { describe, it, expect, vi } from 'vitest';
import { ExportService } from '../src/ExportService';
import { Meeting } from '@watchnt/meeting';
import { jsPDF } from 'jspdf';

// Mock jsPDF methods we use
vi.mock('jspdf', () => {
    return {
        jsPDF: vi.fn().mockImplementation(() => {
            return {
                setFontSize: vi.fn(),
                text: vi.fn(),
                splitTextToSize: vi.fn().mockImplementation((text) => [text]),
                addPage: vi.fn(),
            };
        }),
    };
});

describe('ExportService', () => {
    const mockMeeting: Meeting = {
        metadata: {
            id: 'm-1',
            title: 'Q1 Review',
            startTime: new Date('2026-04-01T10:00:00Z').getTime(),
            endTime: new Date('2026-04-01T11:00:00Z').getTime(),
            platform: 'google-meet'
        },
        artifacts: {
            summary: 'We reviewed Q1.'
        },
        actionItems: ['Send report', 'Update metrics'],
        decisions: ['Approved budget'],
        timeline: [
            { speakerId: 'Alice', text: 'Let us start.', startTime: 0, endTime: 5, confidence: 1, id: 's-1' }
        ]
    };

    it('should format meeting to JSON', () => {
        const json = ExportService.toJson(mockMeeting);
        const parsed = JSON.parse(json);
        expect(parsed.metadata.title).toBe('Q1 Review');
    });

    it('should format meeting to Obsidian Markdown', () => {
        const obsidian = ExportService.toObsidian(mockMeeting);
        expect(obsidian).toContain('---');
        expect(obsidian).toContain('title: "Q1 Review"');
        expect(obsidian).toContain('tags: [meeting, watchnt]');
        expect(obsidian).toContain('# [[Q1 Review]]');
        expect(obsidian).toContain('- [ ] Send report');
    });

    it('should format meeting to Notion Markdown', () => {
        const notion = ExportService.toNotionMarkdown(mockMeeting);
        expect(notion).toContain('## 📝 Summary');
        expect(notion).toContain('## ✅ Action Items');
        expect(notion).toContain('<details><summary><b>Transcript</b></summary>');
    });

    it('should generate PDF document', () => {
        const pdf = ExportService.toPDF(mockMeeting);
        expect(pdf.text).toBeDefined(); // Verifying our mock got returned
        expect(jsPDF).toHaveBeenCalled();
    });
});
