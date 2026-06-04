from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_API_BASE: str = "https://api.deepseek.com/v1"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    CLAUDE_API_KEY: str = ""
    CLAUDE_API_BASE: str = "https://api.deepseek.com/anthropic"
    CLAUDE_MODEL: str = "DeepSeek-V4-pro"

    VIDEO_API_KEY: str = ""
    VIDEO_API_BASE: str = "https://api.vectorengine.cn/v1"
    VIDEO_MODEL: str = "gpt-5.5-pro"

    SORA_API_KEY: str = "sk-QJn36M0Ls2l0OkGoJdkktC63C9Fmxd4UDruTJxFkx2zEWqzO"
    SORA_API_BASE: str = "https://api.vectorengine.cn/v1"
    SORA_MODEL: str = "sora-2-pro"

    FEISHU_APP_ID: str = ""
    FEISHU_APP_SECRET: str = ""
    FEISHU_BASE_URL: str = "https://open.feishu.cn/open-apis"

    OBSIDIAN_VAULT_PATH: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
