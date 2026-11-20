import { describe, expect, it } from 'vitest'
import { literalsOf } from './sourceScan'

// розширюється з кожним пакетом; після останнього — весь граф імпорту src/main.tsx
export const MIGRATED_PANEL_FILES = [
  '/src/components/layout/Header.tsx',
  '/src/pages/LoginPage.tsx',
  '/src/pages/RouteErrorPage.tsx',
  '/src/pages/BillingPage.tsx',
  '/src/pages/CostPage.tsx',
  '/src/pages/HomeworkCostPage.tsx',
  '/src/pages/HistoryPage.tsx',
  '/src/pages/StudentsPage.tsx',
  '/src/components/billing/ReturnToWork.tsx',
  '/src/components/billing/PackagesSection.tsx',
  '/src/components/billing/OutlookReminders.tsx',
  '/src/components/billing/CheckoutNotice.tsx',
  '/src/components/cost/MonthPicker.tsx',
  '/src/components/history/MaterialHistoryRowExpandable.tsx',
  '/src/components/history/MaterialHistoryRow.tsx',
  '/src/components/students/StudentRow.tsx',
  '/src/components/students/ProvisionStudentModal.tsx',
  '/src/components/students/studentErrors.ts',
  '/src/components/students/ResetPasswordModal.tsx',
  '/src/components/students/CoursePickerModal.tsx',
  '/src/components/students/StudentStatusBadge.tsx',
  '/src/components/ui/ContactAdmin.tsx',
  '/src/utils/authorBillingTexts.ts',
  '/src/utils/priceEstimate.ts',
  '/src/utils/contactAdmin.ts',
  '/src/utils/stateVocabulary.ts',
  '/src/utils/relativeTime.ts',
  '/src/utils/formatDuration.ts',
  '/src/utils/formatBytes.ts',
  '/src/components/flow/SummaryModal.tsx',
  '/src/components/flow/NodeDetailPanel.tsx',
  '/src/components/flow/FlowContextMenu.tsx',
  '/src/components/flow/BaseManifestView.tsx',
  '/src/components/flow/ProjectBaseSection.tsx',
  '/src/components/flow/RejectionNotice.tsx',
  '/src/components/flow/baseErrors.ts',
  '/src/components/flow/SummaryBadge.tsx',
  '/src/components/flow/RunStatePanel.tsx',
  '/src/components/flow/ProjectBaseBadge.tsx',
  '/src/components/flow/DocumentStructureBlock.tsx',
  '/src/components/flow/nodes/CourseRootNode.tsx',
  '/src/components/flow/nodes/SectionNode.tsx',
]

const CYRILLIC = /[Ѐ-ӿ]/

describe('the author panel migrated files have no Cyrillic', () => {
  it('no literal in migrated files contains Cyrillic characters', () => {
    const found = MIGRATED_PANEL_FILES.flatMap((file) =>
      literalsOf(file)
        .filter((text) => CYRILLIC.test(text))
        .map((text) => `${file}: ${text}`),
    )
    expect(found).toEqual([])
  })
})
