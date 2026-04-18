import { cn } from '@/lib/utils'
import type { CICDPlatform } from '@/types/api'

const PLATFORMS: { value: CICDPlatform; label: string; subLabel: string; emoji: string }[] = [
  { value: 'azure',  label: 'Azure DevOps', subLabel: 'azure-pipelines.yml', emoji: '☁️' },
  { value: 'gitlab', label: 'GitLab CI',    subLabel: '.gitlab-ci.yml',      emoji: '🦊' },
  { value: 'jenkins',label: 'Jenkins',      subLabel: 'Jenkinsfile',         emoji: '🏗️' },
]

interface Props {
  value: CICDPlatform | ''
  onChange: (value: CICDPlatform) => void
}

export default function CICDSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        CI/CD Platform <span className="text-destructive">*</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {PLATFORMS.map(({ value: v, label, subLabel, emoji }) => {
          const selected = value === v
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md border px-3 py-3 text-center text-sm transition-colors',
                'hover:bg-accent hover:border-accent-foreground/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-border text-muted-foreground'
              )}
            >
              <span className="text-xl">{emoji}</span>
              <span className="font-medium text-foreground">{label}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{subLabel}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        A ready-to-use pipeline file will be generated for your platform.
      </p>
    </div>
  )
}
