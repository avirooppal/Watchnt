import asyncio
from typing import List, Dict, Any
from .llm import complete
from .prompts import summary, action_items, decisions, context

async def run_intelligence_pipeline(transcript: str, speakers: List[str], model: str = "openai/gpt-4o-mini") -> Dict[str, Any]:
    """
    Runs the meeting intelligence pipeline.
    Executes summary, action items, and decisions in parallel, then synthesizes them.
    """
    
    # 1. Parallel LLM Extraction Phase
    summary_coro = complete(
        model=model,
        messages=[
            {"role": "system", "content": summary.SYSTEM_PROMPT},
            {"role": "user", "content": summary.build_user_prompt(transcript, speakers)}
        ],
        response_format=summary.SummaryOutput
    )
    
    actions_coro = complete(
        model=model,
        messages=[
            {"role": "system", "content": action_items.SYSTEM_PROMPT},
            {"role": "user", "content": action_items.build_user_prompt(transcript, speakers)}
        ],
        response_format=action_items.ActionItemsOutput
    )
    
    decisions_coro = complete(
        model=model,
        messages=[
            {"role": "system", "content": decisions.SYSTEM_PROMPT},
            {"role": "user", "content": decisions.build_user_prompt(transcript, speakers)}
        ],
        response_format=decisions.DecisionsOutput
    )
    
    # Execute all 3 extractions concurrently
    summary_result, actions_result, decisions_result = await asyncio.gather(
        summary_coro, actions_coro, decisions_coro
    )
    
    # 2. Sequential Context Synthesis Phase
    # Note: In a robust implementation we serialize the Pydantic models back to JSON strings for the prompt
    context_result = await complete(
        model=model,
        messages=[
            {"role": "system", "content": context.SYSTEM_PROMPT},
            {"role": "user", "content": context.build_user_prompt(str(summary_result), str(actions_result), str(decisions_result))}
        ],
        response_format=context.MeetingContext
    )
    
    return {
        "summary": summary_result,
        "action_items": actions_result,
        "decisions": decisions_result,
        "context": context_result
    }
