import { describe, it, expect } from 'vitest'
import type { FileRoleDecision, FileRoleProposal } from '../types/api'
import {
  KNOWN_REASON_TOKENS,
  ROLE_LABELS,
  ROLE_TOKENS,
  basename,
  groupByFolder,
  initialRoles,
  reasonLabel,
} from './fileRoles'

describe('reasonLabel (Р15)', () => {
  it('maps every known token to a non-raw Ukrainian phrase', () => {
    for (const token of KNOWN_REASON_TOKENS) {
      expect(reasonLabel(token)).not.toBe(token)
    }
  })

  it('maps on the token when the reason carries a detail', () => {
    expect(reasonLabel('build_config: angular.json')).toBe(reasonLabel('build_config'))
  })

  it('falls back to the raw string for an unknown token (no crash)', () => {
    expect(reasonLabel('brand_new_backend_reason')).toBe('brand_new_backend_reason')
  })

  it('covers exactly the backend reason vocabulary (drift-lock)', () => {
    // CodeStructureReason tokens + the proposal-level custom_source. A backend
    // addition must land here too, else a new file shows a raw token.
    expect(new Set(KNOWN_REASON_TOKENS)).toEqual(
      new Set([
        'custom_source',
        'build_config',
        'author_structure_only',
        'lockfile',
        'vendored_dir',
        'generated_artifact',
        'oversize',
        'denylist_dir',
        'denylist_file',
        'non_code_type',
        'magic_mismatch',
        'nested_archive',
      ]),
    )
  })
})

describe('ROLE_LABELS', () => {
  it('labels every role token', () => {
    for (const t of ROLE_TOKENS) expect(ROLE_LABELS[t]).toBeTruthy()
  })

  it('renders the third role as «Несуттєвий для теми» (A-UI-1 rename)', () => {
    // Display string only — the token stays ``structure_only``.
    expect(ROLE_LABELS.structure_only).toBe('Несуттєвий для теми')
  })
})

describe('reasonLabel — renamed author-structure-only wording (A-UI-1)', () => {
  it('phrases the author-demoted reason with the new label', () => {
    expect(reasonLabel('author_structure_only')).toBe(
      'рішення автора: несуттєвий для теми',
    )
  })
})

const proposal: FileRoleProposal = {
  files: {
    'a.ts': { role: 'full', reason: 'custom_source' },
    'cfg.json': { role: 'structure_only', reason: 'build_config: cfg.json' },
  },
  tree_digest: 'd2',
  computed_at: 't',
}

describe('initialRoles (decision 19 — three cases)', () => {
  it('uses proposal roles when there is no decision', () => {
    expect(initialRoles(proposal)).toEqual({
      'a.ts': 'full',
      'cfg.json': 'structure_only',
    })
  })

  it('prefills a stale decision for covered paths, proposal default for new', () => {
    const decision: FileRoleDecision = {
      files: { 'a.ts': 'auxiliary' },
      tree_digest: 'd1',
      decided_at: 't',
    }
    expect(initialRoles(proposal, decision)).toEqual({
      'a.ts': 'auxiliary', // from the decision
      'cfg.json': 'structure_only', // proposal default (a new path)
    })
  })

  it('is keyed exactly on proposal.files (full coverage)', () => {
    const decision: FileRoleDecision = {
      files: { 'gone.ts': 'full' }, // a path no longer in the proposal
      tree_digest: 'd1',
      decided_at: 't',
    }
    expect(Object.keys(initialRoles(proposal, decision)).sort()).toEqual([
      'a.ts',
      'cfg.json',
    ])
  })
})

describe('groupByFolder + basename (decision 3)', () => {
  it('groups paths by directory, root as ""', () => {
    expect(groupByFolder(['src/app.ts', 'src/util.ts', 'package.json'])).toEqual([
      { folder: '', files: ['package.json'] },
      { folder: 'src', files: ['src/app.ts', 'src/util.ts'] },
    ])
  })

  it('basename strips the folder', () => {
    expect(basename('src/app.ts')).toBe('app.ts')
    expect(basename('package.json')).toBe('package.json')
  })
})
