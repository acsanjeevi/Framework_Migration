import { FileCode } from 'lucide-react'
import CodePreview from './CodePreview'

interface Props {
  yaml: string
  fileName: string
}

export default function CICDPreview({ yaml, fileName }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileCode className="h-4 w-4" />
        <span className="font-mono">{fileName}</span>
      </div>
      <CodePreview code={yaml} language="yaml" />
    </div>
  )
}
