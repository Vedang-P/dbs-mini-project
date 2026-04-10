from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Frontend Service")

FRONTEND_DIR = Path(__file__).resolve().parent
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend-static")

