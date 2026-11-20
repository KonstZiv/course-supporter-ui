import { estimateProcessing } from '../api/billing'
import type { Language } from '../i18n/languages'
import type { MaterialEstimateKind, SourceType } from '../types/api'
import {
  isMaterialEstimateKind,
  priceFailedText,
  priceUnpricedText,
  priceViewOf,
  type EstimateOutcome,
} from './priceEstimate'

// A processing whose material the browser cannot read — a retry of a material
// already on the server, the processing a code material's confirmed roles
// start — is asked about with its kind alone: the server answers it has no
// price (the features are missing) and whether charging is on. Until the
// server prices such a material by its id, the price is "could not be counted
// before processing", and the action starts.

/** The estimate kind of a material, or null for one never processed (a test). */
export function estimateKindOf(sourceType: SourceType): MaterialEstimateKind | null {
  return isMaterialEstimateKind(sourceType) ? sourceType : null
}

/**
 * The line to show before the processing of `count` materials of the node:
 * null when charging is off (nothing to show — run as before).
 */
export async function kindOnlyPriceLine(
  language: Language,
  nodeId: string,
  kind: MaterialEstimateKind,
  count = 1,
): Promise<string | null> {
  let outcome: EstimateOutcome
  try {
    const answer = await estimateProcessing(nodeId, { kind })
    outcome = { status: 'answered', answer }
  } catch {
    outcome = { status: 'failed' }
  }
  const view = priceViewOf(outcome)
  if (view.kind === 'failed') return priceFailedText(language)
  if (view.kind === 'unpriced') {
    return priceUnpricedText(language, count > 1)
  }
  return null
}
