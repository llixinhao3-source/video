from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers.workflow import router as workflow_router
from api.routers.positioning import router as positioning_router
from api.routers.video_deconstruct import router as video_deconstruct_router

app = FastAPI(
    title="AI Video SOP",
    description="短视频 AI 运营系统后端",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workflow_router)
app.include_router(positioning_router)
app.include_router(video_deconstruct_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
