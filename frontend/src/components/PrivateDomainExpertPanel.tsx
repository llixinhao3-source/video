import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
    Play, Loader2, CheckCircle2, ChevronDown, ChevronUp,
    Copy, Check, Sparkles, Database, Plus, Pencil, Trash2,
    X, Columns3, Settings2,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useProjectPipeline } from '@/hooks/useProjectPipeline'

const API_BASE = 'http://localhost:8001'

interface FormField {
    field_id: string
    label: string
    type: 'Select' | 'Radio' | 'Textarea'
    options?: string[]
    placeholder?: string
    required?: boolean
}

interface TableColumn {
    column_id: string
    title: string
    type: 'Input' | 'Textarea' | 'Number'
    required?: boolean
    editable?: boolean
}

interface ExpertDef {
    expert_id: string
    expert_name: string
    emoji: string
    color: string
    business_sop: string
    form_schema: { fields: FormField[] }
    asset_center_schema: {
        tab_title: string
        table_columns: TableColumn[]
    }
}

interface DataRecord {
    id: string
    [key: string]: string | number
}

const DEFAULT_EXPERTS: ExpertDef[] = [
    {
        expert_id: 'private_management', expert_name: '私域管理', emoji: '🧱', color: '#007AFF',
        business_sop: '负责私域底座设计、用户分层标签规则定义与多账号资产分配，是流量沉淀的中央指挥官。',
        form_schema: { fields: [
            { field_id: 'carrier_type', label: '承接载体', type: 'Select', options: ['企业微信', '个人微信', '企微群/粉丝群'], required: true },
            { field_id: 'welcome_trigger', label: '欢迎语触发时机', type: 'Radio', options: ['立刻触发', '延迟30秒', '延迟1分钟'], required: false },
            { field_id: 'content_ratio_phase', label: '运营阶段（内容比例参考）', type: 'Radio', options: ['前期-弱营销(人设7:产品3)', '中期-过渡(人设6:产品4)', '后期-成熟(人设5:产品5)'], required: false },
            { field_id: 'management_remark', label: '全局流向及运营批注', type: 'Textarea', placeholder: '请输入流向批注或特殊规则...', required: false },
        ]},
        asset_center_schema: { tab_title: '用户分层与运营载体资产库', table_columns: [
            { column_id: 'tag_name', title: '标签名称', type: 'Input', required: true, editable: true },
            { column_id: 'trigger_condition', title: '触发条件/动作', type: 'Input', required: false, editable: true },
            { column_id: 'assigned_staff', title: '分配承接客服(微信号)', type: 'Input', required: true, editable: true },
            { column_id: 'follow_up_strategy', title: '跟进策略备注', type: 'Textarea', required: false, editable: true },
        ]},
    },
    {
        expert_id: 'private_attraction', expert_name: '私域拉新专员', emoji: '🧲', color: '#FF9500',
        business_sop: '负责设计从公域（抖音/小红书等）向私域导流的利益诱饵与裂变路径，通过企业资产库中的福利包实现高效抓取。',
        form_schema: { fields: [
            { field_id: 'public_platform', label: '公域来源平台', type: 'Select', options: ['抖音', '小红书', '快手', '微信视频号', 'B站', '多平台混合'], required: true },
            { field_id: 'hook_type', label: '核心钩子类型', type: 'Select', options: ['行业白皮书/PDF资料包', '工具源码包/模板套件', '免费诊断权益/评测服务', '优惠券/限时折扣码', '进入专属社群资格'], required: true },
            { field_id: 'fission_level', label: '裂变机制', type: 'Radio', options: ['单人加微即送', '邀请2人助力解锁', '朋友圈集赞N个', '分享朋友圈截图', '无门槛-直接领取'], required: true },
            { field_id: 'attraction_remark', label: '拉新活动策略批注', type: 'Textarea', placeholder: '请输入活动主题、目标人群、预期效果...', required: false },
        ]},
        asset_center_schema: { tab_title: '公域引流钩子与福利资产库', table_columns: [
            { column_id: 'hook_name', title: '福利/资料名称', type: 'Input', required: true, editable: true },
            { column_id: 'hook_category', title: '钩子分类', type: 'Input', required: false, editable: true },
            { column_id: 'file_url', title: '资产下载链接/存储路径', type: 'Input', required: true, editable: true },
            { column_id: 'estimated_value', title: '包装对外价值(元)', type: 'Number', required: false, editable: true },
            { column_id: 'suitable_platform', title: '适配平台', type: 'Input', required: false, editable: true },
        ]},
    },
    {
        expert_id: 'wechat_private_chat', expert_name: '微信私信专家', emoji: '💬', color: '#5856D6',
        business_sop: '负责高转化率的1对1对话流设计、新粉破冰以及高频客户异议（Q&A资产库）的精准化解。参考「朋友圈搭建.pdf」三大维度理论设计话术。',
        form_schema: { fields: [
            { field_id: 'chat_stage', label: '当前对话阶段', type: 'Select', options: ['新粉自动破冰', '核心产品询价', '异议化解/催单', '老客复购激活'], required: true },
            { field_id: 'chat_tone', label: '人设语气风格', type: 'Select', options: ['专业导师型（干货为主）', '暖心闺蜜型（共情为主）', '官方客服型（高效为主）', '实战老炮型（犀利直接）'], required: true },
            { field_id: 'response_speed', label: '回复速度要求', type: 'Radio', options: ['即时自动回复', '30分钟内人工', '2小时内人工'], required: false },
            { field_id: 'chat_remark', label: '客户特殊异议批注', type: 'Textarea', placeholder: '请输入客户目前的顾虑或特殊场景...', required: false },
        ]},
        asset_center_schema: { tab_title: '黄金 Q&A 标准异议资产库', table_columns: [
            { column_id: 'customer_question', title: '客户常见核心痛点/提问', type: 'Input', required: true, editable: true },
            { column_id: 'standard_answer', title: '企业标准话术答案(供AI学习)', type: 'Textarea', required: true, editable: true },
            { column_id: 'answer_type', title: '话术类型', type: 'Input', required: false, editable: true },
            { column_id: 'use_frequency', title: '使用频率', type: 'Input', required: false, editable: true },
        ]},
    },
    {
        expert_id: 'moments_planner', expert_name: '朋友圈策划师', emoji: '📱', color: '#34C759',
        business_sop: '根据黄金内容比例（人设7:产品3）规划朋友圈剧场流，负责撰写极具信任感和转化力的文案，并调度见证资产。深度遵循「朋友圈搭建.pdf」中的三大维度内容体系。',
        form_schema: { fields: [
            { field_id: 'moments_theme', label: '今日发布主题', type: 'Select', options: ['人设日常-工作状态', '人设日常-生活碎片', '用户干货-方法教程', '用户互动-话题调研', '产品服务-权威展示', '产品口碑-买家秀/好评', '限时活动-促销催单'], required: true },
            { field_id: 'moments_dimension', label: '内容维度归属', type: 'Radio', options: ['用户相关（干货/互动）', '人设相关（日常/态度）', '产品相关（服务/口碑/权威）'], required: true },
            { field_id: 'moments_layout', label: '排版及格式', type: 'Select', options: ['短文案+九宫格图(6-9张)', '长文案+单图/视频', '纯文字评论区引导', '九宫格故事连发'], required: false },
            { field_id: 'moments_remark', label: '朋友圈事件素材批注', type: 'Textarea', placeholder: '请描述今日素材事件、具体产品或案例亮点...', required: false },
        ]},
        asset_center_schema: { tab_title: '客户见证与案例背书素材库', table_columns: [
            { column_id: 'case_title', title: '案例简述', type: 'Input', required: true, editable: true },
            { column_id: 'case_result', title: '核心成果/数据', type: 'Input', required: true, editable: true },
            { column_id: 'feedback_text', title: '客户真实反馈原文', type: 'Textarea', required: true, editable: true },
            { column_id: 'image_assets', title: '对应配图URL', type: 'Input', required: false, editable: true },
            { column_id: 'case_tag', title: '案例标签', type: 'Input', required: false, editable: true },
        ]},
    },
    {
        expert_id: 'private_funnel', expert_name: '私域引流策划师', emoji: '🛡️', color: '#AF52DE',
        business_sop: '负责打通短视频评论区截流、主页简介、粉丝群置顶等公域到私域的合规安全路径规划。提供抖+私域50个案例中验证过的引流方法论。',
        form_schema: { fields: [
            { field_id: 'funnel_scene', label: '公域引流场景', type: 'Select', options: ['抖音评论区截流', '抖音主页简介/背景墙', '抖音粉丝群公告置顶', '小红书私信主动触达', '小红书评论区截流', '快手评论区截流', '多平台组合策略'], required: true },
            { field_id: 'safety_level', label: '风控规避级别', type: 'Radio', options: ['标准安全替换（谐音/符号）', '高级符号变体（emoji替代）', '纯文字引导（不提微信）'], required: true },
            { field_id: 'funnel_content_type', label: '引流钩子形式', type: 'Select', options: ['资料包领取（PDF/清单）', '工具免费用', '1对1诊断名额', '进入粉丝群', '优惠码领取', '课程试听入口'], required: false },
            { field_id: 'funnel_remark', label: '截流引导暗号批注', type: 'Textarea', placeholder: '请输入引流口令或具体话术需求...', required: false },
        ]},
        asset_center_schema: { tab_title: '公域防封安全变体词典', table_columns: [
            { column_id: 'sensitive_word', title: '平台违规敏感词', type: 'Input', required: true, editable: true },
            { column_id: 'safe_replace', title: '安全替换词/符号', type: 'Input', required: true, editable: true },
            { column_id: 'applicable_scene', title: '适用场景', type: 'Input', required: false, editable: true },
            { column_id: 'platform', title: '适用平台', type: 'Input', required: false, editable: true },
        ]},
    },
    {
        expert_id: 'ip_positioning', expert_name: 'IP定位策划师', emoji: '👑', color: '#FF6B6B',
        business_sop: '提取主理人的核心故事母体（StoryBrand），规范私域常用口头禅与调性，确保全流程言行一致。深度运用「打造私域人设.pdf」中的IP四件套方法论。',
        form_schema: { fields: [
            { field_id: 'ip_persona', label: '主理人人设面具', type: 'Select', options: ['资深实战导师（专业干货型）', '行业毒舌老炮（犀利直接型）', '陪跑创业小白（共情陪伴型）', '暖心闺蜜（情感共鸣型）', '官方客服（高效专业型）'], required: true },
            { field_id: 'monetization_path', label: '变现商业路径', type: 'Select', options: ['高客单1对1咨询', '标准线上训练营', '工具/SaaS续费', '知识星球/社群会员', '广告/品牌合作', '直播带货'], required: true },
            { field_id: 'content_style', label: '内容输出风格', type: 'Radio', options: ['干货方法论为主', '日常分享为主', '案例故事为主', '幽默吐槽为主', '严肃专业为主'], required: false },
            { field_id: 'ip_remark', label: '人设特征强化批注', type: 'Textarea', placeholder: '请输入专属语调、口头禅、人设背景故事...', required: false },
        ]},
        asset_center_schema: { tab_title: '主理人专属语调与品牌故事资产库', table_columns: [
            { column_id: 'story_milestone', title: 'IP核心故事节点/战绩', type: 'Input', required: true, editable: true },
            { column_id: 'story_type', title: '故事类型', type: 'Input', required: false, editable: true },
            { column_id: 'catchphrase', title: '标志性口头禅/高频词', type: 'Input', required: true, editable: true },
            { column_id: 'apply_scene', title: '常用场景', type: 'Input', required: false, editable: true },
        ]},
    },
]

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
    return (
        <button onClick={(e) => { e.stopPropagation(); onToggle() }}
            className={`relative w-[44px] h-[26px] rounded-full transition-colors duration-300 flex-shrink-0 ${enabled ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'}`}>
            <div className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform duration-300 ${enabled ? 'translate-x-[21px]' : 'translate-x-[3px]'}`} />
        </button>
    )
}

function CopyBtn({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button onClick={async (e) => { e.stopPropagation(); await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#86868B] hover:text-[#1D1D1F] hover:bg-white/60 transition-colors">
            {copied ? <Check className="w-3 h-3 text-[#34C759]" /> : <Copy className="w-3 h-3" />}
            {copied ? '已复制' : '复制'}
        </button>
    )
}

export default function PrivateDomainExpertPanel() {
    const { showToast } = useAppStore()
    const pipeline = useProjectPipeline()
    const projectId = pipeline.projectId || ''

    const [experts, setExperts] = useState<ExpertDef[]>(DEFAULT_EXPERTS)
    const [cardState, setCardState] = useState<Record<string, {
        active: boolean; isGenerating: boolean; resultMarkdown: string; isExpanded: boolean; assetOpen: boolean
    }>>(() => {
        const m: Record<string, { active: boolean; isGenerating: boolean; resultMarkdown: string; isExpanded: boolean; assetOpen: boolean }> = {}
        for (const e of DEFAULT_EXPERTS) m[e.expert_id] = { active: false, isGenerating: false, resultMarkdown: '', isExpanded: false, assetOpen: false }
        return m
    })

    const [params, setParams] = useState<Record<string, Record<string, string>>>(() => {
        const m: Record<string, Record<string, string>> = {}
        for (const e of DEFAULT_EXPERTS) {
            m[e.expert_id] = {}
            for (const f of e.form_schema.fields) m[e.expert_id][f.field_id] = f.options?.[0] || ''
        }
        return m
    })

    const [records, setRecords] = useState<Record<string, DataRecord[]>>({})
    const [columns, setColumns] = useState<Record<string, TableColumn[]>>({})
    const [editingRecord, setEditingRecord] = useState<Record<string, string | null>>({})
    const [editBuffer, setEditBuffer] = useState<Record<string, Record<string, Record<string, string>>>>({})
    const [showAddRecord, setShowAddRecord] = useState<Record<string, boolean>>({})
    const [newRecord, setNewRecord] = useState<Record<string, Record<string, string>>>({})
    const [showAddColumn, setShowAddColumn] = useState<Record<string, boolean>>({})
    const [newCol, setNewCol] = useState<Record<string, { column_id: string; title: string; type: string }>>({})

    const [optionMgrOpen, setOptionMgrOpen] = useState<Record<string, boolean>>({})
    const [newOptionInput, setNewOptionInput] = useState<Record<string, string>>({})

    useEffect(() => {
        fetch(`${API_BASE}/api/v1/private-domain/experts`)
            .then(r => r.json())
            .then(d => {
                if (d?.data?.length) {
                    setExperts(d.data)
                    const cs: Record<string, { active: boolean; isGenerating: boolean; resultMarkdown: string; isExpanded: boolean; assetOpen: boolean }> = {}
                    const pm: Record<string, Record<string, string>> = {}
                    for (const e of d.data) {
                        cs[e.expert_id] = { active: false, isGenerating: false, resultMarkdown: '', isExpanded: false, assetOpen: false }
                        pm[e.expert_id] = {}
                        for (const f of e.form_schema.fields) pm[e.expert_id][f.field_id] = f.options?.[0] || ''
                    }
                    setCardState(prev => ({ ...cs, ...prev }))
                    setParams(prev => ({ ...pm, ...prev }))
                }
            })
            .catch(() => {})
    }, [])

    const loadAssets = useCallback(async (expertId: string) => {
        if (!projectId) return
        try {
            const [recRes, colRes] = await Promise.all([
                fetch(`${API_BASE}/api/v1/private-domain/${expertId}/records?project_id=${projectId}`),
                fetch(`${API_BASE}/api/v1/private-domain/${expertId}/columns?project_id=${projectId}`),
            ])
            const recData = await recRes.json()
            const colData = await colRes.json()
            if (recData?.data) setRecords(prev => ({ ...prev, [expertId]: recData.data }))
            if (colData?.data) setColumns(prev => ({ ...prev, [expertId]: colData.data }))
        } catch { showToast('资产加载失败', 'error') }
    }, [projectId, showToast])

    const updateCard = (k: string, p: Partial<{ active: boolean; isGenerating: boolean; resultMarkdown: string; isExpanded: boolean; assetOpen: boolean }>) => {
        setCardState(prev => ({ ...prev, [k]: { ...prev[k], ...p } }))
    }
    const setParam = (eid: string, fid: string, val: string) => {
        setParams(prev => ({ ...prev, [eid]: { ...prev[eid], [fid]: val } }))
    }

    const getColumns = (eid: string) => columns[eid] || experts.find(e => e.expert_id === eid)?.asset_center_schema.table_columns || []
    const getRecords = (eid: string) => records[eid] || []

    const syncFieldToBackend = async (eid: string, fieldId: string, updatedField: FormField) => {
        if (!projectId) return
        try {
            await fetch(`${API_BASE}/api/v1/private-domain/${eid}/fields/${fieldId}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: projectId, updates: { options: updatedField.options } }),
            })
        } catch { showToast('选项同步后端失败', 'error') }
    }

    const updateExpertField = (eid: string, fieldId: string, patch: Partial<FormField>) => {
        setExperts(prev => prev.map(e => {
            if (e.expert_id !== eid) return e
            return { ...e, form_schema: { fields: e.form_schema.fields.map(f => f.field_id === fieldId ? { ...f, ...patch } : f) } }
        }))
    }

    const handleAddOption = async (eid: string, fieldId: string) => {
        const key = `${eid}__${fieldId}`
        const val = (newOptionInput[key] || '').trim()
        if (!val) return
        const expert = experts.find(e => e.expert_id === eid)
        const field = expert?.form_schema.fields.find(f => f.field_id === fieldId)
        if (!field) return
        if ((field.options || []).includes(val)) { showToast('选项已存在', 'error'); return }
        const newOptions = [...(field.options || []), val]
        updateExpertField(eid, fieldId, { options: newOptions })
        setNewOptionInput(prev => ({ ...prev, [key]: '' }))
        if (!params[eid]?.[fieldId]) setParam(eid, fieldId, val)
        await syncFieldToBackend(eid, fieldId, { ...field, options: newOptions })
        showToast('选项已添加', 'success')
    }

    const handleDeleteOption = async (eid: string, fieldId: string, opt: string) => {
        const expert = experts.find(e => e.expert_id === eid)
        const field = expert?.form_schema.fields.find(f => f.field_id === fieldId)
        if (!field) return
        const newOptions = (field.options || []).filter(o => o !== opt)
        updateExpertField(eid, fieldId, { options: newOptions })
        if (params[eid]?.[fieldId] === opt) {
            setParam(eid, fieldId, newOptions[0] || '')
        }
        await syncFieldToBackend(eid, fieldId, { ...field, options: newOptions })
        showToast('选项已删除', 'success')
    }

    const handleCreateRecord = async (eid: string) => {
        if (!projectId) { showToast('项目未初始化', 'error'); return }
        const buf = newRecord[eid] || {}
        if (!Object.keys(buf).length) return
        try {
            const res = await fetch(`${API_BASE}/api/v1/private-domain/${eid}/records`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: projectId, record: buf }),
            })
            if (!res.ok) throw new Error('创建失败')
            const d = await res.json()
            setRecords(prev => ({ ...prev, [eid]: [...(prev[eid] || []), d.data] }))
            setShowAddRecord(prev => ({ ...prev, [eid]: false }))
            setNewRecord(prev => ({ ...prev, [eid]: {} }))
            showToast('记录已添加', 'success')
        } catch (err) { showToast(err instanceof Error ? err.message : '创建失败', 'error') }
    }

    const handleUpdateRecord = async (eid: string, rid: string) => {
        if (!projectId) return
        const buf = editBuffer[eid]?.[rid] ? Object.fromEntries(
            Object.entries(editBuffer[eid][rid]).filter(([k]) => k !== 'id')
        ) : {}
        if (!Object.keys(buf).length) { setEditingRecord(prev => ({ ...prev, [eid]: null })); return }
        try {
            const res = await fetch(`${API_BASE}/api/v1/private-domain/${eid}/records/${rid}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: projectId, updates: buf }),
            })
            if (!res.ok) throw new Error('更新失败')
            const d = await res.json()
            setRecords(prev => ({
                ...prev,
                [eid]: (prev[eid] || []).map(r => r.id === rid ? d.data : r),
            }))
            setEditingRecord(prev => ({ ...prev, [eid]: null }))
            showToast('记录已更新', 'success')
        } catch (err) { showToast(err instanceof Error ? err.message : '更新失败', 'error') }
    }

    const handleDeleteRecord = async (eid: string, rid: string) => {
        if (!projectId) return
        try {
            const res = await fetch(`${API_BASE}/api/v1/private-domain/${eid}/records/${rid}?project_id=${projectId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('删除失败')
            setRecords(prev => ({ ...prev, [eid]: (prev[eid] || []).filter(r => r.id !== rid) }))
            showToast('记录已删除', 'success')
        } catch (err) { showToast(err instanceof Error ? err.message : '删除失败', 'error') }
    }

    const handleAddColumn = async (eid: string) => {
        if (!projectId) return
        const c = newCol[eid]
        if (!c?.column_id || !c?.title) { showToast('请填写列ID和标题', 'error'); return }
        try {
            const res = await fetch(`${API_BASE}/api/v1/private-domain/${eid}/columns`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: projectId, column: { ...c, required: false, editable: true } }),
            })
            if (!res.ok) throw new Error('添加列失败')
            const d = await res.json()
            setColumns(prev => ({ ...prev, [eid]: [...(prev[eid] || getColumns(eid)), d.data] }))
            setShowAddColumn(prev => ({ ...prev, [eid]: false }))
            setNewCol(prev => ({ ...prev, [eid]: { column_id: '', title: '', type: 'Input' } }))
            showToast('列已添加', 'success')
        } catch (err) { showToast(err instanceof Error ? err.message : '添加列失败', 'error') }
    }

    const handleDeleteColumn = async (eid: string, cid: string) => {
        if (!projectId) return
        try {
            const res = await fetch(`${API_BASE}/api/v1/private-domain/${eid}/columns/${cid}?project_id=${projectId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('删除列失败')
            setColumns(prev => ({ ...prev, [eid]: (prev[eid] || getColumns(eid)).filter(c => c.column_id !== cid) }))
            setRecords(prev => ({
                ...prev,
                [eid]: (prev[eid] || []).map(r => { const nr = { ...r }; delete nr[cid]; return nr }),
            }))
            showToast('列已删除', 'success')
        } catch (err) { showToast(err instanceof Error ? err.message : '删除列失败', 'error') }
    }

    const runExpert = async (expert: ExpertDef) => {
        let pid = projectId
        if (!pid) {
            try {
                const res = await fetch(`${API_BASE}/api/v1/project/init`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                })
                if (res.ok) {
                    const json = await res.json()
                    pid = json.project_id
                    pipeline.setProjectId(pid)
                }
            } catch { /* ignore */ }
        }
        if (!pid) { showToast('项目未初始化，请先完成账号定位', 'error'); return }
        updateCard(expert.expert_id, { isGenerating: true })
        try {
            const fd = new FormData()
            fd.append('project_id', pid)
            fd.append('agent_key', expert.expert_id)
            const textareaField = expert.form_schema.fields.find(f => f.type === 'Textarea')
            const remark = textareaField ? params[expert.expert_id]?.[textareaField.field_id] || '' : ''
            fd.append('user_custom_instruction', remark)
            fd.append('domain_params_json', JSON.stringify(params[expert.expert_id] || {}))
            const res = await fetch(`${API_BASE}/api/v1/private-domain/run-expert`, { method: 'POST', body: fd })
            if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.detail || `请求失败: ${res.status}`) }
            const json = await res.json()
            updateCard(expert.expert_id, { resultMarkdown: json.output || '', isExpanded: true })
            showToast(`${expert.expert_name} 执行完成 → ${json.target_file}`, 'success')
        } catch (err) {
            showToast(err instanceof Error ? err.message : '执行失败', 'error')
        } finally { updateCard(expert.expert_id, { isGenerating: false }) }
    }

    const leftFields = (e: ExpertDef) => e.form_schema.fields.filter(f => f.type !== 'Textarea')
    const rightField = (e: ExpertDef) => e.form_schema.fields.find(f => f.type === 'Textarea')

    return (
        <div>
            <label className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F] mb-3">
                <Sparkles className="w-4 h-4 text-[#86868B]" />
                第三步：定制专家链（私域独立执行）
            </label>
            <div className="grid grid-cols-1 gap-3">
                {experts.map(expert => {
                    const st = cardState[expert.expert_id] || { active: false, isGenerating: false, resultMarkdown: '', isExpanded: false, assetOpen: false }
                    const isRunning = st.isGenerating
                    const hasResult = !!st.resultMarkdown
                    const isActive = st.active
                    const cols = getColumns(expert.expert_id)
                    const recs = getRecords(expert.expert_id)
                    const rf = rightField(expert)

                    return (
                        <motion.div key={expert.expert_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                            className={`rounded-2xl border transition-all duration-200 ${
                                isRunning ? 'border-[#007AFF]/30 bg-[#007AFF]/3' : hasResult ? 'border-[#34C759]/20 bg-[#F0FFF4]/50 shadow-sm'
                                : isActive ? 'border-slate-100 bg-white shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                            }`}>
                            <div className="flex items-center gap-3 px-5 py-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[17px] flex-shrink-0"
                                    style={{ backgroundColor: `${expert.color}15` }}>{expert.emoji}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] font-semibold text-[#1D1D1F]">{expert.expert_name}</span>
                                        {hasResult && <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#34C759]/15 text-[10px] text-[#34C759] font-medium"><CheckCircle2 className="w-2.5 h-2.5" /> 已完成</span>}
                                    </div>
                                    <span className="text-[12px] text-[#86868B] line-clamp-1">{expert.business_sop}</span>
                                </div>
                                <Toggle enabled={isActive} onToggle={() => {
                                    const next = !isActive
                                    updateCard(expert.expert_id, { active: next, isExpanded: false })
                                    if (next && !records[expert.expert_id]) loadAssets(expert.expert_id)
                                }} />
                            </div>

                            <div className={`grid transition-all duration-300 ${isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                    <div className="px-5 pb-4 grid grid-cols-[240px_1fr] gap-5">
                                        <div className="space-y-4">
                                            {leftFields(expert).map(f => {
                                                const mgrKey = `${expert.expert_id}__${f.field_id}`
                                                const isMgrOpen = optionMgrOpen[mgrKey]
                                                return (
                                                    <div key={f.field_id}>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-medium text-[#86868B]">{f.label}{f.required && <span className="text-[#FF3B30] ml-0.5">*</span>}</span>
                                                            <button onClick={() => setOptionMgrOpen(prev => ({ ...prev, [mgrKey]: !prev[mgrKey] }))}
                                                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/5 transition-colors">
                                                                <Settings2 className="w-2.5 h-2.5" /> 管理选项
                                                            </button>
                                                        </div>

                                                        {f.type === 'Select' && (
                                                            <select value={params[expert.expert_id]?.[f.field_id] || ''} onChange={e => setParam(expert.expert_id, f.field_id, e.target.value)} disabled={isRunning}
                                                                className="mt-1.5 w-full h-[36px] pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-[12px] text-[#1D1D1F] outline-none focus:border-[#007AFF]/30 appearance-none cursor-pointer disabled:opacity-50">
                                                                {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                                                            </select>
                                                        )}

                                                        {f.type === 'Radio' && (
                                                            <div className="mt-2 grid grid-cols-1 gap-1.5">
                                                                {(f.options || []).map(o => (
                                                                    <button key={o} onClick={() => setParam(expert.expert_id, f.field_id, o)} disabled={isRunning}
                                                                        className={`px-3 py-2 rounded-xl text-[11px] font-medium border text-left transition-all duration-200 ${params[expert.expert_id]?.[f.field_id] === o ? 'border-[#007AFF]/40 bg-[#007AFF]/8 text-[#007AFF]' : 'border-slate-100 bg-white text-[#86868B] hover:border-slate-200'} disabled:opacity-50`}>{o}</button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <AnimatePresence>
                                                            {isMgrOpen && (
                                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                                    <div className="mt-2 p-2.5 rounded-xl bg-[#F5F5F7]/80 border border-slate-100 space-y-1.5">
                                                                        {(f.options || []).map(o => (
                                                                            <div key={o} className="flex items-center gap-1.5 group">
                                                                                <span className="flex-1 text-[11px] text-[#1D1D1F] truncate">{o}</span>
                                                                                <button onClick={() => handleDeleteOption(expert.expert_id, f.field_id, o)}
                                                                                    className="p-0.5 rounded text-[#C7C7CC] hover:text-[#FF3B30] hover:bg-[#FF3B30]/5 transition-colors opacity-0 group-hover:opacity-100">
                                                                                    <Trash2 className="w-2.5 h-2.5" />
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                        <div className="flex items-center gap-1.5 pt-1">
                                                                            <input value={newOptionInput[mgrKey] || ''}
                                                                                onChange={e => setNewOptionInput(prev => ({ ...prev, [mgrKey]: e.target.value }))}
                                                                                onKeyDown={e => { if (e.key === 'Enter') handleAddOption(expert.expert_id, f.field_id) }}
                                                                                placeholder="输入新选项..."
                                                                                className="flex-1 h-[28px] px-2 rounded-lg border border-slate-200 bg-white text-[11px] outline-none focus:border-[#007AFF]/30" />
                                                                            <button onClick={() => handleAddOption(expert.expert_id, f.field_id)}
                                                                                className="h-[28px] px-2 rounded-lg bg-[#007AFF] text-white text-[10px] font-medium hover:bg-[#0066DD] transition-colors flex items-center gap-0.5">
                                                                                <Plus className="w-2.5 h-2.5" /> 添加
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <div className="flex flex-col">
                                            {rf && (
                                                <>
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <Sparkles className="w-3.5 h-3.5 text-[#86868B]" />
                                                        <span className="text-[11px] font-medium text-[#86868B]">{rf.label}</span>
                                                    </div>
                                                    <textarea value={params[expert.expert_id]?.[rf.field_id] || ''}
                                                        onChange={e => setParam(expert.expert_id, rf.field_id, e.target.value)}
                                                        placeholder={rf.placeholder || '补充指令（可选）...'}
                                                        rows={4} disabled={isRunning}
                                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#FAFAFA] text-[13px] text-[#1D1D1F] placeholder:text-[#C7C7CC] resize-none outline-none focus:border-[#007AFF]/30 focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/8 transition-all duration-200" />
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="px-5 pb-4">
                                        <button onClick={() => {
                                            const next = !st.assetOpen
                                            updateCard(expert.expert_id, { assetOpen: next })
                                            if (next && !records[expert.expert_id]) loadAssets(expert.expert_id)
                                        }}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/85 backdrop-blur-xl border border-slate-100 text-[12px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all duration-200 mb-3">
                                            <Database className="w-3.5 h-3.5 text-[#86868B]" />
                                            📦 {expert.asset_center_schema.tab_title}
                                            {st.assetOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                                        </button>

                                        <AnimatePresence>
                                            {st.assetOpen && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                    <div className="rounded-xl border border-slate-100 bg-white/85 backdrop-blur-xl overflow-hidden">
                                                        <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAFAFA] border-b border-slate-100">
                                                            <span className="text-[11px] text-[#86868B] font-medium">资产数据表</span>
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => setShowAddColumn(prev => ({ ...prev, [expert.expert_id]: !prev[expert.expert_id] }))}
                                                                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/5 transition-colors">
                                                                    <Columns3 className="w-3 h-3" /> 管理列
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <AnimatePresence>
                                                            {showAddColumn[expert.expert_id] && (
                                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                                    <div className="px-4 py-3 bg-[#F5F5F7]/60 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                                                                        <input value={newCol[expert.expert_id]?.column_id || ''} onChange={e => setNewCol(prev => ({ ...prev, [expert.expert_id]: { ...prev[expert.expert_id] || { column_id: '', title: '', type: 'Input' }, column_id: e.target.value } }))}
                                                                            placeholder="列ID (英文)" className="h-[30px] px-2.5 rounded-lg border border-slate-200 bg-white text-[11px] outline-none focus:border-[#007AFF]/30 w-[120px]" />
                                                                        <input value={newCol[expert.expert_id]?.title || ''} onChange={e => setNewCol(prev => ({ ...prev, [expert.expert_id]: { ...prev[expert.expert_id] || { column_id: '', title: '', type: 'Input' }, title: e.target.value } }))}
                                                                            placeholder="列标题" className="h-[30px] px-2.5 rounded-lg border border-slate-200 bg-white text-[11px] outline-none focus:border-[#007AFF]/30 w-[120px]" />
                                                                        <select value={newCol[expert.expert_id]?.type || 'Input'} onChange={e => setNewCol(prev => ({ ...prev, [expert.expert_id]: { ...prev[expert.expert_id] || { column_id: '', title: '', type: 'Input' }, type: e.target.value } }))}
                                                                            className="h-[30px] px-2.5 rounded-lg border border-slate-200 bg-white text-[11px] outline-none">
                                                                            <option value="Input">Input</option>
                                                                            <option value="Textarea">Textarea</option>
                                                                            <option value="Number">Number</option>
                                                                        </select>
                                                                        <button onClick={() => handleAddColumn(expert.expert_id)}
                                                                            className="h-[30px] px-3 rounded-lg bg-[#007AFF] text-white text-[11px] font-medium hover:bg-[#0066DD] transition-colors">添加</button>
                                                                        <button onClick={() => setShowAddColumn(prev => ({ ...prev, [expert.expert_id]: false }))}
                                                                            className="h-[30px] px-2 rounded-lg text-[#86868B] hover:text-[#1D1D1F] transition-colors"><X className="w-3.5 h-3.5" /></button>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>

                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-[12px]">
                                                                <thead>
                                                                    <tr className="border-b border-slate-100">
                                                                        {cols.map(c => (
                                                                            <th key={c.column_id} className="px-3 py-2 text-left text-[11px] font-medium text-[#86868B] whitespace-nowrap">
                                                                                <div className="flex items-center gap-1">
                                                                                    {c.title}
                                                                                    {c.editable && (
                                                                                        <button onClick={() => handleDeleteColumn(expert.expert_id, c.column_id)}
                                                                                            className="opacity-0 group-hover:opacity-100 hover:text-[#FF3B30] transition-opacity text-[#C7C7CC]">
                                                                                            <Trash2 className="w-2.5 h-2.5" />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </th>
                                                                        ))}
                                                                        <th className="px-3 py-2 text-right text-[11px] font-medium text-[#86868B] w-[80px]">操作</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {recs.map(r => {
                                                                        const isEditing = editingRecord[expert.expert_id] === r.id
                                                                        return (
                                                                            <tr key={r.id} className="border-b border-slate-50 hover:bg-[#FAFAFA] group">
                                                                                {cols.map(c => (
                                                                                    <td key={c.column_id} className="px-3 py-2 text-[#1D1D1F]">
                                                                                        {isEditing ? (
                                                                                            c.type === 'Textarea' ? (
                                                                                                <textarea value={editBuffer[expert.expert_id]?.[r.id]?.[c.column_id] ?? String(r[c.column_id] ?? '')}
                                                                                                    onChange={e => setEditBuffer(prev => ({
                                                                                                        ...prev,
                                                                                                        [expert.expert_id]: { ...prev[expert.expert_id], [r.id]: { ...prev[expert.expert_id]?.[r.id], [c.column_id]: e.target.value } }
                                                                                                    }))}
                                                                                                    rows={2} className="w-full px-2 py-1 rounded-lg border border-[#007AFF]/30 text-[11px] outline-none resize-none" />
                                                                                            ) : (
                                                                                                <input value={editBuffer[expert.expert_id]?.[r.id]?.[c.column_id] ?? String(r[c.column_id] ?? '')}
                                                                                                    onChange={e => setEditBuffer(prev => ({
                                                                                                        ...prev,
                                                                                                        [expert.expert_id]: { ...prev[expert.expert_id], [r.id]: { ...prev[expert.expert_id]?.[r.id], [c.column_id]: e.target.value } }
                                                                                                    }))}
                                                                                                    type={c.type === 'Number' ? 'number' : 'text'}
                                                                                                    className="w-full px-2 py-1 rounded-lg border border-[#007AFF]/30 text-[11px] outline-none" />
                                                                                            )
                                                                                        ) : (
                                                                                            <span className="line-clamp-2">{String(r[c.column_id] ?? '')}</span>
                                                                                        )}
                                                                                    </td>
                                                                                ))}
                                                                                <td className="px-3 py-2 text-right">
                                                                                    <div className="flex items-center justify-end gap-1">
                                                                                        {isEditing ? (
                                                                                            <>
                                                                                                <button onClick={() => handleUpdateRecord(expert.expert_id, r.id)}
                                                                                                    className="p-1 rounded-md text-[#34C759] hover:bg-[#34C759]/10 transition-colors"><Check className="w-3 h-3" /></button>
                                                                                                <button onClick={() => setEditingRecord(prev => ({ ...prev, [expert.expert_id]: null }))}
                                                                                                    className="p-1 rounded-md text-[#86868B] hover:bg-slate-100 transition-colors"><X className="w-3 h-3" /></button>
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <button onClick={() => {
                                                                                                    setEditingRecord(prev => ({ ...prev, [expert.expert_id]: r.id }))
                                                                                                    const buf: Record<string, string> = {}
                                                                                                    for (const c of cols) buf[c.column_id] = String(r[c.column_id] ?? '')
                                                                                                    setEditBuffer(prev => ({ ...prev, [expert.expert_id]: { ...prev[expert.expert_id], [r.id]: buf } }))
                                                                                                }}
                                                                                                    className="p-1 rounded-md text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/5 transition-colors opacity-0 group-hover:opacity-100"><Pencil className="w-3 h-3" /></button>
                                                                                                <button onClick={() => handleDeleteRecord(expert.expert_id, r.id)}
                                                                                                    className="p-1 rounded-md text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/5 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        <div className="px-4 py-3 border-t border-slate-100">
                                                            {showAddRecord[expert.expert_id] ? (
                                                                <div className="space-y-2">
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        {cols.map(c => (
                                                                            <div key={c.column_id}>
                                                                                <span className="text-[10px] text-[#86868B]">{c.title}</span>
                                                                                {c.type === 'Textarea' ? (
                                                                                    <textarea value={newRecord[expert.expert_id]?.[c.column_id] || ''}
                                                                                        onChange={e => setNewRecord(prev => ({ ...prev, [expert.expert_id]: { ...prev[expert.expert_id] || {}, [c.column_id]: e.target.value } }))}
                                                                                        rows={2} placeholder={c.title} className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 text-[11px] outline-none focus:border-[#007AFF]/30 resize-none" />
                                                                                ) : (
                                                                                    <input value={newRecord[expert.expert_id]?.[c.column_id] || ''}
                                                                                        onChange={e => setNewRecord(prev => ({ ...prev, [expert.expert_id]: { ...prev[expert.expert_id] || {}, [c.column_id]: e.target.value } }))}
                                                                                        type={c.type === 'Number' ? 'number' : 'text'}
                                                                                        placeholder={c.title} className="w-full mt-0.5 h-[30px] px-2 rounded-lg border border-slate-200 text-[11px] outline-none focus:border-[#007AFF]/30" />
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button onClick={() => handleCreateRecord(expert.expert_id)}
                                                                            className="h-[30px] px-3 rounded-lg bg-[#007AFF] text-white text-[11px] font-medium hover:bg-[#0066DD] transition-colors">确认添加</button>
                                                                        <button onClick={() => { setShowAddRecord(prev => ({ ...prev, [expert.expert_id]: false })); setNewRecord(prev => ({ ...prev, [expert.expert_id]: {} })) }}
                                                                            className="h-[30px] px-3 rounded-lg text-[#86868B] text-[11px] hover:text-[#1D1D1F] transition-colors">取消</button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => setShowAddRecord(prev => ({ ...prev, [expert.expert_id]: true }))}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-[#007AFF] hover:bg-[#007AFF]/5 transition-colors">
                                                                    <Plus className="w-3 h-3" /> 添加记录
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="px-5 pb-5 flex items-center gap-2">
                                        <button onClick={() => runExpert(expert)} disabled={isRunning}
                                            className={`flex-1 flex items-center justify-center gap-1.5 h-[38px] rounded-xl text-[13px] font-medium transition-all duration-200 ${isRunning ? 'bg-[#007AFF]/10 text-[#007AFF] cursor-not-allowed' : 'bg-[#1D1D1F] text-white hover:bg-[#333338] active:scale-[0.97]'}`}>
                                            {isRunning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 执行中</> : <><Play className="w-3.5 h-3.5" /> 局部生成</>}
                                        </button>
                                        {hasResult && (
                                            <button onClick={() => updateCard(expert.expert_id, { isExpanded: !st.isExpanded })}
                                                className="flex items-center justify-center gap-1.5 h-[38px] px-4 rounded-xl bg-white border border-slate-100 text-[12px] text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all duration-200">
                                                {st.isExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> 收起</> : <><ChevronDown className="w-3.5 h-3.5" /> 预览</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence>
                                {st.isExpanded && hasResult && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                        <div className="px-5 pb-5 pt-0">
                                            <div className="rounded-xl bg-white border border-slate-100 overflow-hidden">
                                                <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAFAFA] border-b border-slate-100">
                                                    <span className="text-[11px] text-[#86868B] font-medium">{expert.expert_name} — 最新输出预览</span>
                                                    <CopyBtn text={st.resultMarkdown} />
                                                </div>
                                                <div className="p-4 max-h-[260px] overflow-y-auto">
                                                    <pre className="whitespace-pre-wrap text-[13px] text-[#1D1D1F] leading-[1.8] font-[inherit]">{st.resultMarkdown}</pre>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
