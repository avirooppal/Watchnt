from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.health import router as health_router
from api.meeting import router as meeting_router
from api.upload import router as upload_router
from api.transcribe import router as transcribe_router
from api.summary import router as summary_router
from api.actions import router as actions_router
from api.email import router as email_router
from api.realtime import router as realtime_router
from api.config import router as config_router
from api.folder import router as folder_router
from database.db import init_db

init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"(chrome-extension://.*|https://meet\.google\.com|https://.*\.zoom\.us|https://teams\.microsoft\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(meeting_router)
app.include_router(upload_router)
app.include_router(transcribe_router)
app.include_router(summary_router)
app.include_router(actions_router)
app.include_router(email_router)
app.include_router(realtime_router)
app.include_router(config_router)
app.include_router(folder_router)

@app.get("/")
def read_root():
    return {"message": "Hello Watchn't"}
