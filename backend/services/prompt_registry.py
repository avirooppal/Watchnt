from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict, Literal

# Define expected output schemas

class ActionItemSchema(BaseModel):
    task: str = Field(..., min_length=1, description="Actionable work to be done")
    owner: Optional[str] = Field(None, description="Person responsible")
    deadline: Optional[str] = Field(None, description="When it is due")
    priority: Literal["High", "Medium", "Low"] = Field(..., description="High, Medium, or Low")
    status: str = Field("Pending Review", description="Must be 'Pending Review'")
    evidence: Optional[str] = Field(None, description="Transcript reference or quote")
    confidence: Literal["High", "Medium", "Low"] = Field(..., description="High, Medium, or Low based on certainty")
    suggested_tags: List[str] = Field(default_factory=list)

class DecisionSchema(BaseModel):
    decision: str = Field(..., description="The explicit decision made")
    reason: Optional[str] = Field(None, description="Why this was decided")
    participants: List[str] = Field(default_factory=list, description="People involved in the decision")
    evidence: Optional[str] = Field(None, description="Transcript reference or quote")
    confidence: Literal["High", "Medium", "Low"] = Field(..., description="High, Medium, or Low")
    status: str = Field("Confirmed", description="Status of the decision")

class SummarySectionSchema(BaseModel):
    meeting_snapshot: str = Field(..., description="A 2-3 sentence overview")
    discussion_summary: str = Field(..., description="Paragraph summarizing main points")
    key_decisions: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    blockers: List[str] = Field(default_factory=list)
    important_dates: List[str] = Field(default_factory=list)
    open_questions: List[str] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)
    highlights: List[str] = Field(default_factory=list)

class ExecutiveBriefSchema(BaseModel):
    purpose: str = Field(...)
    outcome: str = Field(...)
    key_decisions: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    open_questions: List[str] = Field(default_factory=list)
    timeline: str = Field(...)
    immediate_next_steps: List[str] = Field(default_factory=list)

class TimelineEventSchema(BaseModel):
    time: str = Field(..., description="Timestamp like 00:00")
    title: str = Field(..., description="Topic discussed")

class EntitiesSchema(BaseModel):
    people: List[str] = Field(default_factory=list)
    companies: List[str] = Field(default_factory=list)
    products: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    deadlines: List[str] = Field(default_factory=list)
    documents: List[str] = Field(default_factory=list)
    technologies: List[str] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)

class EmailDraftSchema(BaseModel):
    subject: str = Field(...)
    body: str = Field(..., description="Email body formatted nicely with newlines")


class PromptDefinition(BaseModel):
    name: str
    version: str
    description: str
    template: str
    expected_schema: Any
    compatible_providers: List[str]

# Registries

PROMPTS = {
    "title": PromptDefinition(
        name="Title Prompt",
        version="v1.0",
        description="Generates a contextual meeting title",
        expected_schema=None, # Just returns text
        compatible_providers=["all"],
        template="""Based on the following transcript, generate a short, professional meeting title.
Example: 'Weekly Engineering Sync', 'Client Discovery Call', 'Marketing Review'.
Return ONLY the title string, no quotes.

Transcript:
{transcript}
"""
    ),
    "summary": PromptDefinition(
        name="Summary Prompt",
        version="v1.0",
        description="Generates structured summary sections",
        expected_schema=SummarySectionSchema,
        compatible_providers=["all"],
        template="""Analyze the following transcript and generate a structured summary.
Extract the Meeting Snapshot, Discussion Summary, Key Decisions, Risks, Blockers, Important Dates, Open Questions, Next Steps, and Highlights.
Return ONLY valid JSON matching the requested schema.

Transcript:
{transcript}
"""
    ),
    "decisions": PromptDefinition(
        name="Decision Prompt",
        version="v1.0",
        description="Extracts only explicit decisions with evidence and confidence",
        expected_schema=List[DecisionSchema],
        compatible_providers=["all"],
        template="""Extract explicit decisions from the following transcript. Do NOT infer decisions that were only discussed but not finalized.
Provide evidence and assess confidence (High, Medium, Low) based on explicit language and agreement.
Return ONLY a valid JSON array matching the requested schema.

Transcript:
{transcript}
"""
    ),
    "actions": PromptDefinition(
        name="Action Prompt",
        version="v1.0",
        description="Extracts actionable work",
        expected_schema=List[ActionItemSchema],
        compatible_providers=["all"],
        template="""Extract actionable tasks from the following transcript.
Provide evidence (a transcript quote) and assess confidence (High, Medium, Low) based on explicit language. Set status to "Pending Review".
Return ONLY a valid JSON array matching the requested schema.

Transcript:
{transcript}
"""
    ),
    "executive_brief": PromptDefinition(
        name="Executive Prompt",
        version="v1.0",
        description="Generates a one-page executive briefing",
        expected_schema=ExecutiveBriefSchema,
        compatible_providers=["all"],
        template="""Create a concise executive brief based on the following transcript.
Keep it strictly factual. Do not invent facts.
Return ONLY valid JSON matching the requested schema.

Transcript:
{transcript}
"""
    ),
    "timeline": PromptDefinition(
        name="Timeline Prompt",
        version="v1.0",
        description="Builds a timeline of topics discussed",
        expected_schema=List[TimelineEventSchema],
        compatible_providers=["all"],
        template="""Create a chronological timeline of topics discussed from the transcript.
Return ONLY a valid JSON array matching the requested schema.

Transcript:
{transcript}
"""
    ),
    "entities": PromptDefinition(
        name="Entity Prompt",
        version="v1.0",
        description="Extracts named entities from the meeting",
        expected_schema=EntitiesSchema,
        compatible_providers=["all"],
        template="""Extract all mentioned people, companies, products, features, deadlines, documents, technologies, and locations.
Return ONLY valid JSON matching the requested schema.

Transcript:
{transcript}
"""
    ),
    "search_index": PromptDefinition(
        name="Search Index Prompt",
        version="v1.0",
        description="Extracts a list of keywords and topics for searching",
        expected_schema=List[str],
        compatible_providers=["all"],
        template="""Extract a list of 10-20 important keywords, topics, and themes discussed in the meeting.
Return ONLY a valid JSON array of strings.

Transcript:
{transcript}
"""
    ),
    "email": PromptDefinition(
        name="Email Prompt",
        version="v1.0",
        description="Drafts a follow-up email",
        expected_schema=EmailDraftSchema,
        compatible_providers=["all"],
        template="""Draft a professional follow-up email based on the transcript.
Return ONLY valid JSON matching the requested schema containing the subject and body.

Transcript:
{transcript}
"""
    ),
}

class PromptRegistry:
    @staticmethod
    def get(key: str) -> PromptDefinition:
        if key not in PROMPTS:
            raise KeyError(f"Prompt {key} not found")
        return PROMPTS[key]
