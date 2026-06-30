import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from config import settings
import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEETINGS_DIR = os.path.join(BASE_DIR, "meetings")

class EmailService:
    def __init__(self):
        self.host = settings.smtp_host
        self.port = settings.smtp_port
        self.user = settings.smtp_user
        self.password = settings.smtp_password

    def generate_template(self, meeting_id: str) -> str:
        meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
        
        # Load transcript
        transcript_path = os.path.join(meeting_dir, "transcript.json")
        transcript = ""
        if os.path.exists(transcript_path):
            with open(transcript_path, "r") as f:
                data = json.load(f)
                segments = data.get("segments", [])
                transcript = "<br>".join([f"[{s['start']:.1f}s - {s['end']:.1f}s] {s['text']}" for s in segments])

        # Load summary
        summary_path = os.path.join(meeting_dir, "summary.md")
        summary = ""
        if os.path.exists(summary_path):
            with open(summary_path, "r", encoding="utf-8") as f:
                summary = f.read()

        # Load actions
        actions_path = os.path.join(meeting_dir, "actions.json")
        actions = []
        if os.path.exists(actions_path):
            with open(actions_path, "r", encoding="utf-8") as f:
                actions = json.load(f)
                
        actions_html = "".join([f"<li>{a}</li>" for a in actions])

        html = f"""
        <html>
            <body>
                <h2>Meeting Summary ({meeting_id})</h2>
                <h3>Summary</h3>
                <p>{summary}</p>
                <h3>Action Items</h3>
                <ul>{actions_html}</ul>
                <h3>Transcript</h3>
                <p>{transcript}</p>
            </body>
        </html>
        """
        return html

    def send_email(self, meeting_id: str, to_email: str):
        if not self.host or not self.user or not self.password:
            raise ValueError("SMTP configuration is missing in .env")
            
        html_content = self.generate_template(meeting_id)
        
        msg = EmailMessage()
        msg['Subject'] = f"Meeting Summary - {meeting_id}"
        msg['From'] = formataddr(("Watchn't AI", self.user))
        msg['To'] = to_email
        msg.set_content("Please enable HTML to view this email.")
        msg.add_alternative(html_content, subtype='html')

        with smtplib.SMTP(self.host, self.port) as server:
            server.starttls()
            server.login(self.user, self.password)
            server.send_message(msg)
