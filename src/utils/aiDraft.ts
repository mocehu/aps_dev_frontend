import type { AiDraft, DraftPayload } from '../types/api'

const AI_DRAFT_STORAGE_KEY = 'PENDING_AI_DRAFT'

export const savePendingAiDraft = (draft: AiDraft) => {
  localStorage.setItem(AI_DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

export const getPendingAiDraft = (): AiDraft | null => {
  const raw = localStorage.getItem(AI_DRAFT_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AiDraft
  } catch (_error) {
    localStorage.removeItem(AI_DRAFT_STORAGE_KEY)
    return null
  }
}

export const clearPendingAiDraft = () => {
  localStorage.removeItem(AI_DRAFT_STORAGE_KEY)
}

export const normalizeDraftPayload = (payload?: DraftPayload | null) => ({
  func: payload?.func || '',
  trigger: payload?.trigger || '',
  kwargs: payload?.kwargs || {},
  id: payload?.id || '',
  name: payload?.name || '',
  trigger_args: payload?.trigger_args || {},
  args: payload?.args || []
})
