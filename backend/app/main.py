from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1.api import api_router
import os
import subprocess

def prevent_sleep():
    """Prevent macOS from sleeping while this process is running using caffeinate"""
    try:
        # Check if caffeinate exists (macOS only)
        subprocess.run(['which', 'caffeinate'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # -i: Prevent idle sleep
        # -w <pid>: Wait for process <pid> to exit
        subprocess.Popen(['caffeinate', '-i', '-w', str(os.getpid())])
        print("☕️ Sleep prevention enabled (caffeinate)")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠️ Caffeinate not found (skipping sleep prevention)")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Scaler Companion Backend starting...")
    prevent_sleep()
    yield
    print("👋 Scaler Companion Backend shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Add Extension ID here in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Output directory for static access
settings.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/content", StaticFiles(directory=str(settings.OUTPUT_DIR)), name="content")

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
@app.get("/api/health") # Alias for frontend proxy convenience
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}
