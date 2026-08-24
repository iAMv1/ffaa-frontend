import { useState } from 'react'
import { CircleNotch, Envelope, Trash } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { api, type ReminderPreview } from '@/api'
import { useApp } from '@/state/store'
import { EmptyHint, SkeletonRows } from '@/lib/ui-helpers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const DAY_PRESETS = [7, 14, 30]

export function Reminders() {
  const {
    loading,
    clients,
    preview,
    previewDays, setPreviewDays,
    previewLoading,
    loadPreview,
    sendAllBusy,
    rowBusy,
    reminders,
    setConfirm,
    setRowBusy,
    flash,
    load,
  } = useApp()

  const [draftDays, setDraftDays] = useState(previewDays)
  const [allBusy, setAllBusy] = useState(false)
  const [failedIds, setFailedIds] = useState<ReadonlySet<number>>(() => new Set())

  const anyAllBusy = sendAllBusy || allBusy
  const sendableCount = preview.filter((p) => p.email).length

  const clearFailure = (client_id: number) =>
    setFailedIds((prev) => {
      if (!prev.has(client_id)) return prev
      const next = new Set(prev)
      next.delete(client_id)
      return next
    })

  // Same semantics as store.sendOneReminder (api.sendReminder -> flash -> refresh),
  // plus per-row failure tracking so a danger Badge can mark the failed card.
  const handleSendOne = async (p: ReminderPreview) => {
    setRowBusy(p.client_id)
    try {
      await api.sendReminder(p.client_id)
      flash(`Sent to ${p.name}`)
      clearFailure(p.client_id)
      await Promise.all([load(), loadPreview()])
    } catch (e) {
      setFailedIds((prev) => new Set(prev).add(p.client_id))
      flash(e instanceof Error ? e.message : 'Send failed', 'err')
    } finally {
      setRowBusy(null)
    }
  }

  // Same loop as store.sendAllReminders (sequential sends, summary flash, refresh),
  // plus per-row failure tracking so partial failures surface on the failing rows.
  const handleSendAll = async () => {
    setAllBusy(true)
    setFailedIds(new Set())
    let ok = 0
    const failed = new Set<number>()
    for (const p of preview) {
      if (!p.email) continue
      try {
        await api.sendReminder(p.client_id)
        ok++
      } catch {
        failed.add(p.client_id)
      }
    }
    flash(`${ok} sent${failed.size ? `, ${failed.size} failed` : ''}`, failed.size ? 'err' : 'ok')
    setFailedIds(failed)
    setAllBusy(false)
    await Promise.all([load(), loadPreview()])
  }

  const applyWindow = (d: number) => {
    setDraftDays(d)
    setPreviewDays(d)
  }

  const generatePreview = () => {
    if (!Number.isFinite(draftDays) || draftDays < 1) return
    if (draftDays === previewDays) void loadPreview()
    else setPreviewDays(draftDays)
  }

  return (
    <>
      <Card className="gap-4 rounded-2xl border-zinc-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Overdue clients</h3>
            <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-zinc-500">
              Clients with no uploads in the window. Message lists their missing documents.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex items-center rounded-lg border border-zinc-200 p-0.5">
              {DAY_PRESETS.map((d) => (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={previewDays === d ? 'secondary' : 'ghost'}
                  className={
                    previewDays === d
                      ? 'h-7 bg-zinc-900 px-2 text-xs text-white hover:bg-zinc-800'
                      : 'h-7 px-2 text-zinc-600 text-xs hover:bg-zinc-100 hover:text-zinc-900'
                  }
                  onClick={() => applyWindow(d)}
                >
                  {d}d
                </Button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reminder-window-days" className="text-xs text-zinc-500">
                Days
              </Label>
              <Input
                id="reminder-window-days"
                type="number"
                min={1}
                className="num h-8 w-20 border-zinc-300 bg-white focus-visible:border-zinc-400 focus-visible:ring-zinc-200"
                value={Number.isFinite(draftDays) ? draftDays : ''}
                onChange={(e) => {
                  const n = e.target.valueAsNumber
                  setDraftDays(Number.isFinite(n) ? n : NaN)
                }}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 hover:text-zinc-900"
              disabled={previewLoading}
              onClick={generatePreview}
            >
              Generate preview
            </Button>
            <Button
              size="sm"
              className="bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none"
              disabled={anyAllBusy || previewLoading || sendableCount === 0}
              onClick={handleSendAll}
            >
              {anyAllBusy ? (
                <CircleNotch className="animate-spin" />
              ) : (
                <Envelope />
              )}
              Send all ({sendableCount})
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {previewLoading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="w-full space-y-2.5">
                  <Skeleton className="h-4 w-44 bg-zinc-200" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-24 rounded-full bg-zinc-200" />
                    <Skeleton className="h-5 w-28 rounded-full bg-zinc-200" />
                  </div>
                  <Skeleton className="h-3 w-full max-w-md bg-zinc-200" />
                </div>
                <Skeleton className="h-8 w-20 rounded-md bg-zinc-200" />
              </div>
            </div>
          ))
        ) : preview.length === 0 ? (
          <Card className="rounded-2xl border-zinc-200 bg-white py-0 shadow-sm">
            <EmptyHint
              title="Nobody overdue"
              body={`Every client uploaded something in the last ${previewDays} days. Widen the window to check further back.`}
            />
          </Card>
        ) : (
          preview.map((p, i) => (
            <motion.div
              key={p.client_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: Math.min(i * 0.05, 0.3),
                ease: 'easeOut',
              }}
            >
              <Card className="flex-row items-start gap-4 rounded-xl border-zinc-200 bg-white px-5 py-4 shadow-sm">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900">{p.name}</p>
                    {p.email ? (
                      <span className="truncate text-xs text-zinc-400">{p.email}</span>
                    ) : (
                      <Badge variant="destructive" className="bg-red-600 text-white">
                        no email
                      </Badge>
                    )}
                    {failedIds.has(p.client_id) && (
                      <Badge variant="destructive" className="bg-red-600 text-white">
                        failed
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.missing_docs.map((d) => (
                      <Badge
                        key={d}
                        variant="outline"
                        className="border-amber-600/20 bg-amber-50 text-amber-800"
                      >
                        {d}
                      </Badge>
                    ))}
                    <span className="num text-[11px] text-zinc-400">
                      {p.days_since_upload != null
                        ? `last upload ${p.days_since_upload}d ago`
                        : 'no uploads yet'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-zinc-700">{p.subject}</p>
                  <p className="max-w-[68ch] whitespace-pre-line text-xs leading-relaxed text-zinc-500">
                    {p.body}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 bg-zinc-900 text-white hover:bg-zinc-800"
                  disabled={!p.email || rowBusy === p.client_id || anyAllBusy}
                  onClick={() => handleSendOne(p)}
                >
                  {rowBusy === p.client_id ? (
                    <CircleNotch className="animate-spin" />
                  ) : (
                    <Envelope />
                  )}
                  Send
                </Button>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Card className="gap-4 rounded-2xl border-zinc-200 bg-white px-6 py-5 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Reminder history</h3>
          <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-zinc-500">
            All clients. Sent, failed, and pending attempts.
          </p>
        </div>
      </Card>
      <Card className="overflow-hidden rounded-2xl border-zinc-200 bg-white py-0 shadow-sm">
        {loading ? (
          <SkeletonRows />
        ) : reminders.length === 0 ? (
          <EmptyHint
            title="No reminders"
            body="Send from the overdue list above or from a client page."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-100 hover:bg-transparent">
                <TableHead className="pl-5 text-zinc-400">Client</TableHead>
                <TableHead className="text-zinc-400">Subject</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Sent</TableHead>
                <TableHead className="text-zinc-400">Error</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.map((r) => {
                const status = r.status ?? '—'
                return (
                  <TableRow key={r.id} className="border-zinc-100 hover:bg-zinc-50/80">
                    <TableCell className="pl-5 text-xs font-medium text-zinc-700">
                      {clients.find((c) => c.id === r.client_id)?.name ?? `#${r.client_id}`}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-700">
                      {r.subject ?? '—'}
                    </TableCell>
                    <TableCell>
                      {status === 'sent' ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-600/20 bg-emerald-50 text-emerald-700"
                        >
                          sent
                        </Badge>
                      ) : status === 'failed' ? (
                        <Badge variant="destructive" className="bg-red-600 text-white">
                          failed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-zinc-100 text-zinc-700">
                          {status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="num text-xs text-zinc-500">
                      {r.sent_at ? new Date(String(r.sent_at)).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>
                      {r.error_message ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block max-w-[26ch] cursor-default truncate text-xs text-red-700">
                              {String(r.error_message)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[380px] break-words bg-zinc-900 text-white">
                            {String(r.error_message)}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete reminder"
                        disabled={rowBusy === -r.id}
                        onClick={() =>
                          setConfirm({
                            title: 'Delete reminder',
                            message: `Delete "${String(r.subject).slice(0, 60)}"?`,
                            confirmLabel: 'Delete',
                            variant: 'danger',
                            onConfirm: async () => {
                              setRowBusy(-r.id)
                              setConfirm(null)
                              try {
                                await api.deleteReminder(r.id)
                                flash('Reminder deleted')
                                load()
                              } catch (e) {
                                flash(e instanceof Error ? e.message : 'Delete failed', 'err')
                              } finally {
                                setRowBusy(null)
                              }
                            },
                          })
                        }
                      >
                        {rowBusy === -r.id ? (
                          <CircleNotch className="animate-spin text-red-700" />
                        ) : (
                          <Trash className="text-red-700" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  )
}
