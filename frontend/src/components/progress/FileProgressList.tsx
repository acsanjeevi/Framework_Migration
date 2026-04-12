import type { FileProgress } from '@/types/api'
import FileProgressItem from './FileProgressItem'

interface Props {
  files: FileProgress[]
}

export default function FileProgressList({ files }: Props) {
  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No files in queue.
      </p>
    )
  }

  // Sort: in-progress first, then queued, then complete, then failed
  const ORDER = { 'in-progress': 0, queued: 1, complete: 2, failed: 3 }
  const sorted = [...files].sort((a, b) => ORDER[a.status] - ORDER[b.status])

  return (
    <div className="space-y-3">
      {sorted.map(file => (
        <FileProgressItem key={file.fileName} file={file} />
      ))}
    </div>
  )
}
