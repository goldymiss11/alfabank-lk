import sys
from pathlib import Path
from fastapi.staticfiles import StaticFiles

# Add project root to sys.path so 'backend' can be imported
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.main import app

# Mount static frontend build if it exists
dist_dir = root_dir / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")
