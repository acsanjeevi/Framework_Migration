import { Loader2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  disabled: boolean
  loading: boolean
  mockMode: boolean
  onMockToggle: () => void
  onSubmit: () => void
}

export default function MigrateButton({ disabled, loading, mockMode, onMockToggle, onSubmit }: Props) {
  return (
    <div className="flex flex-col items-stretch gap-3">
      <Button
        size="lg"
        disabled={disabled || loading}
        onClick={onSubmit}
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Migrating…
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" />
            {mockMode ? 'Run Demo Migration' : 'Migrate Tests'}
          </>
        )}
      </Button>

      <button
        type="button"
        onClick={onMockToggle}
        className="text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors"
      >
        {mockMode ? 'Switch to real migration' : 'Try with sample files (demo mode)'}
      </button>
    </div>
  )
}
