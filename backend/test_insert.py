from database.db import SessionLocal, init_db
from database.models import Meeting
import sys

def test_insert():
    # Make sure tables are created
    init_db()
    
    db = SessionLocal()
    try:
        new_meeting = Meeting(title="Test Meeting")
        db.add(new_meeting)
        db.commit()
        db.refresh(new_meeting)
        print(f"Inserted meeting: {new_meeting.id} - {new_meeting.title} - {new_meeting.created_at}")
    except Exception as e:
        print(f"Error inserting meeting: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    test_insert()
