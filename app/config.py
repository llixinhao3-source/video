from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    deepseek_api_key: str = ""
    deepseek_api_base: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"

    video_api_key: str = ""
    video_api_base: str = "https://api.vectorengine.ai/v1"
    video_model: str = "gpt-5.5-pro"

    sora_api_key: str = ""
    sora_api_base: str = "https://api.vectorengine.ai/v1"
    sora_model: str = "sora-2-all"

    feishu_app_id: str = ""
    feishu_app_secret: str = ""
    feishu_base_url: str = "https://open.feishu.cn/open-apis"

    obsidian_vault_path: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
