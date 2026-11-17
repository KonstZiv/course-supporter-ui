import { estimateProcessing } from '../api/billing'
import type { MaterialEstimateKind, SourceType } from '../types/api'
import {
  PRICE_FAILED,
  PRICE_UNPRICED,
  PRICE_UNPRICED_BATCH,
  REQUIRED_FEATURES,
  priceViewOf,
  type EstimateOutcome,
} from './priceEstimate'

// A processing whose material the browser cannot read — a retry of a material
// already on the server, the processing a code material's confirmed roles
// start — is asked about with its kind alone: the answer says only whether
// charging is on. Until the server prices such a material by its id, the
// price is "could not be counted before processing", and the action starts.

/** The estimate kind of a material, or null for one never processed (a test). */
export function estimateKindOf(sourceType: SourceType): MaterialEstimateKind | null {
  return sourceType in REQUIRED_FEATURES
    ? (sourceType as MaterialEstimateKind)
    : null
}

/**
 * The line to show before the processing of `count` materials of the node:
 * null when charging is off (nothing to show — run as before).
 */
export async function kindOnlyPriceLine(
  nodeId: string,
  kind: MaterialEstimateKind,
  count = 1,
): Promise<string | null> {
  let outcome: EstimateOutcome
  try {
    const answer = await estimateProcessing(nodeId, { kind })
    outcome = { status: 'answered', answer, priced: false }
  } catch {
    outcome = { status: 'failed' }
  }
  const view = priceViewOf(outcome)
  if (view.kind === 'failed') return PRICE_FAILED
  if (view.kind === 'unpriced') {
    return count > 1 ? PRICE_UNPRICED_BATCH : PRICE_UNPRICED
  }
  return null
}
