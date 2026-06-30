from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.email_service import EmailService

router = APIRouter()
email_service = EmailService()

class EmailRequest(BaseModel):
    to_email: str

@router.post("/email/{meeting_id}")
def send_email(meeting_id: str, request: EmailRequest):
    try:
        email_service.send_email(meeting_id, request.to_email)
        return {"message": "Email sent successfully"}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
