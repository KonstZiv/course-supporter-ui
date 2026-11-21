import type { Language } from '../i18n/languages'
import { translate, type MessageKey } from '../i18n/translate'
import type { FileRoleDecision, FileRoleProposal, FileRoleToken } from '../types/api'

export const ROLE_TOKENS: FileRoleToken[] = ['full', 'auxiliary', 'structure_only']

const ROLE_LABEL_KEYS: Record<FileRoleToken, MessageKey> = {
  full: 'panel.fileRoles.role.full',
  auxiliary: 'panel.fileRoles.role.auxiliary',
  structure_only: 'panel.fileRoles.role.structureOnly',
}

export function roleLabels(language: Language): Record<FileRoleToken, string> {
  return {
    full: translate(language, 'panel.fileRoles.role.full'),
    auxiliary: translate(language, 'panel.fileRoles.role.auxiliary'),
    structure_only: translate(language, 'panel.fileRoles.role.structureOnly'),
  }
}

export function roleLabel(language: Language, token: FileRoleToken): string {
  const key = ROLE_LABEL_KEYS[token]
  return key ? translate(language, key) : token
}

// Proposal-reason token → Ukrainian phrase (Р15). Mirrors the backend reason
// vocabulary (CodeStructureReason + the proposal-level ``custom_source``); kept
// in step by a test-lock. An UNKNOWN token falls back to the raw string, so a
// new backend reason never crashes the screen.
const REASON_LABEL_KEYS: Record<string, MessageKey> = {
  custom_source: 'panel.fileRoles.reason.customSource',
  build_config: 'panel.fileRoles.reason.buildConfig',
  author_structure_only: 'panel.fileRoles.reason.authorStructureOnly',
  lockfile: 'panel.fileRoles.reason.lockfile',
  vendored_dir: 'panel.fileRoles.reason.vendoredDir',
  generated_artifact: 'panel.fileRoles.reason.generatedArtifact',
  oversize: 'panel.fileRoles.reason.oversize',
  denylist_dir: 'panel.fileRoles.reason.denylistDir',
  denylist_file: 'panel.fileRoles.reason.denylistFile',
  non_code_type: 'panel.fileRoles.reason.nonCodeType',
  magic_mismatch: 'panel.fileRoles.reason.magicMismatch',
  nested_archive: 'panel.fileRoles.reason.nestedArchive',
}

// The reasons the backend can emit (the map MUST cover these — test-locked).
export const KNOWN_REASON_TOKENS = Object.keys(REASON_LABEL_KEYS)

// A reason string is either a bare token (``custom_source``) or
// ``<token>: <detail>`` (``build_config: angular.json``). Map on the token;
// fall back to the raw string for an unknown token.
export function reasonLabel(language: Language, reason: string): string {
  const token = (reason.split(':')[0] ?? reason).trim()
  const key = REASON_LABEL_KEYS[token]
  return key ? translate(language, key) : reason
}

// The initial per-file roles the screen shows (decision 19, the "three cases").
//
// * No saved decision → the proposal's own roles.
// * A saved decision whose digest no longer matches the current proposal → a
//   PREFILL: the decision's role for a path it still covers, the proposal
//   default for a new path.
//
// Always keyed on the CURRENT ``proposal.files``, so the submitted map covers
// exactly the proposal (the backend's full-cover rule).
export function initialRoles(
  proposal: FileRoleProposal,
  decision?: FileRoleDecision,
): Record<string, FileRoleToken> {
  const out: Record<string, FileRoleToken> = {}
  for (const [path, entry] of Object.entries(proposal.files)) {
    out[path] = decision?.files[path] ?? entry.role
  }
  return out
}

export interface FolderGroup {
  folder: string
  files: string[]
}

// Group proposal paths by their directory — a display gesture only (decision 3):
// the folder header can set a role for the whole group, but the submitted state
// is always per-file.
export function groupByFolder(paths: string[]): FolderGroup[] {
  const groups = new Map<string, string[]>()
  for (const path of paths) {
    const idx = path.lastIndexOf('/')
    const folder = idx >= 0 ? path.slice(0, idx) : ''
    const bucket = groups.get(folder)
    if (bucket) bucket.push(path)
    else groups.set(folder, [path])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, files]) => ({ folder, files: [...files].sort() }))
}

export function basename(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx >= 0 ? path.slice(idx + 1) : path
}
