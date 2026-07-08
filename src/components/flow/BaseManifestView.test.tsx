import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BaseManifestView } from './BaseManifestView'
import type { ProjectBaseManifest } from '../../types/api'

const manifest: ProjectBaseManifest = {
  schema: 1,
  aggregate_hash: 'abcdef0123456789',
  included: [
    { path: 'src/main.py', size: 100, hash: 'h1', cls: 'text' },
    { path: 'src/util/io.py', size: 50, hash: 'h2', cls: 'text' },
    { path: 'README.md', size: 10, hash: 'h3', cls: 'document' },
  ],
  excluded: [
    { path: 'node_modules/', reason: 'denylist_dir', entries: 42, size: 999999 },
  ],
  total_files: 4,
  total_bytes: 160,
}

describe('BaseManifestView', () => {
  it('renders the included files as a directory tree', () => {
    render(<BaseManifestView manifest={manifest} />)
    // folders (grouped from POSIX paths)
    expect(screen.getByText('src/')).toBeInTheDocument()
    expect(screen.getByText('util/')).toBeInTheDocument()
    // files (leaf names)
    expect(screen.getByText('main.py')).toBeInTheDocument()
    expect(screen.getByText('io.py')).toBeInTheDocument()
    expect(screen.getByText('README.md')).toBeInTheDocument()
  })

  it('renders the collapsed excluded rows with a reason label', () => {
    render(<BaseManifestView manifest={manifest} />)
    expect(screen.getByText('node_modules/')).toBeInTheDocument()
    expect(screen.getByText('denylist-директорія')).toBeInTheDocument()
    expect(screen.getByText(/42/)).toBeInTheDocument()
  })

  it('renders totals', () => {
    render(<BaseManifestView manifest={manifest} />)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Включено (3)')).toBeInTheDocument()
    expect(screen.getByText('Виключено (1)')).toBeInTheDocument()
  })

  it('handles an empty included list', () => {
    render(
      <BaseManifestView
        manifest={{ ...manifest, included: [], total_files: 1 }}
      />,
    )
    expect(screen.getByText('Немає включених файлів.')).toBeInTheDocument()
  })
})
