from fastapi import APIRouter
from app.api.v1.endpoints import download, process, content, system, search, export, settings

api_router = APIRouter()
api_router.include_router(download.router, tags=["download"])
api_router.include_router(process.router, tags=["process"])
api_router.include_router(content.router, tags=["content"])
api_router.include_router(system.router, tags=["system"])
api_router.include_router(search.router, tags=["search"])
api_router.include_router(export.router, tags=["export"])
api_router.include_router(settings.router, tags=["settings"])
