import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import FolderTree from '@/components/workspace/FolderTree'
import type { FolderNode } from '@/types/api'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.js', '.java', '.py', '.feature', '.xml'])

// Threshold above which we skip browser-side parsing (too large for in-memory)
const BROWSER_PARSE_LIMIT_BYTES = 200 * 1024 * 1024 // 200 MB

// ─────────────────────────────────────────────────────────────────────────────
// Framework auto-detection from file paths
// ─────────────────────────────────────────────────────────────────────────────

function detectFramework(paths: string[]): string | null {
  const joined = paths.join('\n').toLowerCase()
  if (joined.includes('cypress.config') || joined.includes('/cypress/')) return 'Cypress'
  if (paths.some((p) => p.endsWith('.robot')))                             return 'Robot Framework'
  if (joined.includes('wdio.conf'))                                        return 'WebdriverIO'
  if (joined.includes('testcafe'))                                         return 'TestCafe'
  if (joined.includes('nightwatch.conf') || joined.includes('nightwatch.json')) return 'Nightwatch'
  if (joined.includes('selenium') && (joined.includes('.java') || joined.includes('pom.xml')))
    return 'Selenium-Java'
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Build FolderNode tree from jszip entries (browser-side)
// ─────────────────────────────────────────────────────────────────────────────

function buildBrowserTree(zipFiles: { [k: string]: JSZip.JSZipObject }): FolderNode[] {
  const root: FolderNode[] = []
  const dirs: Record<string, FolderNode> = {}

  function getOrCreateDir(parts: string[]): FolderNode[] {
    if (parts.length === 0) return root
    const key = parts.join('/')
    if (!dirs[key]) {
      const parentArr = getOrCreateDir(parts.slice(0, -1))
      dirs[key] = { name: parts[parts.length - 1], path: key, type: 'folder', children: [] }
      parentArr.push(dirs[key])
    }
    return dirs[key].children!
  }

  Object.keys(zipFiles)
    .sort()
    .forEach((name) => {
      const entry = zipFiles[name]
      const parts = name.split('/').filter(Boolean)
      if (entry.dir || parts.length === 0) return
      const ext = '.' + (parts[parts.length - 1].split('.').pop() ?? '')
      const parent = getOrCreateDir(parts.slice(0, -1))
      parent.push({
        name:      parts[parts.length - 1],
        path:      name,
        type:      'file',
        extension: ext.toLowerCase(),
      })
    })

  return root
}

// ─────────────────────────────────────────────────────────────────────────────
// Detect unique language distribution in the ZIP
// ─────────────────────────────────────────────────────────────────────────────

function getLanguageBreakdown(paths: string[]): string {
  const counts: Record<string, number> = {}
  paths.forEach((p) => {
    const ext = '.' + (p.split('.').pop() ?? '').toLowerCase()
    if (SUPPORTED_EXTENSIONS.has(ext)) counts[ext] = (counts[ext] ?? 0) + 1
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([ext, n]) => `${ext} ×${n}`)
    .join(' · ')
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  file: File
}

interface ZipInfo {
  tree:      FolderNode[]
  supported: string[]
  skipped:   string[]
  framework: string | null
  languages: string
}

export default function ZipPreviewPanel({ file }: Props) {
  const [info, setInfo]     = useState<ZipInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    if (file.size > BROWSER_PARSE_LIMIT_BYTES) {
      setLoading(false)
      return
    }

    JSZip.loadAsync(file)
      .then((zip) => {
        if (cancelled) return
        const allPaths = Object.keys(zip.files).filter((p) => !zip.files[p].dir)
        const supported = allPaths.filter((p) =>
          SUPPORTED_EXTENSIONS.has('.' + (p.split('.').pop() ?? '').toLowerCase())
        )
        const skipped = allPaths.filter((p) =>
          !SUPPORTED_EXTENSIONS.has('.' + (p.split('.').pop() ?? '').toLowerCase())
        )
        setInfo({
          tree:      buildBrowserTree(zip.files),
          supported,
          skipped,
          framework: detectFramework(allPaths),
          languages: getLanguageBreakdown(allPaths),
        })
      })
      .catch((e) => {
        if (!cancelled) setError(String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [file])

  // ── Large file: skip browser parsing ──────────────────────────────────────
  if (file.size > BROWSER_PARSE_LIMIT_BYTES) {
    return (
      <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-md border px-3 py-2 bg-muted/20">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          ZIP is too large for browser-side preview ({(file.size / (1024 * 1024)).toFixed(0)} MB).
          The server will extract it after upload.
        </span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 py-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        <span>Parsing ZIP…</span>
      </div>
    )
  }

  if (error || !info) {
    return (
      <div className="flex items-start gap-2 text-xs text-destructive rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Could not parse ZIP: {error ?? 'Unknown error'}</span>
      </div>
    )
  }

  const { tree, supported, skipped, framework, languages } = info

  return (
    <div className="space-y-3 mt-1">
      {/* ── Developer info panel ─────────────────────────────────────────── */}
      <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
        <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide">
          ZIP Contents — Developer Summary
        </p>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{supported.length} supported file{supported.length !== 1 ? 's' : ''}</Badge>
          {skipped.length > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-400 dark:text-amber-400">
              {skipped.length} file{skipped.length !== 1 ? 's' : ''} will be skipped
            </Badge>
          )}
          {framework && (
            <Badge className="bg-blue-600/80 text-white">{framework} detected</Badge>
          )}
        </div>

        {/* Language breakdown */}
        {languages && (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Languages: </span>{languages}
          </p>
        )}

        {/* Supported file list */}
        {supported.length > 0 && (
          <div className="flex items-start gap-1.5 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Will migrate:{' '}
              {supported.slice(0, 6).map((p) => p.split('/').pop()).join(', ')}
              {supported.length > 6 && ` +${supported.length - 6} more`}
            </span>
          </div>
        )}

        {/* Skipped file list */}
        {skipped.length > 0 && (
          <div className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Skipped:{' '}
              {skipped.slice(0, 4).map((p) => p.split('/').pop()).join(', ')}
              {skipped.length > 4 && ` +${skipped.length - 4} more`}
            </span>
          </div>
        )}
      </div>

      {/* ── Full folder tree (browser preview) ───────────────────────────── */}
      <FolderTree nodes={tree} label="ZIP structure (browser preview)" />
    </div>
  )
}
