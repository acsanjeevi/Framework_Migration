import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TargetLanguage } from '@/types/api'

const LANGUAGES: { value: TargetLanguage; label: string }[] = [
  { value: 'typescript', label: 'TypeScript (Playwright)' },
  { value: 'javascript', label: 'JavaScript (Playwright)' },
  { value: 'java',       label: 'Java (Playwright)'       },
  { value: 'python',     label: 'Python (Playwright)'     },
]

interface Props {
  value: TargetLanguage | ''
  onChange: (value: TargetLanguage) => void
}

export default function TargetLanguageSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        Target Language <span className="text-destructive">*</span>
      </label>
      <Select value={value} onValueChange={(v: string) => onChange(v as TargetLanguage)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select target language…" />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map(({ value: v, label }) => (
            <SelectItem key={v} value={v}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        All output will target Playwright + your chosen language.
      </p>
    </div>
  )
}
