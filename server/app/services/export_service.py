import json
from typing import Dict, Any
from jinja2 import Environment, FileSystemLoader

try:
    from weasyprint import HTML
except ImportError:
    HTML = None

class ExportService:
    def __init__(self, template_dir: str = "app/templates"):
        self.env = Environment(loader=FileSystemLoader(template_dir))

    def export_json(self, meeting_data: Dict[str, Any]) -> str:
        """Export meeting data as a formatted JSON string."""
        return json.dumps(meeting_data, indent=2)

    def export_markdown(self, meeting_data: Dict[str, Any]) -> str:
        """
        Export meeting data as a Markdown document.
        Suitable for Obsidian and Notion import.
        """
        template = self.env.get_template("meeting_export.md")
        return template.render(meeting=meeting_data)
        
    def export_html(self, meeting_data: Dict[str, Any]) -> str:
        """Export meeting data as an HTML document."""
        template = self.env.get_template("meeting_export.html")
        return template.render(meeting=meeting_data)

    def export_pdf(self, meeting_data: Dict[str, Any]) -> bytes:
        """
        Export meeting data as a PDF document via WeasyPrint.
        """
        if HTML is None:
            raise RuntimeError("WeasyPrint is not installed or unavailable on this system.")
            
        html_content = self.export_html(meeting_data)
        return HTML(string=html_content).write_pdf()

export_service = ExportService()
