import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SourceFramework } from '@/types/api'

const FRAMEWORKS: { value: SourceFramework; label: string; icon: string }[] = [
  { value: 'cypress',      label: 'Cypress',        icon: '🌲' },
  { value: 'selenium',     label: 'Selenium',        icon: '🔶' },
  { value: 'robot',        label: 'Robot Framework', icon: '🤖' },
  { value: 'webdriverio',  label: 'WebDriverIO',     icon: '🚀' },
  { value: 'testcafe',     label: 'TestCafe',        icon: '☕' },
  { value: 'nightwatch',   label: 'Nightwatch',      icon: '🦉' },
]

interface Props {
  value: SourceFramework | ''
  onChange: (value: SourceFramework) => void
}

export default function FrameworkSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        Source Framework <span className="text-destructive">*</span>
      </label>
      <Select value={value} onValueChange={(v: string) => onChange(v as SourceFramework)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select source framework…" />
        </SelectTrigger>
        <SelectContent>
          {FRAMEWORKS.map(({ value: v, label, icon }) => (
            <SelectItem key={v} value={v}>
              <span className="flex items-center gap-2">
                <span>{icon}</span>
                <span>{label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        The test automation framework your source files use.
      </p>
    </div>
  )
}
