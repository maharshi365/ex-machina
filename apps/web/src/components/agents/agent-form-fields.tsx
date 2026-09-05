import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'

export function AgentNameField({
  value,
  onChange,
  id = 'agent-name',
  placeholder = 'Jarvis',
}: {
  value: string
  onChange: (v: string) => void
  id?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Name</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function AgentDescriptionField({
  value,
  onChange,
  id = 'agent-desc',
  placeholder = 'Helpful assistant...',
}: {
  value: string
  onChange: (v: string) => void
  id?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Description</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

export function AgentContentField({
  value,
  onChange,
  id = 'agent-content',
}: {
  value: string
  onChange: (v: string) => void
  id?: string
}) {
  return (
    <div className="flex flex-1 flex-col gap-2 min-h-0">
      <Label htmlFor={id}>Content · long prompt</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="You are a helpful agent..."
        className="flex-1 min-h-[280px] overflow-auto font-mono text-sm leading-relaxed"
      />
      <p className="text-xs text-muted-foreground shrink-0">
        {value.length} chars · fits in viewport · scroll inside textarea
      </p>
    </div>
  )
}
