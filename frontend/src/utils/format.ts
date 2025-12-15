export const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const scoreToColor = (score: number) => {
  if (score >= 80) return '#34d399'
  if (score >= 60) return '#fbbf24'
  return '#f97316'
}

export const truncate = (text: string, length = 140) => {
  if (!text) return ''
  return text.length > length ? `${text.slice(0, length)}…` : text
}
