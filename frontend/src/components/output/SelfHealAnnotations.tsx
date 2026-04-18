import { Wand2, AlertTriangle } from 'lucide-react'

interface Props {
  code: string
}

/**
 * Extracts and displays all [SELF-HEAL] annotation comments from the migrated code.
 */
export default function SelfHealAnnotations({ code }: Props) {
  const annotations = code
    .split('\n')
    .filter(line => line.includes('[SELF-HEAL]'))
    .map(line => line.trim().replace(/^\/\/\s*/, ''))

  if (annotations.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <AlertTriangle className="h-4 w-4" />
        No self-healing annotations found in this file.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {annotations.length} self-healing selector{annotations.length !== 1 ? 's' : ''} generated
      </p>
      <ul className="space-y-1.5">
        {annotations.map((annotation, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs font-mono"
          >
            <Wand2 className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
            <span className="text-amber-800 dark:text-amber-300 break-all">{annotation}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
