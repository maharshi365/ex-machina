import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { SKILL_NAME_HINT } from './skill-validation'

export function SkillNameField({
  value,
  onChange,
  error,
  id = 'skill-name',
}: {
  value: string
  onChange: (v: string) => void
  error: string | null
  id?: string
}) {
  return (
    <div className="space-y-2 shrink-0">
      <Label htmlFor={id}>Name *</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        placeholder="pdf-processing"
        maxLength={64}
      />
      <p className="text-xs text-muted-foreground">{SKILL_NAME_HINT}</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && value && <p className="text-xs text-emerald-600">✓ spec-compliant</p>}
    </div>
  )
}

export function SkillDescriptionField({
  value,
  onChange,
  id = 'skill-desc',
}: {
  value: string
  onChange: (v: string) => void
  id?: string
}) {
  const tooLong = value.length > 1024
  return (
    <div className="space-y-2 shrink-0">
      <Label htmlFor={id}>Description *</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Extract text and tables from PDFs... Use when working with PDFs."
        className="min-h-20"
        maxLength={1024}
      />
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">What it does + when to use (primary trigger)</span>
        <span className={tooLong ? 'text-destructive' : 'text-muted-foreground'}>
          {value.length}/1024
        </span>
      </div>
      {(value.includes('<') || value.includes('>')) && (
        <p className="text-xs text-destructive">No XML tags</p>
      )}
    </div>
  )
}

export function SkillContentField({
  value,
  onChange,
  id = 'skill-content',
  minHeightClass = 'min-h-[260px]',
}: {
  value: string
  onChange: (v: string) => void
  id?: string
  minHeightClass?: string
}) {
  return (
    <div className="flex flex-1 flex-col gap-2 min-h-0">
      <Label htmlFor={id}>Content · SKILL.md body (long)</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'# PDF Processing\n\n## Instructions\n...'}
        className={`flex-1 ${minHeightClass} overflow-auto font-mono text-sm leading-relaxed`}
      />
      <p className="text-xs text-muted-foreground shrink-0">
        {value.length} chars · fits in screen · scroll inside textarea
      </p>
    </div>
  )
}
