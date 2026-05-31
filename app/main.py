import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import agent, workflow, video, avatar, project, pipeline, assets, domain_assets, private_domain
from api.routers.workflow import router as api_workflow_router
from api.routers.positioning import router as positioning_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)

STORAGE_DIR = Path("storage")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="短视频 AI Agent SaaS",
    version="1.0.0",
    description="短视频 AI Agent 商业化 SaaS 后端服务",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router)
app.include_router(workflow.router)
app.include_router(video.router)
app.include_router(avatar.router)
app.include_router(project.router)
app.include_router(pipeline.router)
app.include_router(assets.router)
app.include_router(domain_assets.router)
app.include_router(private_domain.router)
app.include_router(api_workflow_router)
app.include_router(positioning_router)

app.mount("/storage", StaticFiles(directory="storage"), name="storage")


@app.get("/health")
async def health():
    return {"status": "ok"}
