// extension/src/services/ExportService.ts

export class ExportService {
    static downloadBlob(content: string, filename: string, mimeType: string) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static exportActionsAsCSV(meetingJson: any) {
        const actionsData = meetingJson?.ai?.actions?.data;
        if (!actionsData || !Array.isArray(actionsData)) return;

        let csv = "Task,Owner,Deadline,Priority,Status,Confidence\n";
        actionsData.forEach((action: any) => {
            const row = [
                `"${(action.task || "").replace(/"/g, '""')}"`,
                `"${(action.owner || "").replace(/"/g, '""')}"`,
                `"${(action.deadline || "").replace(/"/g, '""')}"`,
                `"${action.priority || ""}"`,
                `"${action.status || ""}"`,
                `"${action.confidence || ""}"`
            ];
            csv += row.join(",") + "\n";
        });

        const title = meetingJson?.meeting?.title || "Meeting";
        this.downloadBlob(csv, `${title.replace(/\s+/g, "_")}_Actions.csv`, "text/csv");
    }

    static exportSummaryAsMarkdown(meetingJson: any) {
        const summaryData = meetingJson?.ai?.summary?.data;
        if (!summaryData) return;

        let md = `# Meeting Summary\n\n`;
        md += `## Snapshot\n${summaryData.meeting_snapshot || ""}\n\n`;
        md += `## Discussion\n${summaryData.discussion_summary || ""}\n\n`;

        if (summaryData.key_decisions && summaryData.key_decisions.length > 0) {
            md += `## Key Decisions\n`;
            summaryData.key_decisions.forEach((d: string) => md += `- ${d}\n`);
            md += "\n";
        }
        
        // ... (can map other lists similarly)

        const title = meetingJson?.meeting?.title || "Meeting";
        this.downloadBlob(md, `${title.replace(/\s+/g, "_")}_Summary.md`, "text/markdown");
    }
    
    static exportExecutiveBriefAsMarkdown(meetingJson: any) {
        const briefData = meetingJson?.ai?.executive_brief?.data;
        if (!briefData) return;

        let md = `# Executive Brief\n\n`;
        md += `## Purpose\n${briefData.purpose || ""}\n\n`;
        md += `## Outcome\n${briefData.outcome || ""}\n\n`;
        md += `## Timeline\n${briefData.timeline || ""}\n\n`;

        const title = meetingJson?.meeting?.title || "Meeting";
        this.downloadBlob(md, `${title.replace(/\s+/g, "_")}_Executive_Brief.md`, "text/markdown");
    }

    static exportEmailAsTXT(meetingJson: any) {
        const emailData = meetingJson?.ai?.email?.data;
        if (!emailData) return;
        
        let txt = `Subject: ${emailData.subject}\n\n`;
        txt += emailData.body;
        
        const title = meetingJson?.meeting?.title || "Meeting";
        this.downloadBlob(txt, `${title.replace(/\s+/g, "_")}_Email.txt`, "text/plain");
    }
    
    static exportMeetingAsJSON(meetingJson: any) {
        const title = meetingJson?.meeting?.title || "Meeting";
        const content = JSON.stringify(meetingJson, null, 2);
        this.downloadBlob(content, `${title.replace(/\s+/g, "_")}.json`, "application/json");
    }
}
