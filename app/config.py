from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    deepseek_api_key: str = ""
    deepseek_api_base: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"

    video_api_key: str = ""
    video_api_base: str = "https://api.vectorengine.cn/v1"
    video_model: str = "gpt-5.5-pro"

    sora_api_key: str = "sk-QJn36M0Ls2l0OkGoJdkktC63C9Fmxd4UDruTJxFkx2zEWqzO"
    sora_api_base: str = "https://api.vectorengine.cn/v1"
    sora_model: str = "wan2.6-i2v-flash"

    feishu_app_id: str = ""
    feishu_app_secret: str = ""
    feishu_base_url: str = "https://open.feishu.cn/open-apis"

    obsidian_vault_path: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
