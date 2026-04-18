import { cn } from '@/lib/utils'

interface Props {
  code: string
  language?: string
  className?: string
}

/**
 * Lightweight syntax-aware code block. Highlights [SELF-HEAL] lines in amber.
 * No external syntax-highlighter dependency — keeps bundle lean for hackathon.
 */
export default function CodePreview({ code, className }: Props) {
  const lines = code.split('\n')

  return (
    <div className={cn(
      'relative rounded-md border bg-muted/40 overflow-auto max-h-[420px] font-mono text-xs leading-relaxed',
      className
    )}>
      {/* Line numbers + content */}
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => {
            const isSelfHeal = line.includes('[SELF-HEAL]')
            return (
              <tr
                key={i}
                className={cn(
                  'group',
                  isSelfHeal && 'bg-amber-50 dark:bg-amber-950/30'
                )}
              >
                <td className="select-none text-right pr-4 pl-3 py-0 text-muted-foreground/50 border-r border-border w-[3rem] text-[10px]">
                  {i + 1}
                </td>
                <td className="pl-4 pr-4 py-0 whitespace-pre">
                  {isSelfHeal ? (
                    <span className="text-amber-700 dark:text-amber-400">{line}</span>
                  ) : (
                    <span className="text-foreground">{line}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
