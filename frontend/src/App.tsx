import { HashRouter as Router, Routes, Route } from "react-router-dom"
import Workbench from "@/pages/Workbench"
import { PipelineProvider } from "@/hooks/useProjectPipeline"
import ErrorBoundary from "@/components/ErrorBoundary"

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <PipelineProvider>
          <Routes>
            <Route path="/" element={<Workbench />} />
            <Route path="/account-profile" element={<Workbench />} />
            <Route path="/category-positioning" element={<Workbench />} />
            <Route path="/topic-selection" element={<Workbench />} />
            <Route path="/script-creation" element={<Workbench />} />
            <Route path="/title-generation" element={<Workbench />} />
            <Route path="/video-production" element={<Workbench />} />
            <Route path="/video-deconstruct" element={<Workbench />} />
            <Route path="/viral-follow-up" element={<Workbench />} />
            <Route path="/private-domain" element={<Workbench />} />
            <Route path="/market-analysis" element={<Workbench />} />
            <Route path="/boss-helper" element={<Workbench />} />
            <Route path="/resource-management" element={<Workbench />} />
            <Route path="/channel-task" element={<Workbench />} />
          </Routes>
        </PipelineProvider>
      </Router>
    </ErrorBoundary>
  )
}
