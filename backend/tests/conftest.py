"""Tests never touch the user's database, settings, or meeting files."""
import os
import tempfile
import atexit
_test_data = tempfile.TemporaryDirectory(prefix="watchnt-tests-")
os.environ["DATABASE_URL"] = "sqlite:///" + _test_data.name.replace("\\", "/") + "/test.db"
os.environ["MEETINGS_DIR"] = _test_data.name + "/meetings"

def cleanup():
    from database.db import engine
    engine.dispose()
    _test_data.cleanup()
atexit.register(cleanup)
