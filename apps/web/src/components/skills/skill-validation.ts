export function validateSkillName(name: string): string | null {
  if (!name) return null
  if (name.length > 64) return 'Max 64 characters'
  if (!/^[a-z0-9-]+$/.test(name)) return 'Only lowercase a-z, 0-9, hyphens'
  if (name.startsWith('-') || name.endsWith('-')) return 'Must not start/end with hyphen'
  if (name.includes('--')) return 'No consecutive hyphens'
  if (name.includes('<') || name.includes('>')) return 'No XML tags'
  const lower = name.toLowerCase()
  if (lower.includes('anthropic') || lower.includes('claude'))
    return 'No reserved words (anthropic/claude)'
  return null
}

export const SKILL_NAME_HINT = '1-64 a-z0-9- ; no --, no start/end -, no anthropic/claude, no <>'
export const SKILL_DESCRIPTION_HINT = 'What it does + when to use (primary trigger).'
