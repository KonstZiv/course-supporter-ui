// Shared non-component exports of the «Тип документа» dialog (kept out of
// UploadConfirmDialog.tsx so react-refresh sees a components-only file).

import type { AssignmentType } from '../../types/api'

export const TASK_TYPE_OPTIONS: {
  value: AssignmentType
  label: string
  hint: string
}[] = [
  { value: 'test', label: 'Тест', hint: '5–10 хв, quiz' },
  { value: 'short_task', label: 'Коротке завдання', hint: '20–60 хв' },
  { value: 'task', label: 'Завдання', hint: 'мульти-крок' },
  { value: 'project', label: 'Проєкт', hint: '1–2 тижні' },
]

export function formatAudioDuration(seconds: number): string {
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `[${h}:${pad(m)}:${pad(s)}]` : `[${pad(m)}:${pad(s)}]`
}
