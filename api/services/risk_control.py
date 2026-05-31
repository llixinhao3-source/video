BANNED_WORDS: dict[str, str] = {
    "最": "极佳",
    "第一": "领先",
    "国家级": "行业级",
    "最高级": "高级",
    "最佳": "优秀",
    "唯一": "独特",
    "首个": "早期",
    "首选": "推荐",
    "绝对": "非常",
    "一定": "建议",
    "包治百病": "有助于改善",
    "药到病除": "辅助缓解",
    "无效退款": "支持售后",
    "百分百": "大部分",
    "100%": "大部分",
    "零风险": "低风险",
    "稳赚不赔": "有较好收益预期",
    "暴利": "较好收益",
    "加微信": "关注官方账号",
    "加我微信": "关注官方账号",
    "私聊": "留言咨询",
    "转账": "官方渠道购买",
    "打款": "官方渠道支付",
    "汇款": "官方渠道支付",
    "刷单": "推广",
    "代购": "官方购买",
    "免费领取": "参与活动获取",
    "点击领取": "了解详情",
    "马上抢": "限时优惠",
    "仅限今天": "活动期间",
    "限时免费": "限时优惠",
    "立即购买": "了解详情",
    "赶紧买": "推荐入手",
    "再不买就晚了": "热销中",
    "便宜到哭": "价格实惠",
    "亏本甩卖": "优惠促销",
    "跳楼价": "超值优惠",
    "史上最低": "价格优惠",
    "全网最低": "价格实惠",
}


def check_risk(text: str) -> dict:
    risky_words: list[dict[str, str]] = []
    seen: set[str] = set()

    for word, suggestion in BANNED_WORDS.items():
        if word in text and word not in seen:
            seen.add(word)
            risky_words.append({"word": word, "suggestion": suggestion})

    return {
        "hasRisk": len(risky_words) > 0,
        "riskyWords": risky_words,
    }
