import json
from typing import Any

DYNAMIC_EXPERT_CHAIN_CONFIG: dict[str, dict[str, Any]] = {
    "private_management": {
        "expert_id": "private_management",
        "expert_name": "私域管理",
        "emoji": "🧱",
        "color": "#007AFF",
        "business_sop": "负责私域底座设计、用户分层标签规则定义与多账号资产分配，是流量沉淀的中央指挥官。",
        "form_schema": {
            "fields": [
                {"field_id": "carrier_type", "label": "承接载体", "type": "Select", "options": ["企业微信", "个人微信", "企微群/粉丝群"], "required": True},
                {"field_id": "welcome_trigger", "label": "欢迎语触发时机", "type": "Radio", "options": ["立刻触发", "延迟30秒", "延迟1分钟"], "required": False},
                {"field_id": "content_ratio_phase", "label": "运营阶段（内容比例参考）", "type": "Radio", "options": ["前期-弱营销(人设7:产品3)", "中期-过渡(人设6:产品4)", "后期-成熟(人设5:产品5)"], "required": False},
                {"field_id": "management_remark", "label": "全局流向及运营批注", "type": "Textarea", "placeholder": "请输入流向批注或特殊规则...", "required": False}
            ]
        },
        "asset_center_schema": {
            "tab_title": "用户分层与运营载体资产库",
            "table_columns": [
                {"column_id": "tag_name", "title": "标签名称", "type": "Input", "required": True, "editable": True},
                {"column_id": "trigger_condition", "title": "触发条件/动作", "type": "Input", "required": False, "editable": True},
                {"column_id": "assigned_staff", "title": "分配承接客服(微信号)", "type": "Input", "required": True, "editable": True},
                {"column_id": "follow_up_strategy", "title": "跟进策略备注", "type": "Textarea", "required": False, "editable": True}
            ],
            "data_records": [
                {"id": "rec_01", "tag_name": "A类-强意向客户", "trigger_condition": "主动询价/连续互动", "assigned_staff": "sales_vip01", "follow_up_strategy": "优先电话跟进，24小时内响应，提供1对1定制方案"},
                {"id": "rec_02", "tag_name": "B类-待唤醒粉丝", "trigger_condition": "仅领福利/长期不发言", "assigned_staff": "bot_assistant", "follow_up_strategy": "自动推送福利内容，每周一次轻度触达"},
                {"id": "rec_03", "tag_name": "C类-新进潜客", "trigger_condition": "刚添加好友/未互动", "assigned_staff": "welcome_bot", "follow_up_strategy": "触发欢迎语+新人礼包，引导进入粉丝群"},
                {"id": "rec_04", "tag_name": "D类-高复购老客", "trigger_condition": "历史购买2次以上", "assigned_staff": "vip_service", "follow_up_strategy": "进入高客群，推送专属活动，优先体验新品"},
            ]
        },
        "system_prompt": (
            "你是一个顶级私域池架构师。\n\n"
            "请深度参考以下运营知识库，并结合用户提交的表单动态变量 {form_data}、资产库数据记录 {asset_records}，输出一套结构化的私域底座架构与分层方案。\n\n"
            "【核心运营原则】\n"
            "1. 私域运营的本质是经营信任，打造人设能拉近客户距离\n"
            "2. 客户已对传统卖货郎脱敏，朋友圈内容需围绕「用户想看到的内容」设计\n"
            "3. 朋友圈内容三大维度：用户相关（干货知识/互动内容）、人设相关（生活日常/工作状态）、产品相关（产品服务/用户口碑/荣誉权威/限时活动）\n"
            "4. 内容比例建议：前期人设7:产品3 → 中期人设6:产品4 → 后期人设5:产品5\n"
            "5. 好友超过3000人建议每天7~10条朋友圈，系统随机降低触达率；定期清理僵尸粉，留存优质客户\n"
            "6. 发圈黄金时段：早高峰7:30-10:00、午休12:00-14:00、摸鱼15:30-17:00、晚高峰18:00-19:30、临睡前22:00-23:00\n\n"
            "请输出一份完整的私域底座搭建方案，包括：分层逻辑、各层定义、欢迎语设计、进群规则、日常运营SOP。\n"
            "输出格式为结构化Markdown。\n"
        ),
    },
    "private_attraction": {
        "expert_id": "private_attraction",
        "expert_name": "私域拉新专员",
        "emoji": "🧲",
        "color": "#FF9500",
        "business_sop": "负责设计从公域（抖音/小红书等）向私域导流的利益诱饵与裂变路径，通过企业资产库中的福利包实现高效抓取。",
        "form_schema": {
            "fields": [
                {"field_id": "public_platform", "label": "公域来源平台", "type": "Select", "options": ["抖音", "小红书", "快手", "微信视频号", "B站", "多平台混合"], "required": True},
                {"field_id": "hook_type", "label": "核心钩子类型", "type": "Select", "options": ["行业白皮书/PDF资料包", "工具源码包/模板套件", "免费诊断权益/评测服务", "优惠券/限时折扣码", "进入专属社群资格"], "required": True},
                {"field_id": "fission_level", "label": "裂变机制", "type": "Radio", "options": ["单人加微即送", "邀请2人助力解锁", "朋友圈集赞N个", "分享朋友圈截图", "无门槛-直接领取"], "required": True},
                {"field_id": "attraction_remark", "label": "拉新活动策略批注", "type": "Textarea", "placeholder": "请输入活动主题、目标人群、预期效果...", "required": False}
            ]
        },
        "asset_center_schema": {
            "tab_title": "公域引流钩子与福利资产库",
            "table_columns": [
                {"column_id": "hook_name", "title": "福利/资料名称", "type": "Input", "required": True, "editable": True},
                {"column_id": "hook_category", "title": "钩子分类", "type": "Select", "options": ["PDF资料包", "工具/模板", "诊断服务", "优惠券/折扣", "社群门票"], "editable": True},
                {"column_id": "file_url", "title": "资产下载链接/存储路径", "type": "Input", "required": True, "editable": True},
                {"column_id": "estimated_value", "title": "包装对外价值(元)", "type": "Number", "required": False, "editable": True},
                {"column_id": "suitable_platform", "title": "适配平台", "type": "Input", "required": False, "editable": True}
            ],
            "data_records": [
                {"id": "rec_01", "hook_name": "2026全网短视频搞钱全景图.pdf", "hook_category": "PDF资料包", "file_url": "https://oss.com/files/map2026.pdf", "estimated_value": 199, "suitable_platform": "抖音/小红书"},
                {"id": "rec_02", "hook_name": "全套私域自动化触发表单工具", "hook_category": "工具/模板", "file_url": "https://oss.com/files/form_tools.zip", "estimated_value": 599, "suitable_platform": "全平台"},
                {"id": "rec_03", "hook_name": "AI短视频脚本生成器（内测版）", "hook_category": "工具/模板", "file_url": "https://oss.com/files/ai_script.zip", "estimated_value": 399, "suitable_platform": "抖音/视频号"},
                {"id": "rec_04", "hook_name": "1对1账号诊断名额（限前50名）", "hook_category": "诊断服务", "file_url": "仅限私信登记", "estimated_value": 999, "suitable_platform": "小红书"},
                {"id": "rec_05", "hook_name": "私域操盘手实战手册.pdf", "hook_category": "PDF资料包", "file_url": "https://oss.com/files/private_domain_guide.pdf", "estimated_value": 299, "suitable_platform": "抖音/小红书"},
            ]
        },
        "system_prompt": (
            "你是一个爆款私域拉新专家，深度研究过50+抖音+私域联动成功案例。\n\n"
            "请调用资产库数据 {asset_records} 中对应的钩子链接与价值参数，结合用户的表单输入 {form_data}，输出一套完整的无缝导流裂变路径方案。\n\n"
            "【抖+私域联动核心策略（案例精华）】\n"
            "1. 抖音评论区截流：主动回复热门视频评论，用「资料免费送」等钩子引导私信，私信中植入微信引流话术（注意使用防封变体词如「绿泡泡」「🐸」）\n"
            "2. 主页简介引流：在简介中使用符号变体，如「👀点我主页置顶笔记」或「📩戳后台」代替「私信我」\n"
            "3. 粉丝群置顶引流：在粉丝群公告中发布微信二维码或群二维码，使用谐音替代敏感词\n"
            "4. 小红书私信钩子：发布「资料包」「工具清单」「免费诊断」类笔记，主动私信评论区潜在用户\n"
            "5. 防刷机制：设置领取门槛（如关注+点赞+收藏）、限每人领取一次、截图审核确认\n\n"
            "请输出一份包含以下内容的导流方案：\n"
            "- 公域平台选择与内容策略\n"
            "- 引流钩子组合设计（建议2-3个钩子叠加使用）\n"
            "- 私信话术脚本（破冰+钩子植入+引导添加）\n"
            "- 防刷机制设计\n"
            "- 转化路径关键节点\n\n"
            "输出格式为结构化Markdown。\n"
        ),
    },
    "wechat_private_chat": {
        "expert_id": "wechat_private_chat",
        "expert_name": "微信私信专家",
        "emoji": "💬",
        "color": "#5856D6",
        "business_sop": "负责高转化率的1对1对话流设计、新粉破冰以及高频客户异议（Q&A资产库）的精准化解。参考「朋友圈搭建.pdf」三大维度理论设计话术。",
        "form_schema": {
            "fields": [
                {"field_id": "chat_stage", "label": "当前对话阶段", "type": "Select", "options": ["新粉自动破冰", "核心产品询价", "异议化解/催单", "老客复购激活"], "required": True},
                {"field_id": "chat_tone", "label": "人设语气风格", "type": "Select", "options": ["专业导师型（干货为主）", "暖心闺蜜型（共情为主）", "官方客服型（高效为主）", "实战老炮型（犀利直接）"], "required": True},
                {"field_id": "response_speed", "label": "回复速度要求", "type": "Radio", "options": ["即时自动回复", "30分钟内人工", "2小时内人工"], "required": False},
                {"field_id": "chat_remark", "label": "客户特殊异议批注", "type": "Textarea", "placeholder": "请输入客户目前的顾虑或特殊场景...", "required": False}
            ]
        },
        "asset_center_schema": {
            "tab_title": "黄金 Q&A 标准异议资产库",
            "table_columns": [
                {"column_id": "customer_question", "title": "客户常见核心痛点/提问", "type": "Input", "required": True, "editable": True},
                {"column_id": "standard_answer", "title": "企业标准话术答案(供AI学习)", "type": "Textarea", "required": True, "editable": True},
                {"column_id": "answer_type", "title": "话术类型", "type": "Select", "options": ["价格异议", "信任顾虑", "产品疑问", "服务咨询", "竞品对比"], "editable": True},
                {"column_id": "use_frequency", "title": "使用频率", "type": "Input", "required": False, "editable": True}
            ],
            "data_records": [
                {"id": "rec_01", "customer_question": "太贵了，能不能便宜点？", "standard_answer": "咱们的方案包含了全套底层资产库，不仅仅是个模板。另外现在定能申请加赠内测工具，终身免费升级！", "answer_type": "价格异议", "use_frequency": "高频"},
                {"id": "rec_02", "customer_question": "可以退款吗？支持几天无理由？", "standard_answer": "购买后7天内未下载核心数字化资产支持全额无忧退款，7天后系统不支持退款但可以换等价产品。", "answer_type": "信任顾虑", "use_frequency": "高频"},
                {"id": "rec_03", "customer_question": "我没基础，能学会吗？", "standard_answer": "我们的陪跑服务就是为0基础学员设计的，每天都有答疑，7天内不满意全额退款保障！", "answer_type": "产品疑问", "use_frequency": "中频"},
                {"id": "rec_04", "customer_question": "和市面上其他课程有什么区别？", "standard_answer": "我们是工具+方法论+陪跑三位一体，不只是卖课。具体区别可以看一下我发您的对比表。", "answer_type": "竞品对比", "use_frequency": "中频"},
                {"id": "rec_05", "customer_question": "学完之后真的能变现吗？", "standard_answer": "我们已经有XX名学员拿到结果了，我把他们的案例整理了一份，可以看一下👇", "answer_type": "信任顾虑", "use_frequency": "高频"},
                {"id": "rec_06", "customer_question": "我没时间学怎么办？", "standard_answer": "课程是终身制的，随时可以看。而且我们有专属学员群，每天干货分享，利用碎片时间也能学习。", "answer_type": "产品疑问", "use_frequency": "低频"},
            ]
        },
        "system_prompt": (
            "你是一个金牌私信销冠。请根据用户的配置参数 {form_data}，精准检索并学习标准异议资产库 {asset_records} 中的标准问答，针对当前痛点输出可直接复制使用的高转化私信话术脚本。\n\n"
            "【私信话术核心原则（参考行业最佳实践）】\n"
            "1. 破冰阶段：先建立关系再谈产品，用「感谢关注+自我介绍+提供价值」三段式\n"
            "2. 信任建立：用具体的案例数字（如「已帮助XX人」「累计学员XX名」）而非空洞形容词\n"
            "3. 异议处理：先认同客户感受，再提供解决方案，永远不与客户争辩\n"
            "4. 催单技巧：制造紧迫感（「名额仅剩X个」「优惠今晚截止」）而非施压\n"
            "5. 话术风格需与表单选择的人设类型一致：专业导师型侧重逻辑和数据，暖心闺蜜型侧重共情和故事\n\n"
            "请输出一份包含以下内容的完整私信话术：\n"
            "- 破冰话术（回复新粉关注）\n"
            "- 针对表单所选阶段的专属话术\n"
            "- 3-5个最相关异议的化解话术（优先匹配资产库中高频记录）\n"
            "- 催单/收尾话术\n"
            "- 每条话术注明使用场景和注意事项\n\n"
            "输出格式为可直接复制使用的话术卡片，Markdown格式。\n"
        ),
    },
    "moments_planner": {
        "expert_id": "moments_planner",
        "expert_name": "朋友圈策划师",
        "emoji": "📱",
        "color": "#34C759",
        "business_sop": "根据黄金内容比例（人设7:产品3）规划朋友圈剧场流，负责撰写极具信任感和转化力的文案，并调度见证资产。深度遵循「朋友圈搭建.pdf」中的三大维度内容体系。",
        "form_schema": {
            "fields": [
                {"field_id": "moments_theme", "label": "今日发布主题", "type": "Select", "options": ["人设日常-工作状态", "人设日常-生活碎片", "用户干货-方法教程", "用户互动-话题调研", "产品服务-权威展示", "产品口碑-买家秀/好评", "限时活动-促销催单"], "required": True},
                {"field_id": "moments_dimension", "label": "内容维度归属", "type": "Radio", "options": ["用户相关（干货/互动）", "人设相关（日常/态度）", "产品相关（服务/口碑/权威）"], "required": True},
                {"field_id": "moments_layout", "label": "排版及格式", "type": "Select", "options": ["短文案+九宫格图(6-9张)", "长文案+单图/视频", "纯文字评论区引导", "九宫格故事连发"], "required": False},
                {"field_id": "moments_remark", "label": "朋友圈事件素材批注", "type": "Textarea", "placeholder": "请描述今日素材事件、具体产品或案例亮点...", "required": False}
            ]
        },
        "asset_center_schema": {
            "tab_title": "客户见证与案例背书素材库",
            "table_columns": [
                {"column_id": "case_title", "title": "案例简述", "type": "Input", "required": True, "editable": True},
                {"column_id": "case_result", "title": "核心成果/数据", "type": "Input", "required": True, "editable": True},
                {"column_id": "feedback_text", "title": "客户真实反馈原文", "type": "Textarea", "required": True, "editable": True},
                {"column_id": "image_assets", "title": "对应配图URL", "type": "Input", "required": False, "editable": True},
                {"column_id": "case_tag", "title": "案例标签", "type": "Input", "required": False, "editable": True}
            ],
            "data_records": [
                {"id": "rec_01", "case_title": "传统企业转型成功", "case_result": "私域进群800人，首周转化率15%", "feedback_text": "上线第一周，私域直接进群800人，转化率突破了15%！以前觉得线上转型很难，没想到方法对了这么顺。", "image_assets": "https://oss.com/img/case1.png", "case_tag": "#企业转型 #私域首战"},
                {"id": "rec_02", "case_title": "自媒体小白拿到结果", "case_result": "单条视频涨粉200+", "feedback_text": "老师教的钩子太好用了，一天涨了200粉全导进微信了！感觉打开了新世界的大门。", "image_assets": "https://oss.com/img/case2.png", "case_tag": "#新手入门 #涨粉干货"},
                {"id": "rec_03", "case_title": "高客单产品成交", "case_result": "6980元课程，私聊转化", "feedback_text": "说实话一开始嫌贵，但老师给我做了1对1诊断后发现真的很专业。现在回头看这6980花得太值了。", "image_assets": "https://oss.com/img/case3.png", "case_tag": "#高客单 #信任建立"},
                {"id": "rec_04", "case_title": "学员复购案例", "case_result": "3个月内复购3次", "feedback_text": "买了课程后又续费了陪跑服务，现在每周都泡在学员群里，老师有问必答，这种学习氛围太喜欢了。", "image_assets": "", "case_tag": "#复购 #学员口碑"},
            ]
        },
        "system_prompt": (
            "你是一个朋友圈剧场流操盘手，精通「朋友圈搭建.pdf」中的全部内容方法论。\n\n"
            "请读取案例素材库 {asset_records} 中的真实反馈作为背书信任支撑，结合用户的今日发布配置 {form_data}，输出一套高赞、高度口语化的朋友圈精修文案。\n\n"
            "【朋友圈内容三大维度体系】\n"
            "① 用户相关：干货知识（行业科普/方法教程）、互动内容（问答/调研/话题/选择/点赞）\n"
            "② 人设相关：工作状态（加班/学习/出差）、日常生活（美食/旅游/运动/趣事）、休闲娱乐（电影/音乐/书籍）、生活态度（价值观/金句）\n"
            "③ 产品相关：产品服务、用户口碑（好评截图/付款截图）、荣誉权威（资质/数据/排名）、限时活动（促销/截止提醒）\n\n"
            "【高级朋友圈公式】\n"
            "高级朋友圈 = 朴素文案（朴实叙事+跟我有关+情绪共鸣）+ 高质量图片（相关性+高质感+氛围感）+ 设计有度的排版\n"
            "朴素文案 = 朴实叙事（讲真实故事）+ 跟我有关（让用户觉得和自己有关系）+ 情绪共鸣（触动情感）\n\n"
            "【朋友圈四件套（人设基础）】\n"
            "1. 微信名：品牌相关性 + 通俗易通 + 便于搜索（如：XX聊私域｜持续创业者）\n"
            "2. 个性签名：技能+个人成就+帮他人实现什么+产品服务\n"
            "3. 朋友圈背景：秀肌肉+硬实力+专业形象照+个人成就\n"
            "4. 朋友圈内容：围绕三大维度，持续输出，比例遵循人设7:产品3\n\n"
            "请输出：\n"
            "1. 今日朋友圈文案（1条主帖，含正文+配图建议）\n"
            "2. 可搭配发送的次条内容（可选）\n"
            "3. 文案排版建议（表情符号使用、段落结构）\n"
            "4. 发送时间建议（参考黄金时段：7:30-10:00、12:00-14:00、18:00-19:30）\n\n"
            "输出格式为可直接复制的朋友圈文案卡片，Markdown格式。\n"
        ),
    },
    "private_funnel": {
        "expert_id": "private_funnel",
        "expert_name": "私域引流策划师",
        "emoji": "🛡️",
        "color": "#AF52DE",
        "business_sop": "负责打通短视频评论区截流、主页简介、粉丝群置顶等公域到私域的合规安全路径规划。提供抖+私域50个案例中验证过的引流方法论。",
        "form_schema": {
            "fields": [
                {"field_id": "funnel_scene", "label": "公域引流场景", "type": "Select", "options": ["抖音评论区截流", "抖音主页简介/背景墙", "抖音粉丝群公告置顶", "小红书私信主动触达", "小红书评论区截流", "快手评论区截流", "多平台组合策略"], "required": True},
                {"field_id": "safety_level", "label": "风控规避级别", "type": "Radio", "options": ["标准安全替换（谐音/符号）", "高级符号变体（emoji替代）", "纯文字引导（不提微信）"], "required": True},
                {"field_id": "funnel_content_type", "label": "引流钩子形式", "type": "Select", "options": ["资料包领取（PDF/清单）", "工具免费用", "1对1诊断名额", "进入粉丝群", "优惠码领取", "课程试听入口"], "required": False},
                {"field_id": "funnel_remark", "label": "截流引导暗号批注", "type": "Textarea", "placeholder": "请输入引流口令或具体话术需求...", "required": False}
            ]
        },
        "asset_center_schema": {
            "tab_title": "公域防封安全变体词典",
            "table_columns": [
                {"column_id": "sensitive_word", "title": "平台违规敏感词", "type": "Input", "required": True, "editable": True},
                {"column_id": "safe_replace", "title": "安全替换词/符号", "type": "Input", "required": True, "editable": True},
                {"column_id": "applicable_scene", "title": "适用场景", "type": "Select", "options": ["评论区", "主页简介", "私信话术", "群公告", "笔记正文"], "editable": True},
                {"column_id": "platform", "title": "适用平台", "type": "Input", "required": False, "editable": True}
            ],
            "data_records": [
                {"id": "rec_01", "sensitive_word": "微信", "safe_replace": "🐸 / 绿泡泡 / 棕瓶子 / 👀绿色图标", "applicable_scene": "评论区/简介/私信", "platform": "抖音/小红书/快手"},
                {"id": "rec_02", "sensitive_word": "私信我", "safe_replace": "📩 戳戳我 / 滴滴我 / 戳后台 / 厚台踢我", "applicable_scene": "评论区", "platform": "抖音/小红书"},
                {"id": "rec_03", "sensitive_word": "加我微信", "safe_replace": "连係我 / 🉑️思窝 / 👀我煮页", "applicable_scene": "评论区/私信", "platform": "抖音"},
                {"id": "rec_04", "sensitive_word": "进群", "safe_replace": "抱团 / 上车 / 一起搞 / 进👗", "applicable_scene": "评论区/私信", "platform": "全平台"},
                {"id": "rec_05", "sensitive_word": "免费领取", "safe_replace": "🐔住免沸 / 抱走 / 丝芯", "applicable_scene": "评论区", "platform": "抖音"},
                {"id": "rec_06", "sensitive_word": "扫码", "safe_replace": "👀煮页顶顶 / 背景图 / 置顶笔记", "applicable_scene": "评论区", "platform": "小红书"},
                {"id": "rec_07", "sensitive_word": "链接", "safe_replace": "🔗 在主页 / 置顶 / 背景图", "applicable_scene": "评论区", "platform": "抖音/快手"},
                {"id": "rec_08", "sensitive_word": "优惠", "safe_replace": "you惠 / 浮力 / 内部介", "applicable_scene": "私信话术", "platform": "全平台"},
            ]
        },
        "system_prompt": (
            "你是一个全域流量安全引流专家，研究过50+抖音+私域联动成功引流案例。\n\n"
            "请分析用户的输入批注 {form_data}，若其中包含防封变体词典 {asset_records} 中的敏感词，必须将其全部硬性替换为对应安全词，并输出安全的公域截流话术方案。\n\n"
            "【公域引流核心场景与话术模板】\n"
            "① 抖音评论区截流\n"
            "- 主动回复热门视频的热门评论，用「资料免费领」类钩子吸引私信\n"
            "- 私信话术：感谢关注宝子～资料包戳我主页置顶笔记👀 或者 直接丝我发你\n"
            "- 主页简介设置：背景图放二维码 or 文字引导「🔗点我主页」\n\n"
            "② 抖音主页简介引流\n"
            "- 简介最多100字，结构：身份背书 + 核心价值 + 引流指令\n"
            "- 示例：「8年私域操盘手｜已帮助3000+企业搭建私域体系｜资料包👀煮页｜链接在👗公告」\n"
            "- 使用符号变体替代敏感词：微信→🐸，私信→📩，进群→进👗\n\n"
            "③ 小红书私信主动触达\n"
            "- 主动私信评论过、点赞过笔记的潜在用户\n"
            "- 话术模板：「嗨～看到你关注了这个话题，我整理了一份相关资料包，需要的话可以发给你哦 📩」\n"
            "- 对方回复后植入引流话术，引导添加微信（使用变体词）\n\n"
            "④ 粉丝群公告置顶引流\n"
            "- 群公告限制200字内，结构：欢迎语 + 价值说明 + 微信添加引导\n"
            "- 示例：「🎉欢迎进群！群里每天分享私域干货｜想领取《2026短视频变现手册》👉戳我主页简介🐸」\n\n"
            "【防封核心原则】\n"
            "1. 永远不在正文/评论/简介中直接出现「微信」「加我」等敏感词\n"
            "2. 用emoji或谐音替代，如🐸=微信，📩=私信\n"
            "3. 引导动作使用「戳」「滴滴」「戳后台」等口语化表达\n"
            "4. 二维码图片放在「主页背景图」中而非正文\n\n"
            "请输出一份完整的引流方案，包含：\n"
            "- 适配所选场景的引流话术（可直接复制使用）\n"
            "- 主页简介文案（中文，100字以内）\n"
            "- 评论置顶话术（引导私信的话术）\n"
            "- 私信话术脚本（破冰+钩子+引导添加微信）\n"
            "- 防封检查清单（每条话术的敏感词替换确认）\n\n"
            "输出格式为可直接使用的文案合集，Markdown格式。\n"
        ),
    },
    "ip_positioning": {
        "expert_id": "ip_positioning",
        "expert_name": "IP定位策划师",
        "emoji": "👑",
        "color": "#FF6B6B",
        "business_sop": "提取主理人的核心故事母体（StoryBrand），规范私域常用口头禅与调性，确保全流程言行一致。深度运用「打造私域人设.pdf」中的IP四件套方法论。",
        "form_schema": {
            "fields": [
                {"field_id": "ip_persona", "label": "主理人人设面具", "type": "Select", "options": ["资深实战导师（专业干货型）", "行业毒舌老炮（犀利直接型）", "陪跑创业小白（共情陪伴型）", "暖心闺蜜（情感共鸣型）", "官方客服（高效专业型）"], "required": True},
                {"field_id": "monetization_path", "label": "变现商业路径", "type": "Select", "options": ["高客单1对1咨询", "标准线上训练营", "工具/SaaS续费", "知识星球/社群会员", "广告/品牌合作", "直播带货"], "required": True},
                {"field_id": "content_style", "label": "内容输出风格", "type": "Radio", "options": ["干货方法论为主", "日常分享为主", "案例故事为主", "幽默吐槽为主", "严肃专业为主"], "required": False},
                {"field_id": "ip_remark", "label": "人设特征强化批注", "type": "Textarea", "placeholder": "请输入专属语调、口头禅、人设背景故事...", "required": False}
            ]
        },
        "asset_center_schema": {
            "tab_title": "主理人专属语调与品牌故事资产库",
            "table_columns": [
                {"column_id": "story_milestone", "title": "IP核心故事节点/战绩", "type": "Input", "required": True, "editable": True},
                {"column_id": "story_type", "title": "故事类型", "type": "Select", "options": ["逆袭翻身", "专业积累", "踩坑教训", "用户共情", "行业洞察", "个人情怀"], "editable": True},
                {"column_id": "catchphrase", "title": "标志性口头禅/高频词", "type": "Input", "required": True, "editable": True},
                {"column_id": "apply_scene", "title": "常用场景", "type": "Input", "required": False, "editable": True}
            ],
            "data_records": [
                {"id": "rec_01", "story_milestone": "曾用单条短视频帮企业达成单日私域引流破万记录", "story_type": "逆袭翻身", "catchphrase": "安排 / 绝了 / 直接上硬干货", "apply_scene": "朋友圈/私信/直播"},
                {"id": "rec_02", "story_milestone": "3年自媒体操盘经验，深谙各大平台引流底层逻辑", "story_type": "专业积累", "catchphrase": "听懂掌声 / 避坑指南 / 底层逻辑", "apply_scene": "朋友圈干货/直播教学"},
                {"id": "rec_03", "story_milestone": "从月入3000到年入7位数，踩过所有新手坑", "story_type": "踩坑教训", "catchphrase": "过来人血泪教训 / 别再踩了 / 我踩过的坑你别踩", "apply_scene": "朋友圈共情/私信破冰"},
                {"id": "rec_04", "story_milestone": "陪跑了200+学员，0基础到月入过万", "story_type": "用户共情", "catchphrase": "别急慢慢来 / 咱们一起 / 你也可以", "apply_scene": "私信/学员群"},
                {"id": "rec_05", "story_milestone": "孵化过10个百万粉账号，单条视频最高播放破亿", "story_type": "逆袭翻身", "catchphrase": "数据不会骗人 / 实操验证 / 直接抄作业", "apply_scene": "朋友圈战绩/直播"},
            ]
        },
        "system_prompt": (
            "你是一个顶尖个人品牌定位战略家，精通「打造私域人设.pdf」中的全部方法论。\n\n"
            "请将主理人故事库与口头禅 {asset_records} 完美编织进私域表达中，严格遵从用户设定的面具参数 {form_data}，输出一套完整的IP定位规范文档。\n\n"
            "【IP人设四件套搭建方法】\n"
            "① 微信名：品牌相关性 + 通俗易通 + 便于搜索\n"
            "   公式：名字+身份标签 or 名字+垂直领域（如：小珠聊私域｜创业者导师）\n"
            "② 个性签名：技能+个人成就+帮他人实现什么+产品服务\n"
            "   公式：你是谁+做出过什么成绩+能帮别人解决什么+提供什么服务\n"
            "   示例：「帮助300+创业者用短视频引爆私域｜年操盘GMV超5000万｜整理了一份《获客变现手册》👀主页领取」\n"
            "③ 朋友圈背景：秀肌肉+硬实力\n"
            "   内容：专业形象照 + 个人成就数据 + 身份标签 + 可添加微信二维码\n"
            "④ 朋友圈内容：围绕人设特质，持续输出\n\n"
            "【人设四大核心特质】\n"
            "1. 靠谱：好评反馈/渠道权威/专业背书，用数据和案例说话\n"
            "2. 接地气/真实：生活日常/工作状态/踩坑教训，让用户感觉是可接近的「活人」\n"
            "3. 专业：根据产品突出特点，用方法论和底层逻辑建立专家形象\n"
            "4. 有温度：有趣/有爱心/勤奋等个性化特质，让用户产生情感连接\n\n"
            "【StoryBrand故事母体提取】\n"
            "从rec_01到rec_05的故事库中，提取最契合当前人设面具的故事节点，\n"
            "将其转化为朋友圈、直播、私信中可随时调用的「故事子弹」\n\n"
            "请输出一份完整的IP定位规范文档，包含：\n"
            "1. 微信昵称建议（3个备选）\n"
            "2. 个性签名文案（2个版本）\n"
            "3. 朋友圈背景图文字内容\n"
            "4. 核心故事子弹（3-5条，从故事库中提取并改写）\n"
            "5. 口头禅规范（如何在日常表达中融入高频词）\n"
            "6. 内容调性规范（发圈语气、表情使用、文风偏好）\n"
            "7. 人设一致性检查清单\n\n"
            "输出格式为完整的IP定位手册，Markdown格式。\n"
        ),
    },
}

