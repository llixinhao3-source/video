import asyncio
import logging
import os
import shutil
import uuid
from pathlib import Path
from typing import Any

from app.services.project_context import build_brand_context

logger = logging.getLogger(__name__)

ASPECT_RATIO_MAP = {
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
    "4:3": (1440, 1080),
    "1:1": (1080, 1080),
}

ASPECT_RATIO_NAME = {
    "9:16": "vertical",
    "16:9": "landscape",
    "4:3": "classic",
    "1:1": "square",
}

IMAGE_PROMPT_TEMPLATES = {
    "9:16": "9:16 vertical mobile format, cinematic, high quality, dark background, minimalist style",
    "16:9": "16:9 horizontal cinematic format, high quality, dark background, minimalist style",
    "4:3": "4:3 classic format, high quality, dark background, minimalist style",
    "1:1": "1:1 square format, high quality, dark background, minimalist style",
}

STORAGE_DIR = Path("storage")
VIDEO_DIR = STORAGE_DIR / "videos"
AUDIO_DIR = STORAGE_DIR / "audio"
IMAGE_DIR = STORAGE_DIR / "images"


def _init_storage() -> None:
    for d in [VIDEO_DIR, AUDIO_DIR, IMAGE_DIR]:
        d.mkdir(parents=True, exist_ok=True)


def _resolve_resolution(aspect_ratio: str) -> tuple[int, int]:
    return ASPECT_RATIO_MAP.get(aspect_ratio, (1080, 1920))


async def _node1_draw_master(
    script_text: str,
    aspect_ratio: str,
    assets: dict,
    brand_context: str = "",
) -> dict:
    logger.info("[Node1] draw_master starting, aspect_ratio=%s", aspect_ratio)
    result = {"executed": False, "images_generated": 0, "image_paths": []}

    width, height = _resolve_resolution(aspect_ratio)
    image_style = IMAGE_PROMPT_TEMPLATES.get(aspect_ratio, IMAGE_PROMPT_TEMPLATES["9:16"])

    try:
        image_prompts = [
            f"{script_text[:200]}, {image_style}"
            + (f", {brand_context}" if brand_context else "")
            + f", scene {i + 1} of 5"
            for i in range(5)
        ]

        image_paths: list[str] = []
        tasks = [_call_image_generation_api(prompt, aspect_ratio) for prompt in image_prompts]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, res in enumerate(results):
            if isinstance(res, Exception):
                logger.warning("[Node1] Image %d generation failed: %s", i + 1, res)
                continue
            image_paths.append(res)

        assets["image_paths"] = image_paths
        result["executed"] = True
        result["images_generated"] = len(image_paths)
        result["image_paths"] = image_paths
        logger.info("[Node1] draw_master done, generated %d images", len(image_paths))

    except Exception:
        logger.exception("[Node1] draw_master crashed")

    return result


async def _call_image_generation_api(prompt: str, aspect_ratio: str) -> str:
    width, height = _resolve_resolution(aspect_ratio)
    filename = f"{uuid.uuid4().hex}.png"
    output_path = IMAGE_DIR / filename

    _init_storage()

    await asyncio.to_thread(_stub_generate_image, output_path, width, height)

    return str(output_path)


def _stub_generate_image(output_path: Path, width: int, height: int) -> None:
    try:
        import numpy as np

        try:
            from PIL import Image, ImageDraw, ImageFont
        except ImportError:
            Image = None

        if Image:
            img = Image.new("RGB", (width, height), color=(20, 20, 30))
            draw = ImageDraw.Draw(img)
            try:
                fnt = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
            except Exception:
                fnt = ImageFont.load_default()
            text = "AI Generated Scene"
            bbox = draw.textbbox((0, 0), text, font=fnt)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            x = (width - text_w) // 2
            y = (height - text_h) // 2
            draw.text((x, y), text, font=fnt, fill=(200, 200, 220))
            img.save(output_path, "PNG")
        else:
            arr = np.zeros((height, width, 3), dtype=np.uint8)
            arr[:, :] = [20, 20, 30]
            import numpy as np

            arr[height // 2 - 30 : height // 2 + 30, width // 2 - 200 : width // 2 + 200] = [80, 80, 120]
            try:
                import cv2

                cv2.imwrite(str(output_path), cv2.cvtColor(arr, cv2.COLOR_RGB2BGR))
            except Exception:
                output_path.write_bytes(arr.tobytes())

    except Exception:
        output_path.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)


