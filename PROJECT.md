# 短视频智能运营系统 (Short Video AI Operations System)

> 一站式短视频 AI Agent 商业化 SaaS 平台，基于 5 步 SOP 流水线实现从定位到私域的全链路智能运营。

---

## 📐 系统架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │
│  │ 账号定位  │ │ 短视频选题 │ │ 文案创作  │ │ 视频制作  │ │ 私域  │ │
│  │Positioning│ │  Topic   │ │  Script  │ │  Video   │ │Private│ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬──┘ │
│       │             │            │             │            │     │
│  ┌────┴─────────────┴────────────┴─────────────┴────────────┴──┐ │
│  │              useProjectPipeline (React Context)              │ │
│  │              useAppStore (Zustand Global State)              │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
└─────────────────────────────┼────────────────────────────────────┘
                              │ HTTP / FormData
┌─────────────────────────────┼────────────────────────────────────┐
│                     Backend (FastAPI)                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │  pipeline   │ │   video    │ │   avatar   │ │private_domain│  │
│  │   router    │ │   router   │ │   router   │ │   router     │  │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────┬───────┘  │
│        │               │              │                │          │
│  ┌─────┴───────────────┴──────────────┴────────────────┴───────┐ │
│  │                    Service Layer (Engines)                    │ │
│  │  project_engine │ video_engine │ private_domain_engine       │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                             │                                    │
│  ┌──────────────────────────┴──────────────────────────────────┐ │
│  │              DeepSeek API (AsyncOpenAI Client)               │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                             │                                    │
│  ┌──────────────────────────┴──────────────────────────────────┐ │
│  │              Obsidian Vault (Markdown File Chain)            │ │
│  │         obsidian_vault/project_{id}/*.md                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 5 步 SOP 流水线

| 步骤 | 路由 | 核心面板 | 专家数量 | 输出文件 |
|------|------|----------|---------|---------|
| ① 定位 | `/account-profile` | PositioningPanel | 3 | `1_账号定位方案.md` |
| ② 选题 | `/topic-selection` | DynamicAgentToggles | 9 | `2_选题方案.md` |
| ③ 文案 | `/script-creation` | ScriptExpertPanel | 7 | `3_~5_*.md` |
| ④ 视频 | `/video-production` | VideoExpertChainPanel | 6 | `6_~9_*.md` |
| ⑤ 私域 | `/private-domain` | PrivateDomainExpertPanel | 6 | `10_~15_*.md` |

**数据流转**：每个专家读取上游 Obsidian 文件 → 注入 system_prompt → DeepSeek 生成 → 写入下游 Obsidian 文件。

---

## 📁 项目目录结构

```
video/
├── app/                              # FastAPI 后端主应用
│   ├── main.py                       # 应用入口，路由注册
│   ├── config.py                     # 环境变量配置 (DeepSeek API, Obsidian路径等)
│   ├── prompts.py                    # 通用 Prompt 模板库
│   ├── models/
│   │   └── pipeline.py               # ShortVideoProject Pydantic 模型
│   ├── routers/
│   │   ├── agent.py                  # 通用 Agent 调用
│   │   ├── workflow.py               # 工作流编排
│   │   ├── project.py                # 项目初始化
│   │   ├── pipeline.py               # 流水线步骤推进 + 文件链执行
│   │   ├── video.py                  # 视频制作专家执行
│   │   ├── avatar.py                 # 数字人资产 CRUD
│   │   ├── assets.py                 # 通用资产服务
│   │   ├── domain_assets.py          # 域资产 CRUD
│   │   └── private_domain.py         # 私域模块 (15个端点)
│   └── services/
│       ├── llm.py                    # DeepSeek AsyncOpenAI 客户端
│       ├── obsidian.py               # Obsidian Vault 读写
│       ├── feishu.py                 # 飞书集成
│       ├── project_context.py        # BrandIdentity / AccountProfile 模型
│       ├── project_engine.py         # 文案7专家引擎 + 文件链
│       ├── video_engine.py           # 视频基础引擎
│       ├── video_multimodal_engine.py # 视频6专家引擎 + 域参数注入
│       ├── private_domain_prompts.py  # 私域6专家配置字典 (DYNAMIC_EXPERT_CHAIN_CONFIG)
│       └── private_domain_engine.py   # 私域引擎 + 资产CRUD + 变量注入
│
├── api/                              # 第二套 API (定位分析 + 工作流)
│   ├── config.py
│   ├── main.py
│   ├── routers/
│   │   ├── positioning.py            # 账号定位分析
│   │   └── workflow.py               # 选题工作流
│   └── services/
│       ├── agents.py                 # Agent 调度
│       ├── prompts.py                # 定位 Prompt
│       ├── risk_control.py           # 风控
│       └── workflows.py              # 工作流服务
│
├── frontend/                         # React 前端
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── main.tsx                  # 入口
│       ├── App.tsx                   # 路由定义
│       ├── types.ts                  # 工作流类型定义 (WORKFLOWS)
│       ├── store/
│       │   └── useAppStore.ts        # Zustand 全局状态
│       ├── hooks/
│       │   └── useProjectPipeline.tsx # 项目流水线 Context
│       ├── pages/
│       │   └── Workbench.tsx         # 主工作台页面
│       └── components/
│           ├── Sidebar.tsx           # 侧边导航栏
│           ├── Breadcrumb.tsx        # 面包屑
│           ├── Toast.tsx             # 全局提示
│           ├── DynamicInputs.tsx     # 动态输入组件
│           ├── DynamicStyleSelector.tsx # 风格选择器
│           ├── DynamicAgentToggles.tsx  # 动态 Agent 开关
│           ├── GenerateButton.tsx    # 生成按钮
│           ├── GenericResultPanel.tsx   # 通用结果面板
│           ├── PositioningPanel.tsx  # 定位分析面板
│           ├── PositioningResult.tsx # 定位结果展示
│           ├── ScriptExpertPanel.tsx # 文案7专家卡片面板
│           ├── VideoExpertChainPanel.tsx # 视频6专家卡片面板
│           ├── AvatarCenterModal.tsx # 数字人资产管理 (3-Tab)
│           ├── DomainAssetModal.tsx  # 域资产CRUD (4域×2Tab)
│           └── PrivateDomainExpertPanel.tsx # 私域6专家面板+资产CRUD
│
├── obsidian_vault/                   # Obsidian 知识库 (运行时生成)
│   └── project_{id}/
│       ├── 1_账号定位方案.md
│       ├── 2_选题方案.md
│       ├── 3_风控合规文案.md ~ 5_营销转化文案.md
│       ├── 6_数字人智剪分镜.md ~ 9_视频发布方案.md
│       ├── 10_私域底座架构方案.md ~ 15_IP私域定位方案.md
│       └── _private_domain/          # 私域资产持久化
│           ├── private_management.json
│           └── ...
│
├── storage/                          # 通用存储
│   └── projects/                     # 项目元数据
│
└── requirements.txt                  # Python 依赖
```

---

## 🔌 API 端点一览

### 通用服务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/v1/project/init` | 初始化项目 |
| POST | `/api/v1/pipeline/update-step` | 推进流水线步骤 |
| GET | `/api/v1/pipeline/fetch-context/{pid}` | 获取项目上下文 |
| POST | `/api/v1/pipeline/run-expert` | 执行文案专家 |
| GET | `/api/v1/pipeline/project-files/{pid}` | 列出项目文件 |
| GET | `/api/v1/pipeline/project-files/{pid}/{file}` | 读取文件内容 |

### 定位分析

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/positioning/analyze` | 账号定位分析 |

### 数字人资产

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/avatar/list` | 数字人列表 |
| POST | `/api/v1/avatar/create` | 创建数字人 |
| POST | `/api/v1/avatar/{id}/clone-voice` | 克隆声音 |
| POST | `/api/v1/avatar/{id}/generate-video` | 生成视频 |

### 视频制作

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/video/run-multimodal-expert` | 执行视频专家 |

### 域资产

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/domain-assets` | 列出域资产 |
| POST | `/api/v1/domain-assets` | 创建域资产 |
| PATCH | `/api/v1/domain-assets/{id}` | 更新城资产 |
| DELETE | `/api/v1/domain-assets/{id}` | 删除域资产 |

### 私域运营 (15 个端点)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/private-domain/experts` | 6专家定义列表 |
| POST | `/api/v1/private-domain/run-expert` | 执行私域专家 |
| GET | `/api/v1/private-domain/{eid}/config` | 获取合并配置 |
| GET/POST | `/api/v1/private-domain/{eid}/records` | 数据记录 列表/创建 |
| PATCH/DELETE | `/api/v1/private-domain/{eid}/records/{rid}` | 数据记录 更新/删除 |
| GET/POST | `/api/v1/private-domain/{eid}/columns` | 表格列 列表/添加 |
| PATCH/DELETE | `/api/v1/private-domain/{eid}/columns/{cid}` | 表格列 更新/删除 |
| GET/POST | `/api/v1/private-domain/{eid}/fields` | 表单字段 列表/添加 |
| PATCH/DELETE | `/api/v1/private-domain/{eid}/fields/{fid}` | 表单字段 更新/删除 |

---

## 🧠 专家链体系

### 文案专家链 (7 个)

| Agent Key | 专家名 | 输出文件 |
|-----------|--------|---------|
| `smart_follow` | 智能跟创专家 | `3_智能跟创文案.md` |
| `title_master` | 爆款标题生成师 | `3_爆款标题文案.md` |
| `hook_design` | 黄金3秒钩子设计师 | `3_钩子设计文案.md` |
| `text_rewrite` | 文本口语化改写师 | `4_口语化改写文案.md` |
| `usp_planner` | 核心卖点策划师 | `4_卖点策划文案.md` |
| `risk_control` | 违禁词风控员 | `5_风控合规文案.md` |
| `marketing_helper` | 营销转化助手 | `5_营销转化文案.md` |

### 视频专家链 (6 个)

| Agent Key | 专家名 | 域参数 |
|-----------|--------|--------|
| `avatar_smart_cut` | 数字人智剪 | 绿幕背景/画面风格 |
| `avatar_clone_video` | 数字人视频 | 数字人ID/声音ID |
| `brand_cube` | 品宣魔方 | 品牌资产/宣传调性 |
| `ai_model_explain` | 智模讲解 | 讲解深度/最大场景数 |
| `image_master` | 生图大师 | 生图引擎/画面比例 |
| `video_publisher` | 视频发布员 | 发布平台/发布时间 |

### 私域专家链 (6 个)

| Agent Key | 专家名 | 资产中心 |
|-----------|--------|---------|
| `private_management` | 🧱 私域管理 | 用户分层与运营载体资产库 |
| `private_attraction` | 🧲 私域拉新专员 | 企业引流钩子与福利资产库 |
| `wechat_private_chat` | 💬 微信私信专家 | 黄金 Q&A 标准异议资产库 |
| `moments_planner` | 📱 朋友圈策划师 | 客户见证与案例背书素材库 |
| `private_funnel` | 🛡️ 私域引流策划师 | 公域防封安全变体词典 |
| `ip_positioning` | 👑 IP定位策划师 | 主理人专属语调与品牌故事资产库 |

---

## ⚙️ 核心设计模式

### 1. 动态域参数注入

```
前端 Select/Radio/Textarea → JSON.stringify(domain_params)
  → 后端 json.loads(domain_params_json)
  → str.replace("{var_name}", var_value) in system_prompt
  → DeepSeek API
```

每个专家的 `system_prompt` 包含 `{form_data}` 和 `{asset_records}` 占位符，引擎在运行时替换为实际值。

### 2. Obsidian 文件链

每个专家绑定一对 `(source_file, target_file)`，形成 DAG 数据流：

```
1_账号定位方案.md → 2_选题方案.md → 3_风控合规文案.md → 6_数字人智剪分镜.md
                                                     → 10_私域底座架构方案.md
```

### 3. 动态配置字典 (DYNAMIC_EXPERT_CHAIN_CONFIG)

私域模块的核心创新——每个专家包含三层可动态 CRUD 的配置：

```python
{
    "form_schema": {                    # 表单字段 (前端动态增删改)
        "fields": [
            {"field_id": "...", "type": "Select", "options": [...]},
            {"field_id": "...", "type": "Radio",  "options": [...]},
            {"field_id": "...", "type": "Textarea", "placeholder": "..."},
        ]
    },
    "asset_center_schema": {            # 资产中心 (列+数据均可动态增删改)
        "tab_title": "...",
        "table_columns": [
            {"column_id": "...", "type": "Input", "editable": True},
        ],
        "data_records": [
            {"id": "rec_01", ...},
        ]
    },
    "system_prompt": "... {form_data} ... {asset_records} ..."
}
```

### 4. 项目级持久化覆盖

```
obsidian_vault/project_{id}/_private_domain/{expert_id}.json
```

项目级 JSON 覆盖全局默认配置，通过 `get_merged_config()` 合并返回：
- 项目有自定义 → 使用项目配置
- 项目无自定义 → 使用全局默认

---

## 🛠 技术栈

### 后端

| 依赖 | 版本 | 用途 |
|------|------|------|
| FastAPI | ≥0.100 | Web 框架 |
| Uvicorn | ≥0.23 | ASGI 服务器 |
| Pydantic | ≥2.0 | 数据模型验证 |
| openai | ≥1.0 | DeepSeek API 客户端 |
| python-multipart | ≥0.0.6 | FormData 解析 |

### 前端

| 依赖 | 版本 | 用途 |
|------|------|------|
| React | 18 | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 5.x | 构建工具 |
| Tailwind CSS | 3.x | 原子化样式 |
| motion/react (Framer Motion) | 11.x | 动画引擎 |
| Zustand | 4.x | 全局状态管理 |
| React Router DOM | 6.x | 路由 |
| Lucide React | — | 图标库 |

---

## 🚀 启动方式

### 后端

```bash
cd /path/to/video
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 前端

```bash
cd /path/to/video/frontend
npm install
npm run dev
```

### 环境变量

在 `.env` 或 `app/config.py` 中配置：

```
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_API_BASE=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
OBSIDIAN_VAULT_PATH=./obsidian_vault
```

---

## 📊 数据模型

### ShortVideoProject (核心项目模型)

```python
class ShortVideoProject(BaseModel):
    project_id: str
    current_status: str                    # positioning → topic → script → video → private → done
    account_profile: AccountProfile | None  # 账号定位数据
    selected_topic: SelectedTopic | None    # 选题数据
    script_output: dict | None              # 文案产出
    video_output: dict | None               # 视频产出
    private_domain_data: dict | None        # 私域数据
    boss_report_url: str | None             # BOSS 报告链接
    created_at: str
    updated_at: str
```

### AccountProfile

```python
class AccountProfile(BaseModel):
    brand_identity: BrandIdentity           # 品牌VI (主色/辅色/视觉风格/语调)
    persona_archivist: dict                 # 人设档案
    product_profiler: dict                  # 产品档案
    enterprise_project: dict                # 企业立项
```

---

## 🎨 前端设计规范

- **Apple 风格 UI**：圆角 `rounded-2xl`、毛玻璃 `backdrop-blur-xl`、微妙阴影
- **配色**：主色 `#007AFF`、成功 `#34C759`、警告 `#FF9500`、危险 `#FF3B30`
- **动画**：`grid-rows-[0fr]`/`grid-rows-[1fr]` 手风琴展开、Framer Motion 入场动画
- **双列布局**：左列 240px (Select/Radio) + 右列 1fr (Textarea)
- **交互反馈**：Toast 提示、Loading 旋转、hover 显影操作按钮
