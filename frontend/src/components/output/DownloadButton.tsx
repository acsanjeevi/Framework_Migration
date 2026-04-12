import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadZip } from '@/api/migrate'
import { toast } from 'sonner'

interface Props {
  jobId: string
  mockMode: boolean
}

export default function DownloadButton({ jobId, mockMode }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    if (mockMode) {
      toast.info('Demo mode — ZIP download is not available without a real migration job.')
      return
    }
    setLoading(true)
    try {
      await downloadZip(jobId)
      toast.success('Download started.')
    } catch {
      toast.error('Failed to download ZIP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleDownload} disabled={loading} className="gap-2">
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing…
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download ZIP
        </>
      )}
    </Button>
  )
}
