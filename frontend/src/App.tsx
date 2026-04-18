import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import Layout from '@/components/layout/Layout'
import UploadPage from '@/pages/UploadPage'
import ProgressPage from '@/pages/ProgressPage'
import OutputPage from '@/pages/OutputPage'
import SummaryPage from '@/pages/SummaryPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/upload" replace />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="output" element={<OutputPage />} />
          <Route path="summary" element={<SummaryPage />} />
          <Route path="*" element={<Navigate to="/upload" replace />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  )
}
