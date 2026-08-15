import { Loader2 } from 'lucide-react'
import { ProgressMeter } from './ProgressMeter'
import type { UploadBatchState } from '../../hooks/useUploadBatch'

// The upload movement, drawn with the same primitive as processing (Е6). Two
// floors (Е4): a batch shows "Надсилаємо файл i з N" above the current file's
// byte bar; a single file shows the bar alone. When the last byte is sent but
// the response has not arrived, the bar yields to words — no frozen 100 % bar,
// no invented number (Е5).
export function UploadProgressView({ state }: { state: UploadBatchState }) {
  if (!state.active) return null
  return (
    <div className="border-2 border-dashed border-navy/30 bg-navy-pale rounded-xl p-4">
      {state.count > 1 && (
        <p className="text-sm text-navy text-center font-medium">
          Надсилаємо файл {state.index} з {state.count}
        </p>
      )}
      {state.awaitingServer ? (
        <p className="text-sm text-navy text-center mt-1">
          Сервер приймає файл…
        </p>
      ) : state.bytes && state.bytes.total > 0 ? (
        <ProgressMeter
          current={state.bytes.loaded}
          total={state.bytes.total}
          unit="byte"
        />
      ) : (
        <p className="flex items-center justify-center gap-2 text-sm text-navy mt-1">
          <Loader2 size={16} className="animate-spin" />
          Надсилання…
        </p>
      )}
    </div>
  )
}
