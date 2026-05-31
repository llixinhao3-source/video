## 1. 架构设计

```mermaid
flowchart LR
    "Frontend[React + Vite + Tailwind]" --> "API[FastAPI Backend :8001]"
    "API" --> "AI[DeepSeek/OpenAI LLM]"
    "API" --> "Feishu[飞书多维表格]"
    "API" --> "Obsidian[Obsidian 本地库]"
```

纯前端项目，后端 API 已由 FastAPI 提供（localhost:8001），前端仅负责 UI 渲染与 API 调用。

## 2. 技术说明

- 前端：React@18 + TypeScript + Tailwind CSS@3 + Vite
- 初始化工具：vite-init（react-ts 模板）
- 状态管理：Zustand
- 图标库：Lucide-react
- 后端：已有 FastAPI（localhost:8001），前端仅消费 API
- 数据库：无前端数据库，全部由后端管理

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主工作台页面（含侧边栏 + 文案创作面板） |

当前仅实现单页面，九大工作流通过侧边栏菜单切换状态而非路由切换。

## 4. API 定义

### POST /api/v1/workflow/create_script

请求体：

```typescript
interface CreateScriptRequest {
  topic: string
  style: 'humor' | 'professional' | 'warm' | 'viral'
  agents: {
    framework: boolean
    titleGenerator: boolean
    hookDesigner: boolean
    textRewriter: boolean
    sellingPoint: boolean
    riskControl: boolean
    marketingCopy: boolean
  }
}
```

响应体：

```typescript
interface CreateScriptResponse {
  success: boolean
  data: {
    titles: string[]
    hook: string
    content: string
    cta: string
    tags: string[]
    riskReport: {
      hasRisk: boolean
      riskyWords: { word: string; suggestion: string }[]
    }
  }
}
```

## 5. 服务器架构图

不适用（前端项目，无自建后端）

## 6. 数据模型

不适用（前端项目，数据由后端 API 管理）

## 7. 项目结构

```
src/
  components/
    Sidebar.tsx          # 左侧九大工作流导航
    Breadcrumb.tsx       # 面包屑导航
    TopicInput.tsx       # 核心主题输入区
    StyleSelector.tsx    # 风格参数单选组
    AgentToggles.tsx     # 专家链 Toggle 开关组
    GenerateButton.tsx   # 生成按钮 + Loading
    ResultPanel.tsx      # 结果展示区容器
    TitleHookCard.tsx    # 标题与钩子卡片
    ContentCard.tsx      # 正文内容卡片
    CtaCard.tsx          # 引导语卡片
    TagsCard.tsx         # 话题标签卡片
    RiskReportCard.tsx   # 违禁词风控报告卡片
    Toast.tsx            # Toast 提示组件
  hooks/
    useScriptGeneration.ts  # 文案生成 API 请求 Hook
  store/
    useAppStore.ts       # Zustand 全局状态
  pages/
    Workbench.tsx        # 主工作台页面
  App.tsx
  main.tsx
  index.css
```
