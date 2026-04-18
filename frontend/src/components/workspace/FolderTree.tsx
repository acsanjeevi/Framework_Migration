import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FolderNode } from '@/types/api'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function FileIcon({ ext }: { ext?: string }) {
  if (['.ts', '.js', '.java', '.py'].includes(ext ?? ''))
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-blue-500" />
  if (['.feature', '.xml'].includes(ext ?? ''))
    return <FileText className="h-3.5 w-3.5 shrink-0 text-orange-400" />
  return <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
}

// ─────────────────────────────────────────────────────────────────────────────
// Single tree row
// ─────────────────────────────────────────────────────────────────────────────

function TreeNode({ node, depth = 0 }: { node: FolderNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2)
  const isFolder = node.type === 'folder'

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1.5 py-0.5 px-1 rounded transition-colors select-none text-sm',
          isFolder ? 'cursor-pointer hover:bg-accent/40' : 'cursor-default',
          depth > 0 && 'ml-4'
        )}
        onClick={() => isFolder && setOpen((o) => !o)}
      >
        {/* Expand/collapse chevron */}
        {isFolder ? (
          open
            ? <ChevronDown  className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {/* Icon */}
        {isFolder ? (
          open
            ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            : <Folder     className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        ) : (
          <FileIcon ext={node.extension} />
        )}

        {/* Name */}
        <span className="truncate flex-1 text-foreground">{node.name}</span>

        {/* File size */}
        {node.size !== undefined && (
          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
            {formatBytes(node.size)}
          </span>
        )}
      </div>

      {/* Children */}
      {isFolder && open && node.children?.map((child) => (
        <TreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  nodes: FolderNode[]
  label: string
  className?: string
}

export default function FolderTree({ nodes, label, className }: Props) {
  if (nodes.length === 0) return null
  return (
    <div className={cn('rounded-md border bg-muted/20 p-3', className)}>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="space-y-0.5">
        {nodes.map((n) => (
          <TreeNode key={n.path} node={n} />
        ))}
      </div>
    </div>
  )
}
