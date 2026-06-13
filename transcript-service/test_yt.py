import sys
try:
    from youtube_transcript_api import YouTubeTranscriptApi
    print(dir(YouTubeTranscriptApi))
except Exception as e:
    print(e)
