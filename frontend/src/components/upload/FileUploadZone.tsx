import { useCallback, useRef, useState } from 'react'
import { UploadCloud, X, FileCode, Archive, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import ZipPreviewPanel from '@/components/upload/ZipPreviewPanel'

const ALLOWED_EXTENSIONS = ['.ts', '.js', '.java', '.py', '.feature', '.xml', '.zip']
const MAX_FILES = 50
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function isAllowed(file: File): boolean {
  return ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
}

interface Props {
  files: File[]
  onChange: (files: File[]) => void
}

export default function FileUploadZone({ files, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return
    const newErrors: string[] = []
    const valid: File[] = []

    Array.from(incoming).forEach(file => {
      if (!isAllowed(file)) {
        newErrors.push(`"${file.name}" — unsupported type (allowed: ${ALLOWED_EXTENSIONS.join(' ')})`)
        return
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        newErrors.push(`"${file.name}" — exceeds 5 GB limit`)
        return
      }
      // Deduplicate by name
      if (files.some(f => f.name === file.name)) return
      valid.push(file)
    })

    const combined = [...files, ...valid]
    if (combined.length > MAX_FILES) {
      newErrors.push(`Maximum ${MAX_FILES} files allowed — some files were not added`)
      onChange(combined.slice(0, MAX_FILES))
    } else {
      onChange(combined)
    }
    setErrors(newErrors)
  }, [files, onChange])

  const removeFile = useCallback((name: string) => {
    onChange(files.filter(f => f.name !== name))
    setErrors([])
  }, [files, onChange])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Test Files</label>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed',
          'cursor-pointer p-8 transition-colors select-none',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-accent/30'
        )}
      >
        <UploadCloud className={cn('h-8 w-8', dragOver ? 'text-primary' : 'text-muted-foreground')} />
        <p className="text-sm text-muted-foreground text-center">
          <span className="font-medium text-foreground">Click to browse</span> or drag & drop files here
        </p>
        <p className="text-[11px] text-muted-foreground">
          {ALLOWED_EXTENSIONS.join(' · ')} · max 5 GB · up to {MAX_FILES} files
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={e => addFiles(e.target.files)}
          onClick={e => { (e.target as HTMLInputElement).value = '' }}
        />
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="rounded-md bg-destructive/10 p-3 space-y-1">
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="rounded-md border divide-y max-h-[28rem] overflow-y-auto">
          {files.map(file => {
            const isZip = file.name.toLowerCase().endsWith('.zip')
            return (
              <div key={file.name}>
                <div className="flex items-center gap-2 px-3 py-2">
                  {isZip
                    ? <Archive className="h-4 w-4 shrink-0 text-amber-500" />
                    : <FileCode className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className="flex-1 min-w-0 truncate text-sm">{file.name}</span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {formatBytes(file.size)}
                  </Badge>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); removeFile(file.name) }}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {isZip && (
                  <div className="px-3 pb-3">
                    <ZipPreviewPanel file={file} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {files.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {files.length} file{files.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}
