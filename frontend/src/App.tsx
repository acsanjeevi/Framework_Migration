import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import Layout from '@/components/layout/Layout'
import UploadPage from '@/pages/UploadPage'
import ProgressPage from '@/pages/ProgressPage'
import OutputPage from '@/pages/OutputPage'
import SummaryPage from '@/pages/SummaryPage'
import { useMigrationStore } from '@/store/migrationStore'

export default function App() {
  const setMockMode = useMigrationStore((s) => s.setMockMode)

  useEffect(() => {
    const envMock = import.meta.env.VITE_MOCK_MODE
    if (envMock === 'true' || envMock === '1') {
      setMockMode(true)
    }
  }, [setMockMode])

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
