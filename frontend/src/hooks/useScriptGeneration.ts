import { useAppStore } from '@/store/useAppStore'
import { getWorkflowDef } from '@/types'
import { useProjectPipeline } from '@/hooks/useProjectPipeline'

const API_BASE = ''

export function useWorkflowGeneration() {
  const {
    activeWorkflow,
    inputValues,
    style,
    agents,
    isGenerating,
    setIsGenerating,
    setResult,
    showToast,
    getAbortSignal,
  } = useAppStore()

  const pipeline = useProjectPipeline()

  const generate = async () => {
    const wf = getWorkflowDef(activeWorkflow)
    if (!wf) return

    const hasInput = wf.inputs.some((inp) => (inputValues[inp.key] || '').trim())
    if (!hasInput) {
      showToast('请至少填写一个输入项', 'error')
      return
    }

    setIsGenerating(true)
    setResult(null)

    try {
      let body: Record<string, unknown>
      let apiPath = wf.apiPath

      if (activeWorkflow === 'positioning') {
        body = {
          keywords: [inputValues.brand, inputValues.goal].filter(Boolean).join(' | '),
        }
      } else if (activeWorkflow === 'video') {
        apiPath = '/api/v1/video/workflow'
        body = {
          script_text: inputValues.script || '',
          aspect_ratio: style || '9:16',
          switches: agents,
        }
      } else if (activeWorkflow === 'script') {
        apiPath = '/api/v1/workflow/create_script'
        body = {
          topic: inputValues.topic || '',
          style: style || '专业',
          agents,
        }
      } else {
        body = {
          inputs: inputValues,
          style,
          agents,
        }
      }

      const url = apiPath.startsWith('http') ? apiPath : `${API_BASE}${apiPath}`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: getAbortSignal(),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        const errMsg = errData?.detail || `请求失败: ${response.status}`
        throw new Error(errMsg)
      }

      const json = await response.json()

      if (activeWorkflow === 'video') {
        setResult({
          status: json.status,
          video_url: json.video_url,
          steps_executed: json.steps_executed || [],
          aspect_ratio: json.aspect_ratio,
          assets_summary: json.assets_summary || {},
        })
        pipeline.saveVideoAssets({
          video_url: json.video_url,
          steps_executed: json.steps_executed,
          assets_summary: json.assets_summary,
        }, false)
        showToast('视频生成完成！', 'success')
      } else if (activeWorkflow === 'script') {
        setResult(json)
        pipeline.saveScript(json.data || json, false)
        pipeline.markStepCompleted('script')
        showToast('文案生成成功！', 'success')
      } else if (json.success && json.data) {
        if (activeWorkflow === 'positioning') {
          const d = json.data
          setResult({
            sections: [
              {
                title: '企业立项分析',
                content: formatStructured(d.enterprise_project),
                structured: d.enterprise_project,
              },
              {
                title: '人设档案',
                content: formatStructured(d.persona_archivist),
                structured: d.persona_archivist,
              },
              {
                title: '产品档案',
                content: formatStructured(d.product_profiler),
                structured: d.product_profiler,
              },
            ],
            obsidian_path: d.obsidian_path || '',
            feishu_synced: d.feishu_synced || false,
          })
        } else if (activeWorkflow === 'topic') {
          setResult(json.data)
          pipeline.saveTopic(json.data, false)
          pipeline.markStepCompleted('topic')
        } else if (activeWorkflow === 'market') {
          setResult(json.data)
          pipeline.markStepCompleted('market')
        } else {
          setResult(json.data)
        }
        showToast('生成成功！', 'success')
      } else {
        throw new Error('生成结果异常')
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : '未知错误'
      showToast(message, 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  return { generate, isGenerating }
}

function formatStructured(obj: Record<string, unknown>): string {
  if (!obj) return ''
  return Object.entries(obj)
    .map(([k, v]) => {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      if (Array.isArray(v)) return `**${label}**：\n${(v as string[]).map((i) => `- ${i}`).join('\n')}`
      return `**${label}**：${v}`
    })
    .join('\n\n')
}
