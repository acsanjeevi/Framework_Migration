import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLLMStore } from '@/store/llmStore'
import type { LLMProvider } from '@/store/llmStore'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PROVIDER_CONFIGS: Record<
  LLMProvider,
  { label: string; keyLabel: string; keyPlaceholder: string; models: string[] }
> = {
  anthropic: {
    label: 'Anthropic Claude',
    keyLabel: 'ANTHROPIC_API_KEY',
    keyPlaceholder: 'sk-ant-...',
    models: ['claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5'],
  },
  openai: {
    label: 'OpenAI',
    keyLabel: 'OPENAI_API_KEY',
    keyPlaceholder: 'sk-...',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
  },
  groq: {
    label: 'Groq',
    keyLabel: 'GROQ_API_KEY',
    keyPlaceholder: 'gsk_...',
    models: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
  },
}

export default function SettingsDialog({ open, onOpenChange }: Props) {
  const { provider, apiKey, primaryModel, fallbackModel, setProvider, setApiKey, setPrimaryModel, setFallbackModel } =
    useLLMStore()

  const config = PROVIDER_CONFIGS[provider]

  function handleSave() {
    toast.success('LLM settings saved')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>LLM Provider Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Provider select */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Provider</label>
            <Select value={provider} onValueChange={(v: string) => setProvider(v as LLMProvider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="groq">Groq</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{config.keyLabel}</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config.keyPlaceholder}
              autoComplete="off"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Sent only to the backend at migration time. Not stored in the browser.
            </p>
          </div>

          {/* Primary model */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Primary Model (fast/cheap)</label>
            <Select value={primaryModel || config.models[0]} onValueChange={setPrimaryModel}>
              <SelectTrigger>
                <SelectValue placeholder={config.models[0]} />
              </SelectTrigger>
              <SelectContent>
                {config.models.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fallback model */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Fallback Model (high-accuracy)</label>
            <Select value={fallbackModel || config.models[1] || config.models[0]} onValueChange={setFallbackModel}>
              <SelectTrigger>
                <SelectValue placeholder={config.models[1]} />
              </SelectTrigger>
              <SelectContent>
                {config.models.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used when the primary model confidence is below 85%.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