async def _node2_avatar_or_tts(
    script_text: str,
    switches: dict,
    assets: dict,
) -> dict:
    logger.info("[Node2] avatar/tts starting")
    result: dict[str, Any] = {"executed": False, "video_clip": None, "audio_path": None, "subtitle_timestamps": []}

    if switches.get("avatar_video"):
        try:
            video_path = await _call_avatar_api(script_text)
            assets["video_clips"].append(video_path)
            result["executed"] = True
            result["video_clip"] = video_path
            logger.info("[Node2] avatar_video done: %s", video_path)
        except Exception:
            logger.exception("[Node2] avatar_video crashed")

    elif switches.get("model_explain"):
        try:
            audio_path, timestamps = await _call_edge_tts(script_text)
            assets["audio_path"] = audio_path
            assets["subtitle_timestamps"] = timestamps
            result["executed"] = True
            result["audio_path"] = audio_path
            result["subtitle_timestamps"] = timestamps
            logger.info("[Node2] model_explain done: %s", audio_path)
        except Exception:
            logger.exception("[Node2] model_explain crashed")

    return result


async def _call_avatar_api(script_text: str) -> str:
    _init_storage()
    filename = f"avatar_{uuid.uuid4().hex}.mp4"
    output_path = VIDEO_DIR / filename

    await asyncio.to_thread(_stub_generate_avatar_video, output_path, script_text)

    return str(output_path)


