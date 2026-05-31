export type StyleOption = 'humor' | 'professional' | 'warm' | 'viral'

export interface AgentDef {
  key: string
  label: string
  desc: string
}

export interface InputDef {
  key: string
  label: string
  placeholder: string
  multiline?: boolean
}

export interface StyleDef {
  value: string
  label: string
  emoji: string
}

export interface WorkflowDef {
  id: string
  label: string
  emoji: string
  breadcrumb: string
  inputs: InputDef[]
  styles: StyleDef[]
  agents: AgentDef[]
  apiPath: string
}

export const WORKFLOWS: WorkflowDef[] = [
  {
    id: 'positioning',
    label: '账号定位分析',
    emoji: '💡',
    breadcrumb: '工作流 / 账号定位分析',
    inputs: [
      { key: 'brand', label: '品牌/产品/行业关键词', placeholder: '输入品牌名称、产品类型或行业关键词，例如：新消费咖啡品牌' },
      { key: 'goal', label: '企业目标与愿景', placeholder: '描述企业核心目标，例如：打造年轻人首选的咖啡品牌', multiline: true },
    ],
    styles: [],
    agents: [
      { key: 'enterprise', label: '企业立项', desc: '品牌价值提炼' },
      { key: 'persona', label: '建立人设档案', desc: '人格化特征定义' },
      { key: 'product', label: '创建产品档案', desc: '核心卖点提炼' },
    ],
    apiPath: '/api/v1/positioning/analyze',
  },
  {
    id: 'category',
    label: '品类定位分析',
    emoji: '🔍',
    breadcrumb: '工作流 / 品类定位分析',
    inputs: [
      { key: 'category', label: '品类关键词', placeholder: '输入品类关键词，例如：咖啡、新能源汽车、AI工具' },
    ],
    styles: [],
    agents: [],
    apiPath: '/api/v1/positioning/category',
  },
  {
    id: 'topic',
    label: '短视频选题',
    emoji: '🎬',
    breadcrumb: '工作流 / 短视频选题',
    inputs: [
      { key: 'keyword', label: '选题关键词', placeholder: '输入选题方向关键词，例如：职场成长、生活技巧、美食探店' },
    ],
    styles: [
      { value: 'trending', label: '追热点', emoji: '🔥' },
      { value: 'evergreen', label: '常青内容', emoji: '🌿' },
      { value: 'seasonal', label: '节日节气', emoji: '🎉' },
      { value: 'challenge', label: '挑战赛', emoji: '🏆' },
    ],
    agents: [
      { key: 'inspiration', label: '灵感中心', desc: '热点话题追踪' },
      { key: 'videoMining', label: '视频挖掘', desc: '爆款内容分析' },
      { key: 'competitor', label: '同行监控', desc: '竞品动态追踪' },
      { key: 'ipBenchmark', label: 'IP对标分析', desc: '头部IP研究' },
      { key: 'videoAnalysis', label: '视频分析', desc: '数据指标解读' },
      { key: 'videoDeconstruct', label: '视频拆解', desc: '爆款结构分析' },
      { key: 'ipPositioning', label: 'IP定位专家', desc: '定位诊断优化' },
      { key: 'titleExpert', label: '爆款标题专员', desc: '标题优化建议' },
      { key: 'longTermPlan', label: '长线选题规划', desc: '选题日历制定' },
    ],
    apiPath: '/api/v1/workflow/topic',
  },
  {
    id: 'script',
    label: '文案创作',
    emoji: '📝',
    breadcrumb: '工作流 / 文案创作',
    inputs: [
      { key: 'topic', label: '核心主题', placeholder: '输入原始选题或创意关键词，例如：如何用AI提升短视频文案效率...', multiline: true },
    ],
    styles: [
      { value: 'humor', label: '幽默', emoji: '🤪' },
      { value: 'professional', label: '专业', emoji: '💼' },
      { value: 'warm', label: '温馨', emoji: '❤️' },
      { value: 'viral', label: '爆款', emoji: '🔥' },
    ],
    agents: [
      { key: 'framework', label: '智能跟创', desc: '生成框架' },
      { key: 'titleGenerator', label: '标题生成师', desc: '多版标题' },
      { key: 'hookDesigner', label: '钩子设计师', desc: '前3秒吸睛' },
      { key: 'textRewriter', label: '文本改写师', desc: '通俗化' },
      { key: 'sellingPoint', label: '卖点策划师', desc: '挖掘痛点' },
      { key: 'riskControl', label: '违禁词风控员', desc: '规避违规' },
      { key: 'marketingCopy', label: '营销文案助手', desc: '转化话术' },
    ],
    apiPath: '/api/v1/workflow/create_script',
  },
  {
    id: 'title',
    label: '标题生成',
    emoji: '🏷️',
    breadcrumb: '工作流 / 标题生成',
    inputs: [
      { key: 'scriptSummary', label: '文案摘要', placeholder: '输入文案核心内容或自动从上一步填充，AI 将基于此生成爆款标题...', multiline: true },
    ],
    styles: [
      { value: 'clickbait', label: '吸睛型', emoji: '🔥' },
      { value: 'informative', label: '干货型', emoji: '📚' },
      { value: 'emotional', label: '情感型', emoji: '❤️' },
      { value: 'suspense', label: '悬念型', emoji: '🤔' },
    ],
    agents: [
      { key: 'titleMaster', label: '爆款标题师', desc: '生成多版爆款标题' },
      { key: 'platformOptimizer', label: '平台适配师', desc: '不同平台标题优化' },
      { key: 'abTestPlanner', label: 'A/B测试师', desc: '标题对比方案' },
    ],
    apiPath: '/api/v1/workflow/generate_titles',
  },
  {
    id: 'video',
    label: '视频制作',
    emoji: '📹',
    breadcrumb: '工作流 / 视频制作',
    inputs: [
      { key: 'script', label: '视频文案/脚本', placeholder: '粘贴或输入视频文案脚本，也可输入已有文案的编号...', multiline: true },
    ],
    styles: [
      { value: '9:16', label: '竖版 9:16', emoji: '📱' },
      { value: '16:9', label: '横版 16:9', emoji: '🖥️' },
      { value: '1:1', label: '方形 1:1', emoji: '⬜' },
    ],
    agents: [
      { key: 'smart_cut', label: '数字人智剪', desc: '模板+素材制作' },
      { key: 'avatar_video', label: '数字人视频', desc: '形象/声音克隆' },
      { key: 'brand_magic', label: '品宣魔方', desc: '品牌宣传视频' },
      { key: 'model_explain', label: '智模讲解', desc: '智能讲解视频' },
      { key: 'draw_master', label: '生图大师', desc: '配套图片素材' },
      { key: 'video_publisher', label: '视频发布员', desc: '智能发布管理' },
    ],
    apiPath: '/api/v1/video/workflow',
  },
  {
    id: 'videoDeconstruct',
    label: '视频拆解',
    emoji: '🔬',
    breadcrumb: '工作流 / 视频拆解',
    inputs: [
      { key: 'videoUrl', label: '视频链接', placeholder: '粘贴视频分享链接，支持抖音、小红书、B站、快手等平台' },
    ],
    styles: [],
    agents: [
      { key: 'structure', label: '结构拆解', desc: '视频框架分析' },
      { key: 'hook', label: '钩子分析', desc: '开头吸引力拆解' },
      { key: 'script', label: '文案还原', desc: '口播文案还原' },
      { key: 'visual', label: '视觉分析', desc: '画面镜头拆解' },
      { key: 'rhythm', label: '节奏分析', desc: '叙事节奏拆解' },
      { key: 'replicate', label: '复刻建议', desc: '可复制元素提炼' },
    ],
    apiPath: '/api/v1/video/deconstruct',
  },
  {
    id: 'viralFollowUp',
    label: '爆款跟拍',
    emoji: '🔥',
    breadcrumb: '工作流 / 爆款跟拍',
    inputs: [
      { key: 'videoUrl', label: '视频链接', placeholder: '粘贴爆款视频分享链接，AI 生成跟拍方案' },
    ],
    styles: [],
    agents: [
      { key: 'scriptAdapt', label: '脚本改编', desc: '爆款脚本本地化改编' },
      { key: 'shotList', label: '分镜脚本', desc: '逐镜拍摄方案' },
      { key: 'propList', label: '道具清单', desc: '拍摄道具准备' },
      { key: 'caption', label: '字幕文案', desc: '口播字幕生成' },
      { key: 'publishPlan', label: '发布策略', desc: '最佳发布时机' },
      { key: 'diffStrategy', label: '差异化建议', desc: '避免同质化' },
    ],
    apiPath: '/api/v1/video/viral_follow_up',
  },
  {
    id: 'private',
    label: '私域运营',
    emoji: '👥',
    breadcrumb: '工作流 / 私域运营',
    inputs: [
      { key: 'accountInfo', label: '账号/业务信息', placeholder: '输入你的账号类型、业务方向、目标用户群体...', multiline: true },
    ],
    styles: [],
    agents: [
      { key: 'management', label: '私域管理', desc: '基础配置管理' },
      { key: 'growth', label: '私域拉新专员', desc: '拉新策略制定' },
      { key: 'dmExpert', label: '微信私信专家', desc: '私信话术设计' },
      { key: 'moments', label: '朋友圈策划师', desc: '内容规划优化' },
      { key: 'funnel', label: '私域引流策划师', desc: '引流方案生成' },
      { key: 'ipStrategy', label: 'IP定位策划师', desc: '人设强化策略' },
    ],
    apiPath: '/api/v1/workflow/private_domain',
  },
  {
    id: 'market',
    label: '市场分析',
    emoji: '📈',
    breadcrumb: '工作流 / 市场分析',
    inputs: [
      { key: 'dimension', label: '分析维度与关键词', placeholder: '输入分析方向，例如：竞品策略分析、用户画像洞察、行业趋势预测...', multiline: true },
    ],
    styles: [
      { value: 'competitor', label: '竞品分析', emoji: '⚔️' },
      { value: 'user', label: '用户洞察', emoji: '👤' },
      { value: 'trend', label: '趋势预测', emoji: '📊' },
      { value: 'comprehensive', label: '综合分析', emoji: '🎯' },
    ],
    agents: [
      { key: 'marketingPlan', label: '营销方案专家', desc: '整体方案制定' },
      { key: 'demandAnalyst', label: '需求分析师', desc: '用户需求洞察' },
      { key: 'salesTalk', label: '成交话术专家', desc: '转化话术设计' },
      { key: 'sellingPoint', label: '产品卖点挖掘师', desc: '核心卖点提炼' },
      { key: 'branding', label: '品牌宣传专家', desc: '品牌策略制定' },
      { key: 'adCopy', label: '广告文案大师', desc: '广告创意文案' },
    ],
    apiPath: '/api/v1/workflow/market',
  },
  {
    id: 'boss',
    label: '老板助手',
    emoji: '👔',
    breadcrumb: '工作流 / 老板助手',
    inputs: [
      { key: 'query', label: '查询需求', placeholder: '输入你想了解的数据维度，例如：本周各账号数据汇总、ROI分析...', multiline: true },
    ],
    styles: [
      { value: 'daily', label: '日报', emoji: '📅' },
      { value: 'weekly', label: '周报', emoji: '📆' },
      { value: 'monthly', label: '月报', emoji: '🗓️' },
    ],
    agents: [
      { key: 'dashboard', label: '数据看板', desc: 'DeepSeek 数据总结' },
      { key: 'smartReport', label: '智能报告', desc: 'DeepSeek 自动报告' },
      { key: 'assistant', label: '运营助理', desc: 'Claude Code 执行建议' },
    ],
    apiPath: '/api/v1/workflow/boss',
  },
  {
    id: 'resource',
    label: '资源管理',
    emoji: '📦',
    breadcrumb: '工作流 / 资源管理',
    inputs: [
      { key: 'search', label: '搜索资源', placeholder: '输入关键词搜索素材，例如：片头模板、背景音乐、产品图片...' },
    ],
    styles: [],
    agents: [
      { key: 'videoLib', label: '视频素材库', desc: '视频素材管理' },
      { key: 'copyLib', label: '文案库', desc: '文案资产管理' },
      { key: 'templateLib', label: '模板库', desc: '片头片尾字幕条' },
      { key: 'imageLib', label: '图片素材库', desc: '图片素材管理' },
      { key: 'musicLib', label: '音乐音效库', desc: '背景音乐音效' },
    ],
    apiPath: '/api/v1/workflow/resource',
  },
  {
    id: 'channel',
    label: '频道任务',
    emoji: '🤖',
    breadcrumb: '工作流 / 频道任务（自动化）',
    inputs: [
      { key: 'taskName', label: '任务名称', placeholder: '输入任务名称，例如：每日内容发布、节日活动推广...' },
      { key: 'taskDesc', label: '任务描述', placeholder: '描述任务目标、时间范围、负责人等...', multiline: true },
    ],
    styles: [],
    agents: [
      { key: 'hotspot', label: '热点追踪', desc: '全网热点抓取' },
      { key: 'daily', label: '日常任务', desc: '每日发布/互动' },
      { key: 'special', label: '专题任务', desc: '节日/热点追更' },
      { key: 'collab', label: '合作任务', desc: '品牌/达人联动' },
      { key: 'conversion', label: '转化任务', desc: '直播/私域引流' },
    ],
    apiPath: '/api/v1/workflow/channel_task',
  },
]

export function getWorkflowDef(id: string): WorkflowDef | undefined {
  return WORKFLOWS.find((w) => w.id === id)
}
