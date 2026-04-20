import { useCallback, useRef, useState } from 'react'
import { Folder, FolderOpen, FolderInput, X, FileCode, Archive, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const ALLOWED_EXTENSIONS = ['.ts', '.js', '.java', '.py', '.feature', '.xml']
const MAX_FILES = 200
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB

type WebkitFile = File & { webkitRelativePath?: string }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function isAllowed(file: File): boolean {
  const name = file.name.toLowerCase()
  return ALLOWED_EXTENSIONS.some(ext => name.endsWith(ext)) || name.endsWith('.zip')
}

interface Props {
  files: File[]
  onChange: (files: File[]) => void
}

export default function FileUploadZone({ files, onChange }: Props) {
  const folderInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef    = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver]     = useState(false)
  const [errors, setErrors]         = useState<string[]>([])
  const [folderName, setFolderName] = useState<string | null>(null)

  // ── Add files helper ──────────────────────────────────────────────────────
  // replace=true discards any previously loaded files before adding the new set
  const addFiles = useCallback((incoming: FileList | null, fromFolder = false, replace = false) => {
    if (!incoming) return
    const newErrors: string[] = []
    const valid: File[] = []
    let detectedFolder: string | null = null
    const base = replace ? [] : files

    Array.from(incoming).forEach(file => {
      if (!isAllowed(file)) return                              // silently skip unsupported
      if (file.size > MAX_FILE_SIZE_BYTES) {
        newErrors.push(`"${file.name}" exceeds 5 GB limit`)
        return
      }
      if (fromFolder) {
        const parts = (file as WebkitFile).webkitRelativePath?.split('/')
        if (parts && parts.length > 0 && !detectedFolder) detectedFolder = parts[0]
      }
      if (!replace && base.some(f => f.name === file.name)) return  // deduplicate when appending
      valid.push(file)
    })

    if (fromFolder && detectedFolder) setFolderName(detectedFolder)
    if (replace) setErrors([])
    const combined = [...base, ...valid]
    if (combined.length > MAX_FILES) {
      newErrors.push(`Maximum ${MAX_FILES} files — some were not added`)
      onChange(combined.slice(0, MAX_FILES))
    } else {
      onChange(combined)
    }
    setErrors(newErrors)
  }, [files, onChange])

  const clearAll = useCallback(() => {
    onChange([])
    setFolderName(null)
    setErrors([])
  }, [onChange])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files, false)
  }, [addFiles])

  const hasZip    = files.some(f => f.name.toLowerCase().endsWith('.zip'))
  const zipFile   = files.find(f => f.name.toLowerCase().endsWith('.zip'))
  const totalSize = files.reduce((a, f) => a + f.size, 0)

  return (
    <div className="space-y-3">
      {/* Always-present hidden inputs */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard but supported in all modern browsers
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={e => addFiles(e.target.files, true, true)}
        onClick={e => { (e.target as HTMLInputElement).value = '' }}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={e => addFiles(e.target.files, false, true)}
        onClick={e => { (e.target as HTMLInputElement).value = '' }}
      />

      {files.length === 0 ? (
        /* ── Empty state — VS Code Open Folder style ── */
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-5 rounded-xl border-2 border-dashed p-10 transition-all select-none',
            dragOver
              ? 'border-[#0078d4] bg-blue-50'
              : 'border-slate-300 bg-white hover:border-[#0078d4]/60 hover:bg-blue-50/30'
          )}
        >
          {/* Folder icon */}
          <div className={cn(
            'h-20 w-20 rounded-2xl flex items-center justify-center transition-colors',
            dragOver ? 'bg-blue-100' : 'bg-slate-100'
          )}>
            {dragOver
              ? <FolderOpen className="h-10 w-10 text-[#0078d4]" />
              : <FolderInput className="h-10 w-10 text-slate-400" />}
          </div>

          {/* Label */}
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-slate-700">
              {dragOver ? 'Drop to open' : 'Open Folder'}
            </p>
            <p className="text-xs text-slate-400">
              Select a project folder or drag &amp; drop it here
            </p>
          </div>

          {/* Action buttons — VS Code style */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-[#0078d4] hover:bg-[#006cbd] active:bg-[#005ba1] text-white text-sm font-medium transition-colors shadow-sm"
            >
              <Folder className="h-4 w-4" />
              Open Folder…
            </button>
            <span className="text-xs text-slate-300">or</span>
            <button
              type="button"
              onClick={() => zipInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-600 text-sm font-medium transition-colors"
            >
              <Archive className="h-4 w-4 text-amber-500" />
              Open ZIP…
            </button>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Supported files inside folder: {ALLOWED_EXTENSIONS.join(' · ')}
            <br />
            Or upload a <span className="font-medium">.zip</span> archive · max 5 GB
          </p>
        </div>
      ) : (
        /* ── Files selected — header bar + list ── */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {/* Header bar */}
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              {hasZip
                ? <Archive className="h-4 w-4 text-amber-500" />
                : <FolderOpen className="h-4 w-4 text-amber-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {folderName ?? (hasZip ? zipFile?.name : `${files.length} files selected`)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {files.length} file{files.length !== 1 ? 's' : ''} · {formatBytes(totalSize)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="text-xs text-[#0078d4] hover:text-[#005ba1] font-medium transition-colors"
              >
                Change Folder
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors px-2 py-1 rounded-md hover:bg-red-50"
                title="Reset upload"
              >
                <X className="h-3 w-3" />
                Reset
              </button>
            </div>
          </div>

          {/* File list */}
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {files.map((file, i) => {
              const isZip   = file.name.toLowerCase().endsWith('.zip')
              const relPath = (file as WebkitFile).webkitRelativePath
              return (
                <div
                  key={`${i}-${file.name}`}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 transition-colors group"
                >
                  {isZip
                    ? <Archive className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    : <FileCode className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{file.name}</p>
                    {relPath && relPath !== file.name && (
                      <p className="text-[10px] text-slate-400 truncate">{relPath}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 mx-1">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = files.filter(f => f.name !== file.name)
                      onChange(next)
                      if (next.length === 0) { setFolderName(null); setErrors([]) }
                    }}
                    className="shrink-0 text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 space-y-1">
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
