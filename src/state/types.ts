export type ConfirmState = {
  title: string
  message: string
  confirmLabel?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
}

export type MatchCandidate = {
  invoice_number?: string | null
  narration?: string | null
  amount?: number
  match_score?: number
  invoice_id?: number
  bank_statement_id?: number
}
