
import { Meeting } from '@watchnt/meeting';
import { jsPDF } from 'jspdf';

export class ExportService {
    static toMarkdown(meeting: Meeting): string {
        let md = "# " + meeting.metadata.title + "\n\n";
        md += "**Date**: " + new Date(meeting.metadata.startTime).toLocaleDateString() + "\n\n";

        if (meeting.artifacts && meeting.artifacts.summary) {
            md += "## Summary\n" + meeting.artifacts.summary + "\n\n";
        }

        if (meeting.actionItems && meeting.actionItems.length > 0) {
            md += "## Action Items\n";
            for (const action of meeting.actionItems) {
                md += "- [ ] " + action + "\n";
            }
            md += "\n";
        }

        if (meeting.decisions && meeting.decisions.length > 0) {
            md += "## Decisions\n";
            for (const decision of meeting.decisions) {
                md += "- " + decision + "\n";
            }
            md += "\n";
        }

        if (meeting.timeline && meeting.timeline.length > 0) {
            md += "## Transcript\n";
            for (const t of meeting.timeline) {
                md += "**" + t.speakerId + "** [" + t.startTime + "s - " + t.endTime + "s]: " + t.text + "\n\n";
            }
        }

        return md;
    }

    static toJson(meeting: Meeting): string {
        return JSON.stringify(meeting, null, 2);
    }

    static toObsidian(meeting: Meeting): string {
        const title = meeting.metadata.title;
        const date = new Date(meeting.metadata.startTime).toISOString().split('T')[0];
        
        let md = "---\n";
        md += `title: "${title}"\n`;
        md += `date: ${date}\n`;
        md += "tags: [meeting, watchnt]\n";
        md += "---\n\n";
        md += `# [[${title}]]\n\n`;

        if (meeting.artifacts && meeting.artifacts.summary) {
            md += "## Summary\n" + meeting.artifacts.summary + "\n\n";
        }

        if (meeting.actionItems && meeting.actionItems.length > 0) {
            md += "## Action Items\n";
            for (const action of meeting.actionItems) {
                md += "- [ ] " + action + "\n";
            }
            md += "\n";
        }

        if (meeting.decisions && meeting.decisions.length > 0) {
            md += "## Decisions\n";
            for (const decision of meeting.decisions) {
                md += "- " + decision + "\n";
            }
            md += "\n";
        }

        return md;
    }

    static toNotionMarkdown(meeting: Meeting): string {
        let md = "# " + meeting.metadata.title + "\n\n";
        md += "**Date**: " + new Date(meeting.metadata.startTime).toLocaleDateString() + "\n\n";

        if (meeting.artifacts && meeting.artifacts.summary) {
            md += "## 📝 Summary\n" + meeting.artifacts.summary + "\n\n";
        }

        if (meeting.actionItems && meeting.actionItems.length > 0) {
            md += "## ✅ Action Items\n";
            for (const action of meeting.actionItems) {
                md += "- [ ] " + action + "\n";
            }
            md += "\n";
        }

        if (meeting.decisions && meeting.decisions.length > 0) {
            md += "## 🎯 Decisions\n";
            for (const decision of meeting.decisions) {
                md += "- " + decision + "\n";
            }
            md += "\n";
        }

        if (meeting.timeline && meeting.timeline.length > 0) {
            md += "<details><summary><b>Transcript</b></summary>\n\n";
            for (const t of meeting.timeline) {
                md += "**" + t.speakerId + "**: " + t.text + "\n\n";
            }
            md += "</details>\n";
        }

        return md;
    }

    static toPDF(meeting: Meeting): jsPDF {
        const doc = new jsPDF();
        let y = 20;

        doc.setFontSize(18);
        doc.text(meeting.metadata.title, 20, y);
        y += 10;

        doc.setFontSize(12);
        doc.text("Date: " + new Date(meeting.metadata.startTime).toLocaleDateString(), 20, y);
        y += 15;

        if (meeting.artifacts && meeting.artifacts.summary) {
            doc.setFontSize(14);
            doc.text("Summary", 20, y);
            y += 7;
            doc.setFontSize(11);
            
            const splitSummary = doc.splitTextToSize(meeting.artifacts.summary, 170);
            doc.text(splitSummary, 20, y);
            y += (splitSummary.length * 5) + 10;
        }

        if (meeting.actionItems && meeting.actionItems.length > 0) {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.text("Action Items", 20, y);
            y += 7;
            doc.setFontSize(11);
            
            for (const action of meeting.actionItems) {
                if (y > 280) { doc.addPage(); y = 20; }
                const splitAction = doc.splitTextToSize("- [ ] " + action, 170);
                doc.text(splitAction, 20, y);
                y += (splitAction.length * 5) + 2;
            }
            y += 5;
        }

        if (meeting.decisions && meeting.decisions.length > 0) {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.text("Decisions", 20, y);
            y += 7;
            doc.setFontSize(11);
            
            for (const decision of meeting.decisions) {
                if (y > 280) { doc.addPage(); y = 20; }
                const splitDecision = doc.splitTextToSize("- " + decision, 170);
                doc.text(splitDecision, 20, y);
                y += (splitDecision.length * 5) + 2;
            }
        }

        return doc;
    }

    static toEmailTemplate(meeting: Meeting): string {
        const subject = "Meeting Notes: " + meeting.metadata.title;
        const body = ExportService.toMarkdown(meeting);
        return "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    }
}