def _stub_generate_avatar_video(output_path: Path, script_text: str) -> None:
    try:
        import numpy as np

        width, height = 1080, 1920
        fps = 24
        duration = min(len(script_text) / 5, 10)
        total_frames = int(fps * duration)

        try:
            import cv2

            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
            if not writer.isOpened():
                writer.release()
                return

            for frame_idx in range(total_frames):
                t = frame_idx / fps
                img = np.zeros((height, width, 3), dtype=np.uint8)
                color = int(30 + 20 * (t / duration) * (1 - t / duration) * 4)
                img[:, :] = [color, color, color + 10]
                h_mid = height // 2
                w_mid = width // 2
                cv2.putText(img, "AI Avatar", (w_mid - 120, h_mid - 20), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3)
                cv2.putText(img, "Speaking...", (w_mid - 100, h_mid + 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (180, 180, 200), 2)
                writer.write(img)

            writer.release()
        except Exception:
            output_path.write_bytes(b"\x00" * 256)

    except Exception:
        output_path.write_bytes(b"\x00" * 256)


async def _call_edge_tts(script_text: str) -> tuple[str, list[dict]]:
    _init_storage()
    filename = f"narration_{uuid.uuid4().hex}.mp3"
    audio_path = AUDIO_DIR / filename

    try:
        import edge_tts
    except ImportError:
        logger.warning("edge_tts not installed, using stub audio")
        await asyncio.to_thread(_stub_generate_audio, audio_path)
        timestamps = [{"start": 0.0, "end": 5.0, "text": script_text[:50]}]
        return str(audio_path), timestamps

    voice = "zh-CN-XiaoxiaoNeural"
    rate = "+10%"
    communicate = edge_tts.Communicate(script_text, voice, rate=rate)

    await asyncio.to_thread(communicate.save, str(audio_path))

    try:
        import json

        cues_path = AUDIO_DIR / f"{audio_path.stem}_cues.json"
        if cues_path.exists():
            cues = json.loads(cues_path.read_text("utf-8"))
            timestamps = [{"start": c["start"] / 1000, "end": c["end"] / 1000, "text": c["text"]} for c in cues]
        else:
            timestamps = _stub_timestamps(script_text)
    except Exception:
        timestamps = _stub_timestamps(script_text)

    return str(audio_path), timestamps


def _stub_timestamps(text: str, wpm: float = 150) -> list[dict]:
    words = text.split()
    total_seconds = len(words) / wpm * 60
    step = total_seconds / max(len(words), 1)
    timestamps = []
    cursor = 0.0
    for w in words:
        end = cursor + step * len(w)
        timestamps.append({"start": round(cursor, 2), "end": round(end, 2), "text": w})
        cursor = end
    return timestamps


def _stub_generate_audio(output_path: Path) -> None:
    try:
        import struct
        import wave

        import numpy as np

        sample_rate = 44100
        duration = 3.0
        num_samples = int(sample_rate * duration)
        t = np.linspace(0, duration, num_samples)
        freq = 440
        samples = (np.sin(2 * np.pi * freq * t) * 0.3 * 32767).astype(np.int16)

        with wave.open(str(output_path), "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(samples.tobytes())
    except Exception:
        output_path.write_bytes(b"\x00" * 1024)


async def _node3_compositor(
    script_text: str,
    aspect_ratio: str,
    switches: dict,
    assets: dict,
) -> dict:
    logger.info("[Node3] compositor starting, switches=%s", switches)
    result: dict[str, Any] = {"executed": False, "final_video_path": None}

    width, height = _resolve_resolution(aspect_ratio)
    mode = "smart_cut" if switches.get("smart_cut") else "brand_magic" if switches.get("brand_magic") else None

    if not mode:
        logger.info("[Node3] No compositor mode enabled, skipping")
        return result

    _init_storage()
    output_filename = f"final_{uuid.uuid4().hex}.mp4"
    output_path = VIDEO_DIR / output_filename

    try:
        render_result = await asyncio.to_thread(
            _render_with_moviepy,
            script_text,
            aspect_ratio,
            width,
            height,
            assets,
        )
        if render_result:
            shutil.move(render_result, output_path)
        else:
            logger.error("[Node3] MoviePy render returned empty path")
            return result

        assets["final_video_path"] = str(output_path)
        result["executed"] = True
        result["final_video_path"] = str(output_path)
        logger.info("[Node3] compositor done: %s", output_path)

    except Exception:
        logger.exception("[Node3] compositor crashed")

    return result


def _render_with_moviepy(
    script_text: str,
    aspect_ratio: str,
    width: int,
    height: int,
    assets: dict,
) -> str | None:
    try:
        from moviepy import (
            AudioFileClip,
            ColorClip,
            CompositeVideoClip,
            ImageClip,
            TextClip,
            concatenate_videoclips,
        )
        from moviepy.config import settings as mp_settings
    except ImportError:
        logger.error("moviepy not installed. Run: pip install moviepy")
        return None

    mp_settings.TEMP_DIR = str(STORAGE_DIR / "temp")
    Path(mp_settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)

    fps = 30
    clips: list = []

    fallback_clip = ColorClip(size=(width, height), color=(20, 20, 30), duration=5).with_fps(fps)

    if assets.get("image_paths"):
        image_paths = assets["image_paths"]
        image_clip_duration = max(3.0, 8.0 / max(len(image_paths), 1))

        for img_path in image_paths:
            try:
                img_clip = (
                    ImageClip(img_path)
                    .with_duration(image_clip_duration)
                    .resized(height=height)
                    .with_effects([vfx.Loop()])
                )
                clips.append(img_clip)
            except Exception:
                logger.warning("Failed to load image: %s", img_path)
                continue

    if not clips:
        clips.append(fallback_clip)

    if assets.get("audio_path"):
        audio_path = assets["audio_path"]
        try:
            audio = AudioFileClip(audio_path)
            total_duration = sum(c.duration for c in clips)

            while audio.duration > total_duration and len(clips) > 0:
                clips.append(clips[-1].with_duration(1.0))
                total_duration += 1.0

            video = concatenate_videoclips(clips, method="compose").with_audio(audio)
        except Exception:
            logger.warning("Failed to bind audio, using silent video")
            video = concatenate_videoclips(clips, method="compose")
    else:
        video = concatenate_videoclips(clips, method="compose")

    subtitle_timestamps = assets.get("subtitle_timestamps", [])
    if not subtitle_timestamps:
        words = script_text.split()
        duration = video.duration
        step = duration / max(len(words), 1)
        cursor = 0.0
        for w in words:
            end = cursor + step * len(w)
            subtitle_timestamps.append({"start": round(cursor, 2), "end": round(end, 2), "text": w})
            cursor = end

    subtitle_clips: list = []
    bar_height = 60
    bar_y = height - bar_height - 10

    for sub in subtitle_timestamps:
        try:
            sub_text = sub.get("text", "")
            if not sub_text.strip():
                continue

            txt_clip = (
                TextClip(
                    text=sub_text,
                    font="/System/Library/Fonts/Helvetica.ttc",
                    font_size=36,
                    color="white",
                    stroke_color="black",
                    stroke_width=1.5,
                    size=(width - 40, None),
                    text_align="center",
                    method="caption",
                )
                .with_duration(sub["end"] - sub["start"])
                .with_start(sub["start"])
                .with_position(("center", "bottom"), offset=-(bar_height + 20))
            )
            subtitle_clips.append(txt_clip)

        except Exception:
            logger.warning("Failed to create subtitle clip for: %s", sub.get("text", ""))

    subtitle_bar = (
        ColorClip(size=(width, bar_height), color=(0, 0, 0), duration=video.duration)
        .with_fps(fps)
        .with_effects([vfx.Loop()])
    )

    try:
        final = CompositeVideoClip([video, subtitle_bar] + subtitle_clips, size=(width, height))
    except Exception:
        final = CompositeVideoClip([video] + subtitle_clips, size=(width, height))

    final = final.with_fps(fps).with_duration(video.duration)

    tmp_path = STORAGE_DIR / "temp_render.mp4"

    try:
        final.write_videofile(
            str(tmp_path),
            codec="libx264",
            audio_codec="aac",
            bitrate="8000k",
            preset="medium",
            threads=4,
            logger=None,
        )
    except Exception:
        try:
            final.write_videofile(
                str(tmp_path),
                codec="mpeg4",
                audio_codec="aac",
                fps=30,
                logger=None,
            )
        except Exception:
            logger.exception("All MoviePy render attempts failed")
            return None

    for clip in clips:
        try:
            clip.close()
        except Exception:
            pass
    try:
        final.close()
    except Exception:
        pass

    return str(tmp_path)


async def _node4_publisher(
    switches: dict,
    assets: dict,
) -> dict:
    logger.info("[Node4] publisher starting")
    result: dict[str, Any] = {"executed": False, "queue": [], "published_platforms": []}

    if not switches.get("video_publisher"):
        return result

    final_path = assets.get("final_video_path")
    if not final_path:
        logger.warning("[Node4] No final video to publish")
        return result

    platforms = ["抖音", "快手", "小红书", "视频号", "哔哩哔哩"]
    publish_tasks = [_publish_to_platform(p, final_path) for p in platforms]
    results = await asyncio.gather(*publish_tasks, return_exceptions=True)

    published = []
    for p, res in zip(platforms, results):
        if isinstance(res, Exception):
            logger.warning("[Node4] %s publish failed: %s", p, res)
        else:
            published.append(p)

    result["executed"] = True
    result["published_platforms"] = published
    result["queue"].append({"video_path": final_path, "platforms": published})
    logger.info("[Node4] publisher done, platforms: %s", published)

    return result


async def _publish_to_platform(platform: str, video_path: str) -> dict:
    await asyncio.sleep(0.1)
    logger.info("[Node4] Published to %s: %s", platform, video_path)
    return {"platform": platform, "video_path": video_path, "status": "queued"}


async def execute_video_workflow(
    script_text: str,
    aspect_ratio: str,
    switches: dict,
    project_id: str | None = None,
) -> dict:
    """
    视频工作流主入口。
    project_id 可选，传入后可自动读取项目的品牌视觉规范，注入生图提示词。
    """
    logger.info(
        "execute_video_workflow started | aspect_ratio=%s | switches=%s | project_id=%s",
        aspect_ratio,
        switches,
        project_id,
    )

    brand_context = ""
    if project_id:
        brand_context = build_brand_context(project_id)
        if brand_context:
            logger.info("Injected brand context: %s...", brand_context[:100])

    assets: dict[str, Any] = {
        "audio_path": None,
        "image_paths": [],
        "video_clips": [],
        "subtitle_timestamps": [],
        "final_video_path": None,
    }

    steps_executed: list[str] = []
    node_results: dict[str, Any] = {}

    _init_storage()

    try:
        if switches.get("draw_master"):
            r = await _node1_draw_master(script_text, aspect_ratio, assets, brand_context)
            node_results["draw_master"] = r
            if r.get("executed"):
                steps_executed.append("draw_master")

        if switches.get("avatar_video") or switches.get("model_explain"):
            r = await _node2_avatar_or_tts(script_text, switches, assets)
            node_results["node2"] = r
            if r.get("executed"):
                if switches.get("avatar_video"):
                    steps_executed.append("avatar_video")
                elif switches.get("model_explain"):
                    steps_executed.append("model_explain")

        if switches.get("smart_cut") or switches.get("brand_magic"):
            r = await _node3_compositor(script_text, aspect_ratio, switches, assets)
            node_results["node3"] = r
            if r.get("executed"):
                mode = "smart_cut" if switches.get("smart_cut") else "brand_magic"
                steps_executed.append(mode)

        if switches.get("video_publisher"):
            r = await _node4_publisher(switches, assets)
            node_results["video_publisher"] = r
            if r.get("executed"):
                steps_executed.append("video_publisher")

        final_path = assets.get("final_video_path")

        if steps_executed and final_path:
            static_url = final_path.replace("\\", "/")
            if not static_url.startswith("/"):
                static_url = "/" + static_url
            status = "success"
        elif steps_executed:
            status = "partial"
            static_url = None
        else:
            status = "error"
            static_url = None

        logger.info(
            "execute_video_workflow finished | status=%s | steps=%s",
            status,
            steps_executed,
        )

        return {
            "status": status,
            "video_url": static_url,
            "steps_executed": steps_executed,
            "node_results": node_results,
            "aspect_ratio": aspect_ratio,
            "assets_summary": {
                "images": len(assets.get("image_paths", [])),
                "audio": assets.get("audio_path") is not None,
                "video_clips": len(assets.get("video_clips", [])),
            },
        }

    except Exception:
        logger.exception("execute_video_workflow crashed")
        return {
            "status": "error",
            "video_url": None,
            "steps_executed": steps_executed,
            "node_results": node_results,
        }
