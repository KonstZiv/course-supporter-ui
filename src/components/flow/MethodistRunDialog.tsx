import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../testEditor/ConfirmDialog'
import { PriceCard } from '../billing/PriceCard'
import { useActionPrice, type PriceRequest } from '../../hooks/useActionPrice'
import { estimateNodeSummary } from '../../api/billing'
import { useT } from '../../i18n/LanguageContext'

interface Props {
  open: boolean
  nodeId: string | null
  nodeTitle: string
  force: boolean
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * "Run the Methodist?" — asks confirmation and shows the price in units
 * before regenerating section descriptions under the node.
 */
export function MethodistRunDialog({
  open,
  nodeId,
  nodeTitle,
  force,
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  const t = useT()
  const [nothingToDo, setNothingToDo] = useState(false)

  useEffect(() => {
    if (!open) {
      setNothingToDo(false)
    }
  }, [open])

  const requests = useMemo<readonly PriceRequest[] | null>(() => {
    if (!open || !nodeId) return null
    return [
      {
        estimate: async () => {
          const answer = await estimateNodeSummary(nodeId, force)
          setNothingToDo(answer.unpriced_reason === 'nothing_to_do')
          return answer
        },
      },
    ]
  }, [open, nodeId, force])

  const price = useActionPrice(requests)

  return (
    <ConfirmDialog
      open={open}
      title={t('panel.flow.methodistRun.title')}
      cancelLabel={t('panel.flow.methodistRun.cancel')}
      confirmLabel={t('panel.flow.methodistRun.start')}
      confirmClass="btn-primary"
      busy={busy}
      confirmDisabled={!price.ready && !nothingToDo}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p>{t('panel.flow.methodistRun.body', { name: nodeTitle })}</p>
      {nothingToDo ? (
        <p className="text-sm text-ink-light">
          {t('panel.flow.methodistRun.nothingToDo')}
        </p>
      ) : (
        <PriceCard price={price} />
      )}
    </ConfirmDialog>
  )
}