PRIVATE_DOMAIN_FILE_CHAIN: dict[str, tuple[str, str]] = {
    "private_management":  ("3_风控合规文案.md", "10_私域底座架构方案.md"),
    "private_attraction":  ("3_风控合规文案.md", "11_私域拉新裂变方案.md"),
    "wechat_private_chat": ("3_风控合规文案.md", "12_私信话术脚本.md"),
    "moments_planner":     ("3_风控合规文案.md", "13_朋友圈动态脚本.md"),
    "private_funnel":      ("3_风控合规文案.md", "14_全域合规引流方案.md"),
    "ip_positioning":      ("3_风控合规文案.md", "15_IP私域定位方案.md"),
}


def _expert_to_frontend(ex: dict) -> dict:
    return {
        "expert_id": ex["expert_id"],
        "expert_name": ex["expert_name"],
        "emoji": ex["emoji"],
        "color": ex["color"],
        "business_sop": ex["business_sop"],
        "form_schema": ex["form_schema"],
        "asset_center_schema": {
            "tab_title": ex["asset_center_schema"]["tab_title"],
            "table_columns": ex["asset_center_schema"]["table_columns"],
        },
    }


EXPERTS_JSON: str = json.dumps(
    [_expert_to_frontend(ex) for ex in DYNAMIC_EXPERT_CHAIN_CONFIG.values()],
    ensure_ascii=False,
)


def get_expert(key: str) -> dict | None:
    return DYNAMIC_EXPERT_CHAIN_CONFIG.get(key)


def get_file_chain(key: str) -> tuple[str, str]:
    return PRIVATE_DOMAIN_FILE_CHAIN.get(key, ("3_风控合规文案.md", f"{key}_output.md"))


def all_expert_keys() -> list[str]:
    return list(DYNAMIC_EXPERT_CHAIN_CONFIG.keys())
