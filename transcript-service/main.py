from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/transcript")
def get_transcript(video_id: str):
    if not video_id:
        raise HTTPException(status_code=400, detail="video_id is required")
        
    try:
        # Fetch the transcript, trying english first, then falling back to generated
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)
        
        # Try to find english, otherwise get the first available transcript
        try:
            transcript = transcript_list.find_transcript(['en'])
        except:
            # Get the first available transcript in any language
            transcript = next(iter(transcript_list))
            # Translate to English if possible, otherwise use original
            if transcript.is_translatable and transcript.language_code != 'en':
                try:
                    transcript = transcript.translate('en')
                except:
                    pass
                    
        # Fetch actual data
        transcript_data = transcript.fetch()
        
        # Format as raw text for LLM ingestion
        formatter = TextFormatter()
        text_content = formatter.format_transcript(transcript_data)
        
        # Also return the raw segments just in case the client needs timestamps
        return {
            "success": True,
            "video_id": video_id,
            "language": transcript.language_code,
            "text": text_content,
            "segments": transcript_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "healthy"}
