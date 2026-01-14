from fastapi import APIRouter
from app.api.v1.endpoints import download, process

api_router = APIRouter()
api_router.include_router(download.router, tags=["download"])
api_router.include_router(process.router, tags=["process"])
