Г-23 · Англійська панель за екранами · Від: хмара · Для: сесія «Гайд»

# Англійська панель автора: огляд текстів за екранами

- Основа: `origin/main` = `1b83372a19b91c5118889e40412caabd5938df42` (`1b83372 Merge pull request #98 from KonstZiv/antigravity/criteria-a4-reset`).
- Лише читання коду й каталогів; змінено тільки цей файл. Каталоги: `src/i18n/catalogs/en/{panel,shared}.json` проти `uk/{panel,shared}.json`.
- Переглянуто ключів: **788** (`panel.*` без `panel.criteria.*`: 715; `shared.*`: 73). `panel.criteria.*` (107 ключів) не перевіряв, за завданням.
- Екранів: **12**. Правок у зведеному списку: **108** (за пріоритетом: 14 — 1, 64 — 2, 30 — 3).

**Як читати.** Клас правки: `Х` — слово, якого уникаємо; `Н` — залежить від ще не погодженої назви поняття (assignment, starter archive, Homework review, deduct / used, added, pass mark, section, material, core concepts); `Т` — різні слова для одного поняття; `Г` — граматика, порядок слів, неприродна англійська; `Д` — довжина / ризик переносу; `С` — розділові знаки. Пріоритет: 1 — виправити обов’язково, 2 — бажано, 3 — дрібниця. Позначка **Н** у «Назва» — правка спирається на непогоджену назву (без неї не застосовувати); **Q** — залежить від відповіді на питання внизу.

**Метод.** (1) Автоперевірка en проти uk для всіх 788 ключів: заповнювачі `{…}` і теги, ICU-множини (`one`/`other`), числа, слова, яких уникаємо. (2) Карта «ключ → місце в коді» за літералами `panel.*`/`shared.*` у `src/**` без тестів; для кожного ключа знайдено виклик, досяжний із `src/main.tsx`. (3) Читання кожної пари en/uk окремо. Колонка «Вигляд» нижче виведена з назви ключа й місця виклику (кнопка, заголовок, підказка тощо); для спірних ключів (згода, підпис матеріалу, лічильник прогресу, «Expected:» та ін.) місце виклику відкривав у коді; решта «вигляд» — припущення за назвою. Зображення екранів не зібрано — висновок про перенос рядків ґрунтується на довжині в знаках.

**Автоперевірка, результат.** Заповнювачі й теги збігаються в усіх ключах (єдине розходження автоматики — `moveQuestion` / `moveOption`: ключові слова гілок `select`, помилкове спрацювання). Числа в тексті збігаються. Усі 22 англійські множини мають `one` і `other`; числа без множини — лише там, де англійська її не потребує («Included ({count})», «Question {number}», «{n} MB»). Розбіжність множин між мовами — один ключ: `panel.confirmRoles.removedLine` (в **uk** немає ICU-множини, див. «Питання», п. 9). Слова, яких уникаємо, — у 4 ключах (нижче).

---

## Екрани

### 1. Вхід

Файли: src/pages/LoginPage.tsx; шапка й підвал — `SiteHeader`/`SiteFooter`. Ключів: **16**, правок: **0**.

- Ключі показано на вході, у шапці сайту (`login.header.*`) і в блоці «Ще не автор?».
- Зміст, порядок слів, заповнювачі й довжини перевірено: зауважень до англійського тексту немає.

Знахідок немає.

<details><summary>Ключі екрана (16): де в коді, вигляд</summary>

| Ключ | Де в коді | Вигляд |
|---|---|---|
| `panel.login.title` | `src/pages/LoginPage.tsx:74` | заголовок |
| `panel.login.description` | `src/pages/LoginPage.tsx:76` | опис / підзаголовок |
| `panel.login.enterKeyPrompt` | `src/pages/LoginPage.tsx:79` | текст |
| `panel.login.keyLabel` | `src/pages/LoginPage.tsx:85` | підпис / текст посилання |
| `panel.login.submit` | `src/pages/LoginPage.tsx:115` | кнопка |
| `panel.login.browserOnlyNote` | `src/pages/LoginPage.tsx:119` | примітка |
| `panel.login.notAuthorTitle` | `src/pages/LoginPage.tsx:124` | заголовок |
| `panel.login.notAuthorDescription` | `src/pages/LoginPage.tsx:126` | опис / підзаголовок |
| `panel.login.howToBecomeAuthor` | `src/pages/LoginPage.tsx:130` | текст |
| `panel.login.noKeyTitle` | `src/pages/LoginPage.tsx:137` | заголовок |
| `panel.login.studentsNotice` | `src/pages/LoginPage.tsx:143` | примітка |
| `panel.login.error.rejected` | `src/pages/LoginPage.tsx:58` | текст |
| `panel.login.error.server` | `src/pages/LoginPage.tsx:60` | текст |
| `panel.login.error.offline` | `src/pages/LoginPage.tsx:63` | текст |
| `panel.login.header.pricing` | `src/pages/LoginPage.tsx:35` | текст |
| `panel.login.header.docs` | `src/pages/LoginPage.tsx:36` | текст |

</details>

### 2. Список курсів

Файли: src/pages/DashboardPage.tsx. Ключів: **21**, правок: **4**.

- Картка курсу і вікно «New course»; лічильники — ICU `one/other`, правильні.
- Слово «node/nodes» на картці статистики — див. п. про «section»; «document» у лічильнику — п. про «material».

Знахідки (повний текст «було → стає» — у зведеному списку):

- **№1** `panel.dashboard.statsNodes` — [Н·Н, пріор. 2] «nodes» → «sections»: на цьому ж екрані картка курсу рахує «sections»; автор бачить розділи, а не вузли.
- **№2** `panel.dashboard.documentsCount` — [Н·Н, пріор. 2] «document» → «material»: так названо матеріал на всіх інших екранах (історія, витрати, завантаження).
- **№3** `panel.dashboard.courseDescPlaceholder` — [С, пріор. 3] Три крапки «...» замість «…» — в інших рядках скрізь «…» (виняток — URL-зразок у `detail.linkPlaceholder`).
- **№4** `panel.dashboard.courseLanguageHint` — [Г, пріор. 3] «STT» — скорочення без розшифрування.

<details><summary>Ключі екрана (21): де в коді, вигляд</summary>

| Ключ | Де в коді | Вигляд |
|---|---|---|
| `panel.dashboard.title` | `src/pages/DashboardPage.tsx:82` | заголовок |
| `panel.dashboard.subtitleCount` | `src/pages/DashboardPage.tsx:85` | лічильник |
| `panel.dashboard.subtitleEmpty` | `src/pages/DashboardPage.tsx:86` | порожній стан |
| `panel.dashboard.newCourse` | `src/pages/DashboardPage.tsx:91` | кнопка |
| `panel.dashboard.statsCourses` | `src/pages/DashboardPage.tsx:100` | текст |
| `panel.dashboard.statsNodes` | `src/pages/DashboardPage.tsx:106` | текст |
| `panel.dashboard.emptyTitle` | `src/pages/DashboardPage.tsx:117` | порожній стан |
| `panel.dashboard.emptyDescription` | `src/pages/DashboardPage.tsx:118` | порожній стан |
| `panel.dashboard.createFirstCourse` | `src/pages/DashboardPage.tsx:122` | кнопка |
| `panel.dashboard.sectionsCount` | `src/pages/DashboardPage.tsx:160` | лічильник |
| `panel.dashboard.documentsCount` | `src/pages/DashboardPage.tsx:164` | лічильник |
| `panel.dashboard.modalTitle` | `src/pages/DashboardPage.tsx:175` | заголовок |
| `panel.dashboard.courseTitleLabel` | `src/pages/DashboardPage.tsx:178` | підпис / текст посилання |
| `panel.dashboard.courseTitlePlaceholder` | `src/pages/DashboardPage.tsx:181` | заповнювач поля |
| `panel.dashboard.courseDescLabel` | `src/pages/DashboardPage.tsx:190` | підпис / текст посилання |
| `panel.dashboard.optionalLabel` | `src/pages/DashboardPage.tsx:190` | підпис / текст посилання |
| `panel.dashboard.courseDescPlaceholder` | `src/pages/DashboardPage.tsx:194` | заповнювач поля |
| `panel.dashboard.courseLanguageLabel` | `src/pages/DashboardPage.tsx:201` | підпис / текст посилання |
| `panel.dashboard.courseLanguageHint` | `src/pages/DashboardPage.tsx:207` | підказка |
| `panel.dashboard.cancel` | `src/pages/DashboardPage.tsx:211` | кнопка |
| `panel.dashboard.create` | `src/pages/DashboardPage.tsx:219` | кнопка |

</details>

### 3. Дерево курсу і панель вузла

Файли: src/pages/CoursePage.tsx, src/components/flow/* (полотно, контекстне меню, `NodeDetailPanel`, базовий архів). Ключів: **103**, правок: **12**.

- Найбільший екран (полотно, контекстне меню, панель вузла, базовий архів, маніфест).
- Базовий архів в англійському тексті скрізь названо «starter archive» — узгоджено з пропонованою назвою.
- Різні слова для одного: «node» (у тексті для автора) і «section/subsection»; «document» і «material»; «service folder» замість «system folder».

Знахідки (повний текст «було → стає» — у зведеному списку):

- **№5** `panel.flow.courseRootNode.documentsCount` — [Н·Н, пріор. 2] «document» → «material».
- **№6** `panel.flow.projectBaseBadge.pending` — [Т·Н, пріор. 2] «Normalising» — жаргон; та сама дія названа «Project preparation» у `panel.state.kind.baseNormalize`.
- **№7** `panel.flow.projectBase.reuploadWarning` — [Г, пріор. 3] Одн./мн. узгодити з «Existing student submissions».
- **№8** `panel.flow.projectBase.viewManifestHint` — [Т·Н, пріор. 2] «normalised» → «prepared» (див. вище).
- **№9** `panel.flow.manifest.reason.denylistDir` — [Г, пріор. 2] «service folder» — калька з «службова тека»; англійською — «system folder».
- **№10** `panel.flow.contextMenu.generateSummary` — [Д, пріор. 3] Пункт меню: без артикля коротше (24 проти 16 знаків).
- **№11** `panel.flow.contextMenu.processNotice.refusedItem` — [С, пріор. 3] Два довгі тире в одному короткому рядку.
- **№12** `panel.flow.contextMenu.addChild.placeholder` — [Т, пріор. 3] Заголовок вікна «New subsection», а поле — «Section name».
- **№13** `panel.flow.contextMenu.renameModal.doneHint` — [Н·Н, пріор. 2] «node» → «section».
- **№14** `panel.flow.detail.noDocuments` — [Н·Н, пріор. 2] «documents» → «materials».
- **№15** `panel.course.backToCourses` — [Д, пріор. 3] Кнопка: 23 знаки проти 16 в uk.
- **№16** `panel.course.changeLanguage` — [Д, пріор. 3] Кнопка: 26 проти 18.

<details><summary>Ключі екрана (103): де в коді, вигляд</summary>

| Ключ | Де в коді | Вигляд |
|---|---|---|
| `panel.flow.sectionNode.subsectionsCount` | `src/components/flow/nodes/SectionNode.tsx:111` | лічильник |
| `panel.flow.courseRootNode.sectionsCount` | `src/components/flow/nodes/CourseRootNode.tsx:59` | лічильник |
| `panel.flow.courseRootNode.documentsCount` | `src/components/flow/nodes/CourseRootNode.tsx:63` | лічильник |
| `panel.flow.structure.filesCount` | `src/components/flow/DocumentStructureBlock.tsx:57` | лічильник |
| `panel.flow.structure.excludedTitle` | `src/components/flow/DocumentStructureBlock.tsx:121` | заголовок |
| `panel.flow.structure.descriptionOnlyTitle` | `src/components/flow/DocumentStructureBlock.tsx:125` | заголовок |
| `panel.flow.projectBaseBadge.pending` | `src/components/flow/ProjectBaseBadge.tsx:12` | текст |
| `panel.flow.projectBaseBadge.ready` | `src/components/flow/ProjectBaseBadge.tsx:15` | текст |
| `panel.flow.projectBaseBadge.failed` | `src/components/flow/ProjectBaseBadge.tsx:16` | повідомлення про помилку |
| `panel.flow.baseError.versionConflict` | `src/components/flow/baseErrors.ts:43` | повідомлення про помилку |
| `panel.flow.baseError.uploadTooLarge` | `src/components/flow/baseErrors.ts:46` | повідомлення про помилку |
| `panel.flow.baseError.notAProjectTask` | `src/components/flow/baseErrors.ts:49` | повідомлення про помилку |
| `panel.flow.baseError.notAnArchive` | `src/components/flow/baseErrors.ts:52` | повідомлення про помилку |
| `panel.flow.baseError.generic` | `src/components/flow/baseErrors.ts:59` | повідомлення про помилку |
| `panel.flow.projectBase.reuploadWarning` | `src/components/flow/ProjectBaseSection.tsx:224` | текст |
| `panel.flow.projectBase.loadStateFailed` | `src/components/flow/ProjectBaseSection.tsx:61` | повідомлення про помилку |
| `panel.flow.projectBase.loadManifestFailed` | `src/components/flow/ProjectBaseSection.tsx:125` | повідомлення про помилку |
| `panel.flow.projectBase.loadingState` | `src/components/flow/ProjectBaseSection.tsx:163` | текст |
| `panel.flow.projectBase.noBaseAttached` | `src/components/flow/ProjectBaseSection.tsx:168` | порожній стан |
| `panel.flow.projectBase.uploading` | `src/components/flow/ProjectBaseSection.tsx:177`<br>`src/components/flow/ProjectBaseSection.tsx:210` | текст |
| `panel.flow.projectBase.attachBase` | `src/components/flow/ProjectBaseSection.tsx:177` | кнопка |
| `panel.flow.projectBase.version` | `src/components/flow/ProjectBaseSection.tsx:185` | текст |
| `panel.flow.projectBase.viewManifestHint` | `src/components/flow/ProjectBaseSection.tsx:194` | підказка |
| `panel.flow.projectBase.manifestButton` | `src/components/flow/ProjectBaseSection.tsx:197` | кнопка |
| `panel.flow.projectBase.uploadNewVersionHint` | `src/components/flow/ProjectBaseSection.tsx:207` | підказка |
| `panel.flow.projectBase.reuploadButton` | `src/components/flow/ProjectBaseSection.tsx:210` | кнопка |
| `panel.flow.projectBase.manifestModalTitle` | `src/components/flow/ProjectBaseSection.tsx:235` | заголовок |
| `panel.flow.projectBase.loadingManifest` | `src/components/flow/ProjectBaseSection.tsx:243` | текст |
| `panel.flow.manifest.cls.text` | `src/components/flow/BaseManifestView.tsx:22` | текст |
| `panel.flow.manifest.cls.document` | `src/components/flow/BaseManifestView.tsx:23` | текст |
| `panel.flow.manifest.cls.binary` | `src/components/flow/BaseManifestView.tsx:24` | текст |
| `panel.flow.manifest.reason.denylistDir` | `src/components/flow/BaseManifestView.tsx:28` | текст |
| `panel.flow.manifest.reason.magicMismatch` | `src/components/flow/BaseManifestView.tsx:29` | текст |
| `panel.flow.manifest.reason.nestedArchive` | `src/components/flow/BaseManifestView.tsx:30` | текст |
| `panel.flow.manifest.reason.mayContainSecrets` | `src/components/flow/BaseManifestView.tsx:31` | текст |
| `panel.flow.manifest.totalFiles` | `src/components/flow/BaseManifestView.tsx:103` | текст |
| `panel.flow.manifest.fingerprint` | `src/components/flow/BaseManifestView.tsx:114` | текст |
| `panel.flow.manifest.included` | `src/components/flow/BaseManifestView.tsx:120` | текст |
| `panel.flow.manifest.noIncludedFiles` | `src/components/flow/BaseManifestView.tsx:123` | порожній стан |
| `panel.flow.manifest.excluded` | `src/components/flow/BaseManifestView.tsx:132` | текст |
| `panel.flow.manifest.noReasonGiven` | `src/components/flow/BaseManifestView.tsx:142` | порожній стан |
| `panel.flow.pipeline.processTitle` | `src/components/flow/FlowContextMenu.tsx:375` | заголовок |
| `panel.flow.pipeline.processDescription` | `src/components/flow/FlowContextMenu.tsx:376` | опис / підзаголовок |
| `panel.flow.contextMenu.renameFailed` | `src/components/flow/FlowContextMenu.tsx:176` | повідомлення про помилку |
| `panel.flow.contextMenu.deleteConfirm` | `src/components/flow/FlowContextMenu.tsx:194` | текст |
| `panel.flow.contextMenu.addSubfolder` | `src/components/flow/FlowContextMenu.tsx:385` | текст |
| `panel.flow.contextMenu.uploadMaterial` | `src/components/flow/FlowContextMenu.tsx:386` | текст |
| `panel.flow.contextMenu.newTest` | `src/components/flow/FlowContextMenu.tsx:387` | кнопка |
| `panel.flow.contextMenu.processMaterials` | `src/components/flow/FlowContextMenu.tsx:391`<br>`src/components/flow/FlowContextMenu.tsx:549` | текст |
| `panel.flow.contextMenu.layer12` | `src/components/flow/FlowContextMenu.tsx:392` | текст |
| `panel.flow.contextMenu.generateSummary` | `src/components/flow/FlowContextMenu.tsx:400` | текст |
| `panel.flow.contextMenu.layer3` | `src/components/flow/FlowContextMenu.tsx:401` | текст |
| `panel.flow.contextMenu.rename` | `src/components/flow/FlowContextMenu.tsx:409`<br>`src/components/flow/FlowContextMenu.tsx:617` | кнопка |
| `panel.flow.contextMenu.delete` | `src/components/flow/FlowContextMenu.tsx:413` | кнопка |
| `panel.flow.contextMenu.moreDetails` | `src/components/flow/FlowContextMenu.tsx:491` | кнопка |
| `panel.flow.contextMenu.gotIt` | `src/components/flow/FlowContextMenu.tsx:537`<br>`src/components/flow/FlowContextMenu.tsx:590`<br>`src/components/flow/FlowContextMenu.tsx:625` | кнопка |
| `panel.flow.contextMenu.processNotice.refusedTitle` | `src/components/flow/FlowContextMenu.tsx:548` | повідомлення про помилку |
| `panel.flow.contextMenu.processNotice.refusedItem` | `src/components/flow/FlowContextMenu.tsx:561` | повідомлення про помилку |
| `panel.flow.contextMenu.processNotice.nothingFailed` | `src/components/flow/FlowContextMenu.tsx:567` | повідомлення про помилку |
| `panel.flow.contextMenu.cancel` | `src/components/flow/FlowContextMenu.tsx:573`<br>`src/components/flow/FlowContextMenu.tsx:608`<br>`src/components/flow/FlowContextMenu.tsx:658` | кнопка |
| `panel.flow.contextMenu.process` | `src/components/flow/FlowContextMenu.tsx:584` | кнопка |
| `panel.flow.contextMenu.addChild.title` | `src/components/flow/FlowContextMenu.tsx:597` | заголовок |
| `panel.flow.contextMenu.addChild.placeholder` | `src/components/flow/FlowContextMenu.tsx:600` | заповнювач поля |
| `panel.flow.contextMenu.addChild.submit` | `src/components/flow/FlowContextMenu.tsx:611` | кнопка |
| `panel.flow.contextMenu.renameModal.doneHint` | `src/components/flow/FlowContextMenu.tsx:621` | підказка |
| `panel.flow.contextMenu.renameModal.save` | `src/components/flow/FlowContextMenu.tsx:665` | кнопка |
| `panel.flow.detail.retryForceQuestion` | `src/components/flow/NodeDetailPanel.tsx:90` | текст |
| `panel.flow.detail.retryQuestion` | `src/components/flow/NodeDetailPanel.tsx:91` | текст |
| `panel.flow.detail.addLinkFailed` | `src/components/flow/NodeDetailPanel.tsx:264` | повідомлення про помилку |
| `panel.flow.detail.hideTestQuestion` | `src/components/flow/NodeDetailPanel.tsx:304` | текст |
| `panel.flow.detail.deleteMaterialQuestion` | `src/components/flow/NodeDetailPanel.tsx:305` | текст |
| `panel.flow.detail.hideTestFailed` | `src/components/flow/NodeDetailPanel.tsx:313` | повідомлення про помилку |
| `panel.flow.detail.deleteMaterialFailed` | `src/components/flow/NodeDetailPanel.tsx:314` | повідомлення про помилку |
| `panel.flow.detail.startProcessingFailed` | `src/components/flow/NodeDetailPanel.tsx:332` | повідомлення про помилку |
| `panel.flow.detail.openSummary` | `src/components/flow/NodeDetailPanel.tsx:409` | текст |
| `panel.flow.detail.dropActive` | `src/components/flow/NodeDetailPanel.tsx:440` | текст |
| `panel.flow.detail.dropPrompt` | `src/components/flow/NodeDetailPanel.tsx:445` | текст |
| `panel.flow.detail.linkPlaceholder` | `src/components/flow/NodeDetailPanel.tsx:477` | заповнювач поля |
| `panel.flow.detail.addLink` | `src/components/flow/NodeDetailPanel.tsx:489` | кнопка |
| `panel.flow.detail.newTest` | `src/components/flow/NodeDetailPanel.tsx:501` | кнопка |
| `panel.flow.detail.closeError` | `src/components/flow/NodeDetailPanel.tsx:530` | повідомлення про помилку |
| `panel.flow.detail.noDocuments` | `src/components/flow/NodeDetailPanel.tsx:544` | порожній стан |
| `panel.flow.detail.toggleRoleHint` | `src/components/flow/NodeDetailPanel.tsx:601` | підказка |
| `panel.flow.detail.roleMethodological` | `src/components/flow/NodeDetailPanel.tsx:603` | текст |
| `panel.flow.detail.roleEducational` | `src/components/flow/NodeDetailPanel.tsx:603` | текст |
| `panel.flow.detail.openTestHint` | `src/components/flow/NodeDetailPanel.tsx:613` | підказка |
| `panel.flow.detail.openTest` | `src/components/flow/NodeDetailPanel.tsx:615`<br>`src/pages/CriteriaEditorPage.tsx:527` | кнопка |
| `panel.flow.detail.confirmRolesHint` | `src/components/flow/NodeDetailPanel.tsx:638` | підказка |
| `panel.flow.detail.confirmRoles` | `src/components/flow/NodeDetailPanel.tsx:640` | кнопка |
| `panel.flow.detail.retryProcessingHint` | `src/components/flow/NodeDetailPanel.tsx:694` | підказка |
| `panel.flow.detail.retryProcessingForceHint` | `src/components/flow/NodeDetailPanel.tsx:695` | підказка |
| `panel.flow.detail.hideTestHint` | `src/components/flow/NodeDetailPanel.tsx:708` | підказка |
| `panel.flow.detail.deleteMaterialHint` | `src/components/flow/NodeDetailPanel.tsx:708` | підказка |
| `panel.flow.detail.retryModalTitle` | `src/components/flow/NodeDetailPanel.tsx:729` | заголовок |
| `panel.flow.detail.retryModalCancel` | `src/components/flow/NodeDetailPanel.tsx:742` | текст |
| `panel.flow.detail.retryModalConfirm` | `src/components/flow/NodeDetailPanel.tsx:752` | текст |
| `panel.course.loadFailed` | `src/pages/CoursePage.tsx:159` | повідомлення про помилку |
| `panel.course.errorTitle` | `src/pages/CoursePage.tsx:181` | повідомлення про помилку |
| `panel.course.backToCourses` | `src/pages/CoursePage.tsx:185`<br>`src/pages/CoursePage.tsx:205` | текст |
| `panel.course.autoDetect` | `src/pages/CoursePage.tsx:223` | кнопка |
| `panel.course.save` | `src/pages/CoursePage.tsx:231` | кнопка |
| `panel.course.cancel` | `src/pages/CoursePage.tsx:243` | кнопка |
| `panel.course.changeLanguage` | `src/pages/CoursePage.tsx:253` | текст |

</details>

### 4. Завантаження матеріалів

Файли: src/components/ui/UploadConfirmDialog.tsx, src/components/activity/Upload*View.tsx, src/pages/ConfirmRolesPage.tsx, src/utils/ingestErrors.ts. Ключів: **109**, правок: **26**.

- Діалог завантаження, прогрес і помилки завантаження, помилки обробки, екран «File roles», довідка «Why this?».
- Тип матеріалу названо то «document type», то «role» (`flow.detail.toggleRoleHint` каже «type», `roleMethodological` — «role»): лишено «type» — так само в uk; назви ключів (`role…`) внутрішні.
- Без правки, ризик переносу (мітка / вибір): `panel.fileRoles.role.structureOnly` (26 знаків проти 19 в uk), `panel.confirmRoles.setFolderRoleLabel` (25 проти 17).

Знахідки (повний текст «було → стає» — у зведеному списку):

- **№17** `panel.ingestErrors.emptyDocument` — [Г·Н, пріор. 1] «extractable» (калька з «видобувного») неприродне; «document» → «material».
- **№18** `panel.ingestErrors.presentationEmptySegment` — [Г, пріор. 2] «extractable» і «segmented» — жаргон.
- **№19** `panel.ingestErrors.insufficientUnits` — [Г, пріор. 3] «there were not enough units for it» — безособово й незграбно.
- **№20** `panel.rolesIntro.paragraph2` — [Г, пріор. 3] «without need» — калька.
- **№21** `panel.rolesIntro.strategy1` — [Г, пріор. 2] те саме.
- **№22** `panel.rolesIntro.strategy3` — [Н·Н, пріор. 2] «main concept» → «core concept».
- **№23** `panel.rolesIntro.strategy4` — [Г, пріор. 1] Порядок слів «mark as not essential to the topic the … files» — дієслово відірване від додатка.
- **№24** `panel.rolesIntro.ackLabel` — [Г, пріор. 2] «I have read it, got it» — розмовне для підпису прапорця.
- **№25** `panel.codeStructure.denylistDir` — [Г, пріор. 2] те саме.
- **№26** `panel.codeStructure.denylistFile` — [Г, пріор. 2] те саме; «of the system» — незрозуміло, якої.
- **№27** `panel.codeStructure.oversize` — [Г, пріор. 2] «not taken for reading» — калька.
- **№28** `panel.codeStructure.oversizeDetail` — [Г, пріор. 3] «against a limit of» — юридичний зворот; і довше за uk (56 проти 38).
- **№29** `panel.upload.dialog.title` — [Н·Н, пріор. 2] «Document type» → «Material type».
- **№30** `panel.upload.dialog.choosePrompt` — [Н·Н, пріор. 2] «document» → «material».
- **№31** `panel.upload.role.methodologicalDesc` — [Д, пріор. 3] Опис варіанта: 35 проти 21.
- **№32** `panel.upload.taskType.prompt` — [Н·Н, пріор. 2] «document» → «material».
- **№33** `panel.upload.code.label` — [Д, пріор. 3] Підпис прапорця: 23 проти 15.
- **№34** `panel.upload.code.desc` — [Г, пріор. 3] «differ only by» → «differ only in».
- **№35** `panel.upload.note.testRefused` — [Т, пріор. 3] «another kind of assignment» — у діалозі це «type».
- **№36** `panel.upload.note.codeActive` — [Г, пріор. 2] те саме; «Typical» → «Standard».
- **№37** `panel.fileRoles.reason.denylistDir` — [Г, пріор. 2] те саме.
- **№38** `panel.fileRoles.reason.denylistFile` — [Г, пріор. 2] те саме.
- **№39** `panel.confirmRoles.noProposal` — [Н·Н, пріор. 2] «document» → «material».
- **№40** `panel.confirmRoles.loadFailed` — [Н·Н, пріор. 2] «document» → «material».
- **№41** `panel.confirmRoles.saveIncomplete` — [Г, пріор. 2] «The marking … an extra path» — жаргон («розмітка», «шлях»).
- **№42** `panel.confirmRoles.removedLine` — [Г, пріор. 1] «security or service folders» — незрозуміло, що саме; «service» → «system». Також: в uk тут немає ICU-множини (див. «Питання», п. 9).

<details><summary>Ключі екрана (109): де в коді, вигляд</summary>

| Ключ | Де в коді | Вигляд |
|---|---|---|
| `panel.ingestErrors.pipelineFailure` | `src/utils/ingestErrors.ts:27`<br>`src/utils/ingestErrors.ts:59` | повідомлення про помилку обробки |
| `panel.ingestErrors.emptyDocument` | `src/utils/ingestErrors.ts:23` | повідомлення про помилку обробки |
| `panel.ingestErrors.presentationEmptySegment` | `src/utils/ingestErrors.ts:24` | повідомлення про помилку обробки |
| `panel.ingestErrors.stage2Rejected` | `src/utils/ingestErrors.ts:25` | повідомлення про помилку обробки |
| `panel.ingestErrors.externalSourceUnavailable` | `src/utils/ingestErrors.ts:26` | повідомлення про помилку обробки |
| `panel.ingestErrors.suspiciousUnicode` | `src/utils/ingestErrors.ts:29` | повідомлення про помилку обробки |
| `panel.ingestErrors.charsetViolation` | `src/utils/ingestErrors.ts:30` | повідомлення про помилку обробки |
| `panel.ingestErrors.sizeLimit` | `src/utils/ingestErrors.ts:31` | повідомлення про помилку обробки |
| `panel.ingestErrors.forbiddenType` | `src/utils/ingestErrors.ts:32` | повідомлення про помилку обробки |
| `panel.ingestErrors.promptInjection` | `src/utils/ingestErrors.ts:33` | повідомлення про помилку обробки |
| `panel.ingestErrors.magicMismatch` | `src/utils/ingestErrors.ts:34` | повідомлення про помилку обробки |
| `panel.ingestErrors.archiveViolation` | `src/utils/ingestErrors.ts:36` | повідомлення про помилку обробки |
| `panel.ingestErrors.archiveBomb` | `src/utils/ingestErrors.ts:37` | повідомлення про помилку обробки |
| `panel.ingestErrors.symlinkViolation` | `src/utils/ingestErrors.ts:38` | повідомлення про помилку обробки |
| `panel.ingestErrors.slideCountLimit` | `src/utils/ingestErrors.ts:39` | повідомлення про помилку обробки |
| `panel.ingestErrors.insufficientUnits` | `src/utils/ingestErrors.ts:42` | повідомлення про помилку обробки |
| `panel.rolesIntro.screenLead1` | `src/components/ui/rolesIntro.ts:18` | текст |
| `panel.rolesIntro.screenLead2` | `src/components/ui/rolesIntro.ts:19` | текст |
| `panel.rolesIntro.title` | `src/components/ui/rolesIntro.ts:21` | заголовок |
| `panel.rolesIntro.paragraph1` | `src/components/ui/rolesIntro.ts:23` | текст |
| `panel.rolesIntro.paragraph2` | `src/components/ui/rolesIntro.ts:24` | текст |
| `panel.rolesIntro.important` | `src/components/ui/rolesIntro.ts:26` | текст |
| `panel.rolesIntro.strategyHeading` | `src/components/ui/rolesIntro.ts:27` | заголовок |
| `panel.rolesIntro.strategy1` | `src/components/ui/rolesIntro.ts:29` | текст |
| `panel.rolesIntro.strategy2` | `src/components/ui/rolesIntro.ts:30` | текст |
| `panel.rolesIntro.strategy3` | `src/components/ui/rolesIntro.ts:31` | текст |
| `panel.rolesIntro.strategy4` | `src/components/ui/rolesIntro.ts:32` | текст |
| `panel.rolesIntro.ackLabel` | `src/components/ui/rolesIntro.ts:34` | підпис / текст посилання |
| `panel.rolesIntro.closeLabel` | `src/components/ui/rolesIntro.ts:35` | підпис / текст посилання |
| `panel.codeStructure.denylistDir` | `src/utils/codeStructureReasons.ts:23` | причина у списку файлів |
| `panel.codeStructure.denylistFile` | `src/utils/codeStructureReasons.ts:24` | причина у списку файлів |
| `panel.codeStructure.nonCodeType` | `src/utils/codeStructureReasons.ts:25` | причина у списку файлів |
| `panel.codeStructure.magicMismatch` | `src/utils/codeStructureReasons.ts:26` | причина у списку файлів |
| `panel.codeStructure.nestedArchive` | `src/utils/codeStructureReasons.ts:27` | причина у списку файлів |
| `panel.codeStructure.charsetViolation` | `src/utils/codeStructureReasons.ts:28` | причина у списку файлів |
| `panel.codeStructure.vendoredDir` | `src/utils/codeStructureReasons.ts:29` | причина у списку файлів |
| `panel.codeStructure.lockfile` | `src/utils/codeStructureReasons.ts:30` | причина у списку файлів |
| `panel.codeStructure.generatedArtifact` | `src/utils/codeStructureReasons.ts:31` | причина у списку файлів |
| `panel.codeStructure.oversize` | `src/utils/codeStructureReasons.ts:32` | причина у списку файлів |
| `panel.codeStructure.oversizeDetail` | `src/utils/codeStructureReasons.ts:68` | причина у списку файлів |
| `panel.codeStructure.buildConfig` | `src/utils/codeStructureReasons.ts:33` | причина у списку файлів |
| `panel.codeStructure.authorStructureOnly` | `src/utils/codeStructureReasons.ts:34` | причина у списку файлів |
| `panel.codeStructure.unknown` | `src/utils/codeStructureReasons.ts:74` | причина у списку файлів |
| `panel.codeStructure.notReadCount` | `src/utils/codeStructureReasons.ts:45` | причина у списку файлів |
| `panel.codeStructure.blockAction` | `src/utils/codeStructureReasons.ts:50` | причина у списку файлів |
| `panel.upload.dialog.title` | `src/components/ui/UploadConfirmDialog.tsx:199` | заголовок |
| `panel.upload.dialog.uploading` | `src/components/ui/UploadConfirmDialog.tsx:201` | текст |
| `panel.upload.dialog.choosePrompt` | `src/components/ui/UploadConfirmDialog.tsx:206` | текст |
| `panel.upload.dialog.filesCount` | `src/components/ui/UploadConfirmDialog.tsx:189` | лічильник |
| `panel.upload.role.educationalTitle` | `src/components/ui/UploadConfirmDialog.tsx:225` | заголовок |
| `panel.upload.role.educationalDesc` | `src/components/ui/UploadConfirmDialog.tsx:227` | опис / підзаголовок |
| `panel.upload.role.methodologicalTitle` | `src/components/ui/UploadConfirmDialog.tsx:245` | заголовок |
| `panel.upload.role.methodologicalDesc` | `src/components/ui/UploadConfirmDialog.tsx:247` | опис / підзаголовок |
| `panel.upload.dialog.testAlwaysEducational` | `src/components/ui/UploadConfirmDialog.tsx:253` | текст |
| `panel.upload.taskType.prompt` | `src/components/ui/UploadConfirmDialog.tsx:259` | текст |
| `panel.upload.taskType.notTask` | `src/components/ui/UploadConfirmDialog.tsx:271` | текст |
| `panel.upload.taskType.test.label` | `src/components/criteriaEditor/CriteriaHeader.tsx:19`<br>`src/components/ui/uploadConfirmMeta.ts:16` | підпис / текст посилання |
| `panel.upload.taskType.test.hint` | `src/components/ui/uploadConfirmMeta.ts:17` | підказка |
| `panel.upload.taskType.shortTask.label` | `src/components/criteriaEditor/CriteriaHeader.tsx:16`<br>`src/components/ui/uploadConfirmMeta.ts:21` | підпис / текст посилання |
| `panel.upload.taskType.shortTask.hint` | `src/components/ui/uploadConfirmMeta.ts:22` | підказка |
| `panel.upload.taskType.task.label` | `src/components/criteriaEditor/CriteriaHeader.tsx:17`<br>`src/components/ui/uploadConfirmMeta.ts:26` | підпис / текст посилання |
| `panel.upload.taskType.task.hint` | `src/components/ui/uploadConfirmMeta.ts:27` | підказка |
| `panel.upload.taskType.project.label` | `src/components/criteriaEditor/CriteriaHeader.tsx:18`<br>`src/components/ui/uploadConfirmMeta.ts:31` | підпис / текст посилання |
| `panel.upload.taskType.project.hint` | `src/components/ui/uploadConfirmMeta.ts:32` | підказка |
| `panel.upload.code.label` | `src/components/ui/UploadConfirmDialog.tsx:300` | підпис / текст посилання |
| `panel.upload.code.desc` | `src/components/ui/UploadConfirmDialog.tsx:302` | опис / підзаголовок |
| `panel.upload.note.testFromYaml` | `src/components/ui/UploadConfirmDialog.tsx:312` | текст |
| `panel.upload.note.testRefused` | `src/components/ui/UploadConfirmDialog.tsx:319` | повідомлення про помилку |
| `panel.upload.note.codeActive` | `src/components/ui/UploadConfirmDialog.tsx:324` | текст |
| `panel.upload.dialog.cancel` | `src/components/ui/UploadConfirmDialog.tsx:337` | кнопка |
| `panel.upload.dialog.confirm` | `src/components/ui/UploadConfirmDialog.tsx:345` | кнопка |
| `panel.upload.validation.presentationTooLarge` | `src/utils/uploadValidation.ts:117` | повідомлення про помилку |
| `panel.upload.validation.videoTooLarge` | `src/utils/uploadValidation.ts:127` | повідомлення про помилку |
| `panel.upload.validation.audioTooLong` | `src/utils/uploadValidation.ts:158` | повідомлення про помилку |
| `panel.upload.validation.videoTooLong` | `src/utils/uploadValidation.ts:165` | повідомлення про помилку |
| `panel.upload.sendFailed` | `src/hooks/useUploadBatch.ts:109` | повідомлення про помилку |
| `panel.upload.progress.sendingFile` | `src/components/activity/UploadProgressView.tsx:18` | текст |
| `panel.upload.progress.serverReceiving` | `src/components/activity/UploadProgressView.tsx:26` | текст |
| `panel.upload.progress.sending` | `src/components/activity/UploadProgressView.tsx:37` | текст |
| `panel.upload.failures.heading` | `src/components/activity/UploadFailuresView.tsx:43` | заголовок |
| `panel.upload.failures.close` | `src/components/activity/UploadFailuresView.tsx:70` | кнопка |
| `panel.fileRoles.role.full` | `src/utils/fileRoles.ts:8`<br>`src/utils/fileRoles.ts:15` | текст |
| `panel.fileRoles.role.auxiliary` | `src/utils/fileRoles.ts:9`<br>`src/utils/fileRoles.ts:16` | текст |
| `panel.fileRoles.role.structureOnly` | `src/utils/fileRoles.ts:10`<br>`src/utils/fileRoles.ts:17` | текст |
| `panel.fileRoles.reason.customSource` | `src/utils/fileRoles.ts:31` | причина у списку файлів |
| `panel.fileRoles.reason.buildConfig` | `src/utils/fileRoles.ts:32` | причина у списку файлів |
| `panel.fileRoles.reason.authorStructureOnly` | `src/utils/fileRoles.ts:33` | причина у списку файлів |
| `panel.fileRoles.reason.lockfile` | `src/utils/fileRoles.ts:34` | причина у списку файлів |
| `panel.fileRoles.reason.vendoredDir` | `src/utils/fileRoles.ts:35` | причина у списку файлів |
| `panel.fileRoles.reason.generatedArtifact` | `src/utils/fileRoles.ts:36` | причина у списку файлів |
| `panel.fileRoles.reason.oversize` | `src/utils/fileRoles.ts:37` | причина у списку файлів |
| `panel.fileRoles.reason.denylistDir` | `src/utils/fileRoles.ts:38` | причина у списку файлів |
| `panel.fileRoles.reason.denylistFile` | `src/utils/fileRoles.ts:39` | причина у списку файлів |
| `panel.fileRoles.reason.nonCodeType` | `src/utils/fileRoles.ts:40` | причина у списку файлів |
| `panel.fileRoles.reason.magicMismatch` | `src/utils/fileRoles.ts:41` | причина у списку файлів |
| `panel.fileRoles.reason.nestedArchive` | `src/utils/fileRoles.ts:42` | причина у списку файлів |
| `panel.confirmRoles.noProposal` | `src/pages/ConfirmRolesPage.tsx:88` | порожній стан |
| `panel.confirmRoles.loadFailed` | `src/pages/ConfirmRolesPage.tsx:97` | повідомлення про помилку |
| `panel.confirmRoles.staleNotice` | `src/pages/ConfirmRolesPage.tsx:137` | примітка |
| `panel.confirmRoles.saveIncomplete` | `src/pages/ConfirmRolesPage.tsx:139` | повідомлення про помилку |
| `panel.confirmRoles.saveFailed` | `src/pages/ConfirmRolesPage.tsx:141` | повідомлення про помилку |
| `panel.confirmRoles.proposalMissing` | `src/pages/ConfirmRolesPage.tsx:161` | текст |
| `panel.confirmRoles.title` | `src/pages/ConfirmRolesPage.tsx:180` | заголовок |
| `panel.confirmRoles.whyThis` | `src/pages/ConfirmRolesPage.tsx:187` | текст |
| `panel.confirmRoles.removedLine` | `src/pages/ConfirmRolesPage.tsx:205` | текст |
| `panel.confirmRoles.setFolderRoleLabel` | `src/pages/ConfirmRolesPage.tsx:221` | підпис / текст посилання |
| `panel.confirmRoles.folderAriaLabel` | `src/pages/ConfirmRolesPage.tsx:223` | aria-мітка |
| `panel.confirmRoles.fileAriaLabel` | `src/pages/ConfirmRolesPage.tsx:260` | aria-мітка |
| `panel.confirmRoles.submit` | `src/pages/ConfirmRolesPage.tsx:297` | кнопка |

</details>

### 5. Опис вузла

Файли: src/components/flow/SummaryModal.tsx, SummaryBadge.tsx, RunStatePanel.tsx, RejectionNotice.tsx; меню — `FlowContextMenu`. Ключів: **59**, правок: **15**.

- Вікно опису вузла («Node description — {title}»: поля, порівняння з попередньою версією, «Approve» / «Accept generated»), бейдж «Draft / Approved», картка стану праворуч унизу, повідомлення про застарілі вузли.
- Слова «Raw», «force» і «NodeSummary» лишилися у видимих текстах — див. питання 5.

Знахідки (повний текст «було → стає» — у зведеному списку):

- **№43** `panel.flow.summaryBadge.materialsChangedHint` — [Н·Н, пріор. 2] «node» → «section».
- **№44** `panel.flow.rejectionNotice.description` — [Н·Н, пріор. 2] «nodes outside the subtree» → «sections outside this branch»; «review them» повторює «Go to them»; «with a forced run» → кнопка «Generate anyway».
- **№45** `panel.flow.rejectionNotice.goToNode` — [Н·Н, пріор. 2] «node» → «section».
- **№46** `panel.flow.rejectionNotice.generateForce` — [Г·Н, пріор. 2] «with force» — жаргон (uk лишає латиницею); кнопка запускає генерацію попри застарілі розділи. «force» у `retryProcessingForceHint` лишено — питання 5.
- **№47** `panel.flow.pipeline.generateTitle` — [Н·Н, пріор. 2] «Node» → «Section»; внутрішня назва «NodeSummary» у дужках — див. питання 5.
- **№48** `panel.flow.pipeline.generateDescription` — [Н·Н, пріор. 2] «node/nodes» → «section/subsection»; «fresh» → «up to date».
- **№49** `panel.flow.summary.notYetGenerated` — [Н·Н, пріор. 2] «node» → «section».
- **№50** `panel.flow.summary.nodeNotFound` — [Н·Н, пріор. 2] «node» → «section».
- **№51** `panel.flow.summary.modalTitle` — [Н·Н, пріор. 2] «Node» → «Section». Назву вікна цитують тексти критеріїв (див. питання 2).
- **№52** `panel.flow.summary.acceptRawHint` — [Г, пріор. 3] «(Raw)» — внутрішній термін; «Overwrite» різкіше, ніж потрібно.
- **№53** `panel.flow.summary.field.mainConcepts` — [Н·Н, пріор. 2] «Main concepts» → «Core concepts» (пропонована назва).
- **№54** `panel.flow.summary.field.enclosingContext` — [Г, пріор. 2] «Enclosing» — калька з «охоплюючий»; природне «surrounding».
- **№55** `panel.flow.summary.field.rawObservations` — [Г·Н, пріор. 1] «Methodist» англійською — прихильник релігійної течії; для ролі, що складає методичний опис, природне «methodologist».
- **№56** `panel.flow.summary.metrics` — [Н·Н, пріор. 2] «document» → «material»; «with subtree» — калька; «Documents… · characters…» — різний регістр у межах рядка.
- **№57** `panel.flow.summary.placeholder.description` — [Н·Н, пріор. 2] «node» → «section».

<details><summary>Ключі екрана (59): де в коді, вигляд</summary>

| Ключ | Де в коді | Вигляд |
|---|---|---|
| `panel.flow.summaryBadge.draft` | `src/components/flow/SummaryBadge.tsx:13` | текст |
| `panel.flow.summaryBadge.approved` | `src/components/flow/SummaryBadge.tsx:14` | текст |
| `panel.flow.summaryBadge.materialsChangedHint` | `src/components/flow/SummaryBadge.tsx:53` | підказка |
| `panel.flow.summaryBadge.materialsChanged` | `src/components/flow/SummaryBadge.tsx:55` | текст |
| `panel.flow.runState.title` | `src/components/flow/RunStatePanel.tsx:64` | заголовок |
| `panel.flow.runState.close` | `src/components/flow/RunStatePanel.tsx:76`<br>`src/components/flow/RunStatePanel.tsx:77` | кнопка |
| `panel.flow.runState.expectedReason` | `src/components/flow/RunStatePanel.tsx:111` | текст |
| `panel.flow.rejectionNotice.title` | `src/components/flow/RejectionNotice.tsx:58` | заголовок |
| `panel.flow.rejectionNotice.rejected` | `src/components/flow/RejectionNotice.tsx:64` | текст |
| `panel.flow.rejectionNotice.close` | `src/components/flow/RejectionNotice.tsx:69`<br>`src/components/flow/RejectionNotice.tsx:70` | кнопка |
| `panel.flow.rejectionNotice.description` | `src/components/flow/RejectionNotice.tsx:82` | опис / підзаголовок |
| `panel.flow.rejectionNotice.goToNode` | `src/components/flow/RejectionNotice.tsx:94` | кнопка |
| `panel.flow.rejectionNotice.generateForce` | `src/components/flow/RejectionNotice.tsx:105` | кнопка |
| `panel.flow.pipeline.generateTitle` | `src/components/flow/FlowContextMenu.tsx:379` | заголовок |
| `panel.flow.pipeline.generateDescription` | `src/components/flow/FlowContextMenu.tsx:380` | опис / підзаголовок |
| `panel.flow.summary.notYetGenerated` | `src/components/flow/SummaryModal.tsx:195` | текст |
| `panel.flow.summary.nodeNotFound` | `src/components/flow/SummaryModal.tsx:196` | повідомлення про помилку |
| `panel.flow.summary.loadFailed` | `src/components/flow/SummaryModal.tsx:200` | повідомлення про помилку |
| `panel.flow.summary.saveFailed` | `src/components/flow/SummaryModal.tsx:247` | повідомлення про помилку |
| `panel.flow.summary.modalTitle` | `src/components/flow/SummaryModal.tsx:259` | заголовок |
| `panel.flow.summary.approved` | `src/components/flow/SummaryModal.tsx:326` | текст |
| `panel.flow.summary.draftNotApproved` | `src/components/flow/SummaryModal.tsx:329` | текст |
| `panel.flow.summary.edit` | `src/components/flow/SummaryModal.tsx:335` | кнопка |
| `panel.flow.summary.acceptRawHint` | `src/components/flow/SummaryModal.tsx:341` | підказка |
| `panel.flow.summary.acceptRaw` | `src/components/flow/SummaryModal.tsx:344` | кнопка |
| `panel.flow.summary.approveHint` | `src/components/flow/SummaryModal.tsx:350` | підказка |
| `panel.flow.summary.approve` | `src/components/flow/SummaryModal.tsx:353` | кнопка |
| `panel.flow.summary.hideDiff` | `src/components/flow/SummaryModal.tsx:365` | текст |
| `panel.flow.summary.showDiff` | `src/components/flow/SummaryModal.tsx:366` | текст |
| `panel.flow.summary.field.title` | `src/components/flow/SummaryModal.tsx:370`<br>`src/components/flow/SummaryModal.tsx:468` | заголовок |
| `panel.flow.summary.field.description` | `src/components/flow/SummaryModal.tsx:371`<br>`src/components/flow/SummaryModal.tsx:474` | опис / підзаголовок |
| `panel.flow.summary.field.learningObjectives` | `src/components/flow/SummaryModal.tsx:373`<br>`src/components/flow/SummaryModal.tsx:480` | текст |
| `panel.flow.summary.field.knowledge` | `src/components/flow/SummaryModal.tsx:378`<br>`src/components/flow/SummaryModal.tsx:485` | текст |
| `panel.flow.summary.field.skills` | `src/components/flow/SummaryModal.tsx:383`<br>`src/components/flow/SummaryModal.tsx:490` | текст |
| `panel.flow.summary.field.successCriteria` | `src/components/flow/SummaryModal.tsx:388`<br>`src/components/flow/SummaryModal.tsx:495` | текст |
| `panel.flow.summary.field.assessmentApproach` | `src/components/flow/SummaryModal.tsx:393`<br>`src/components/flow/SummaryModal.tsx:500` | текст |
| `panel.flow.summary.field.teachingApproach` | `src/components/flow/SummaryModal.tsx:398`<br>`src/components/flow/SummaryModal.tsx:506` | текст |
| `panel.flow.summary.field.keyActivities` | `src/components/flow/SummaryModal.tsx:403`<br>`src/components/flow/SummaryModal.tsx:512` | текст |
| `panel.flow.summary.field.commonMistakes` | `src/components/flow/SummaryModal.tsx:408`<br>`src/components/flow/SummaryModal.tsx:517` | текст |
| `panel.flow.summary.field.mainConcepts` | `src/components/flow/SummaryModal.tsx:543` | текст |
| `panel.flow.summary.field.secondaryConcepts` | `src/components/flow/SummaryModal.tsx:548` | текст |
| `panel.flow.summary.field.enclosingContext` | `src/components/flow/SummaryModal.tsx:553` | текст |
| `panel.flow.summary.field.rawObservations` | `src/components/flow/SummaryModal.tsx:558` | текст |
| `panel.flow.summary.metrics` | `src/components/flow/SummaryModal.tsx:560` | текст |
| `panel.flow.summary.editMode` | `src/components/flow/SummaryModal.tsx:444` | текст |
| `panel.flow.summary.cancel` | `src/components/flow/SummaryModal.tsx:447` | кнопка |
| `panel.flow.summary.saveChangesHint` | `src/components/flow/SummaryModal.tsx:453` | підказка |
| `panel.flow.summary.noChangesHint` | `src/components/flow/SummaryModal.tsx:453` | підказка |
| `panel.flow.summary.save` | `src/components/flow/SummaryModal.tsx:456` | кнопка |
| `panel.flow.summary.placeholder.title` | `src/components/flow/SummaryModal.tsx:470` | заголовок |
| `panel.flow.summary.placeholder.description` | `src/components/flow/SummaryModal.tsx:476` | опис / підзаголовок |
| `panel.flow.summary.placeholder.assessmentApproach` | `src/components/flow/SummaryModal.tsx:502` | текст |
| `panel.flow.summary.placeholder.teachingApproach` | `src/components/flow/SummaryModal.tsx:508` | текст |
| `panel.flow.summary.changed` | `src/components/flow/SummaryModal.tsx:591` | текст |
| `panel.flow.summary.deleteItem` | `src/components/flow/SummaryModal.tsx:777`<br>`src/components/flow/SummaryModal.tsx:832` | кнопка |
| `panel.flow.summary.addItem` | `src/components/flow/SummaryModal.tsx:785` | кнопка |
| `panel.flow.summary.pair.namePlaceholder` | `src/components/flow/SummaryModal.tsx:820` | заповнювач поля |
| `panel.flow.summary.pair.descriptionPlaceholder` | `src/components/flow/SummaryModal.tsx:826` | заповнювач поля |
| `panel.flow.summary.pair.addPair` | `src/components/flow/SummaryModal.tsx:840` | кнопка |

</details>

### 6. Редактор тесту

Файли: src/pages/TestEditorPage.tsx, src/components/testEditor/*, src/utils/testRefusals.ts. Ключів: **143**, правок: **13**.

- Редактор тесту (сторінка) і його відмови. Поняття «pass threshold» скрізь замінюється на «pass mark».
- ICU: плюралів немає, є два `select` (напрямок «up/down») — структура збігається з uk.

Знахідки (повний текст «було → стає» — у зведеному списку):

- **№58** `panel.testEditor.replaceYaml` — [Г, пріор. 3] «from YAML» без іменника; у заголовку вікна (`replaceYamlTitle`) уже «with a file».
- **№59** `panel.testEditor.passThreshold` — [Н·Н, пріор. 2] «Pass threshold» → «Pass mark».
- **№60** `panel.testEditor.passThresholdHint` — [Н·Н, пріор. 2] «threshold» → «pass mark».
- **№61** `panel.testEditor.takeModelText` — [Д, пріор. 3] Кнопка: 40 проти 28.
- **№62** `panel.testEditor.doubtText` — [Г, пріор. 3] «anew» — книжне.
- **№63** `panel.testEditor.firstPublication` — [Д, пріор. 3] «The students of the course» — калька (довше за uk: 45 проти 29 знаків).
- **№64** `panel.testEditor.publishChecked` — [Г, пріор. 2] «already ready» — тавтологія.
- **№65** `panel.testEditor.checkReadyDoubts` — [Г, пріор. 2] «has a doubt about some questions» — однина не в парі з «some questions».
- **№66** `panel.testEditor.replaceYamlText` — [Н·Н, пріор. 2] «threshold» → «pass mark».
- **№67** `panel.testRefusals.backToCourses` — [Д, пріор. 3] Те саме, і однакові кнопки мають бути однакові.
- **№68** `panel.testRefusals.saveRefused.fieldInvalid` — [Н·Н, пріор. 2] «threshold» → «pass mark».
- **№69** `panel.testRefusals.fileReason.fieldInvalid` — [Т, пріор. 3] «kind» → «type» (у діалозі завантаження це «type»).
- **№70** `panel.testRefusals.problem.passThreshold` — [Н·Н, пріор. 2] «threshold» → «pass mark»; «The threshold is …» → «must be …» (повідомлення про вимогу).

<details><summary>Ключі екрана (143): де в коді, вигляд</summary>

| Ключ | Де в коді | Вигляд |
|---|---|---|
| `panel.testEditor.newTest` | `src/components/testEditor/editorTexts.ts:12` | кнопка |
| `panel.testEditor.back` | `src/components/testEditor/editorTexts.ts:13` | кнопка |
| `panel.testEditor.published` | `src/components/testEditor/editorTexts.ts:15` | текст |
| `panel.testEditor.publishedHint` | `src/components/testEditor/editorTexts.ts:16` | підказка |
| `panel.testEditor.notPublished` | `src/components/testEditor/editorTexts.ts:17` | текст |
| `panel.testEditor.unpublishedChanges` | `src/components/testEditor/editorTexts.ts:18` | текст |
| `panel.testEditor.unpublishedChangesHint` | `src/components/testEditor/editorTexts.ts:21` | підказка |
| `panel.testEditor.notChecked` | `src/components/testEditor/editorTexts.ts:24` | текст |
| `panel.testEditor.checking` | `src/components/testEditor/editorTexts.ts:25` | текст |
| `panel.testEditor.checked` | `src/components/testEditor/editorTexts.ts:26` | текст |
| `panel.testEditor.checkFailed` | `src/components/testEditor/editorTexts.ts:27` | повідомлення про помилку |
| `panel.testEditor.unsaved` | `src/components/testEditor/editorTexts.ts:29` | текст |
| `panel.testEditor.saving` | `src/components/testEditor/editorTexts.ts:30` | текст |
| `panel.testEditor.allSaved` | `src/components/testEditor/editorTexts.ts:31` | текст |
| `panel.testEditor.save` | `src/components/testEditor/editorTexts.ts:33` | кнопка |
| `panel.testEditor.nothingToSave` | `src/components/testEditor/editorTexts.ts:34` | текст |
| `panel.testEditor.check` | `src/components/testEditor/editorTexts.ts:35` | кнопка |
| `panel.testEditor.ordering` | `src/components/testEditor/editorTexts.ts:36` | текст |
| `panel.testEditor.publish` | `src/components/testEditor/editorTexts.ts:37` | кнопка |
| `panel.testEditor.publishing` | `src/components/testEditor/editorTexts.ts:38` | текст |
| `panel.testEditor.saveTestFirst` | `src/components/testEditor/editorTexts.ts:40` | текст |
| `panel.testEditor.saveChangesFirst` | `src/components/testEditor/editorTexts.ts:41` | текст |
| `panel.testEditor.finishFirst` | `src/components/testEditor/editorTexts.ts:42` | текст |
| `panel.testEditor.alreadyChecked` | `src/components/testEditor/editorTexts.ts:43` | текст |
| `panel.testEditor.nothingToPublish` | `src/components/testEditor/editorTexts.ts:44` | текст |
| `panel.testEditor.editView` | `src/components/testEditor/editorTexts.ts:46` | текст |
| `panel.testEditor.studentView` | `src/components/testEditor/editorTexts.ts:47` | текст |
| `panel.testEditor.exportYaml` | `src/components/testEditor/editorTexts.ts:49` | кнопка |
| `panel.testEditor.replaceYaml` | `src/components/testEditor/editorTexts.ts:50` | кнопка |
| `panel.testEditor.hide` | `src/components/testEditor/editorTexts.ts:51` | кнопка |
| `panel.testEditor.title` | `src/components/testEditor/editorTexts.ts:53` | заголовок |
| `panel.testEditor.titleHint` | `src/components/testEditor/editorTexts.ts:54` | підказка |
| `panel.testEditor.passThreshold` | `src/components/testEditor/editorTexts.ts:55` | текст |
| `panel.testEditor.passThresholdHint` | `src/components/testEditor/editorTexts.ts:56` | підказка |
| `panel.testEditor.questionText` | `src/components/testEditor/editorTexts.ts:58` | текст |
| `panel.testEditor.options` | `src/components/testEditor/editorTexts.ts:59` | текст |
| `panel.testEditor.correct` | `src/components/testEditor/editorTexts.ts:60` | текст |
| `panel.testEditor.addOption` | `src/components/testEditor/editorTexts.ts:61` | кнопка |
| `panel.testEditor.addOwnExplanation` | `src/components/testEditor/editorTexts.ts:62` | текст |
| `panel.testEditor.ownExplanation` | `src/components/testEditor/editorTexts.ts:63` | текст |
| `panel.testEditor.removeOwnExplanation` | `src/components/testEditor/editorTexts.ts:66` | текст |
| `panel.testEditor.ownExplanationHint` | `src/components/testEditor/editorTexts.ts:70` | підказка |
| `panel.testEditor.tooManyOptions` | `src/components/testEditor/editorTexts.ts:73` | текст |
| `panel.testEditor.tooManyQuestions` | `src/components/testEditor/editorTexts.ts:74` | текст |
| `panel.testEditor.noQuestions` | `src/components/testEditor/editorTexts.ts:76` | порожній стан |
| `panel.testEditor.noQuestionsHint` | `src/components/testEditor/editorTexts.ts:77` | підказка |
| `panel.testEditor.addQuestion` | `src/components/testEditor/editorTexts.ts:78` | кнопка |
| `panel.testEditor.noOptions` | `src/components/testEditor/editorTexts.ts:79` | порожній стан |
| `panel.testEditor.modelExplanation` | `src/components/testEditor/editorTexts.ts:81` | текст |
| `panel.testEditor.takeModelText` | `src/components/testEditor/editorTexts.ts:82` | кнопка |
| `panel.testEditor.doubt` | `src/components/testEditor/editorTexts.ts:83` | текст |
| `panel.testEditor.doubtText` | `src/components/testEditor/editorTexts.ts:84` | текст |
| `panel.testEditor.changedSinceCheck` | `src/components/testEditor/editorTexts.ts:87` | текст |
| `panel.testEditor.studentViewIntro` | `src/components/testEditor/editorTexts.ts:90` | опис / підзаголовок |
| `panel.testEditor.studentViewEmpty` | `src/components/testEditor/editorTexts.ts:91` | порожній стан |
| `panel.testEditor.leaveTitle` | `src/components/testEditor/editorTexts.ts:93` | заголовок |
| `panel.testEditor.leaveText` | `src/components/testEditor/editorTexts.ts:94` | текст |
| `panel.testEditor.stay` | `src/components/testEditor/editorTexts.ts:95` | кнопка |
| `panel.testEditor.leave` | `src/components/testEditor/editorTexts.ts:96` | кнопка |
| `panel.testEditor.publishTitle` | `src/components/testEditor/editorTexts.ts:98` | заголовок |
| `panel.testEditor.cancel` | `src/components/testEditor/editorTexts.ts:99` | кнопка |
| `panel.testEditor.firstPublication` | `src/components/testEditor/editorTexts.ts:100` | текст |
| `panel.testEditor.newVersion` | `src/components/testEditor/editorTexts.ts:101` | текст |
| `panel.testEditor.publishChecked` | `src/components/testEditor/editorTexts.ts:102` | текст |
| `panel.testEditor.publishUnchecked` | `src/components/testEditor/editorTexts.ts:103` | текст |
| `panel.testEditor.publishChecking` | `src/components/testEditor/editorTexts.ts:104` | текст |
| `panel.testEditor.publishCheckFailed` | `src/components/testEditor/editorTexts.ts:107` | повідомлення про помилку |
| `panel.testEditor.replaceOwnTitle` | `src/components/testEditor/editorTexts.ts:110` | заголовок |
| `panel.testEditor.replace` | `src/components/testEditor/editorTexts.ts:111` | кнопка |
| `panel.testEditor.replaceYamlTitle` | `src/components/testEditor/editorTexts.ts:113` | заголовок |
| `panel.testEditor.replaceYamlUnsaved` | `src/components/testEditor/editorTexts.ts:116` | текст |
| `panel.testEditor.hideTitle` | `src/components/testEditor/editorTexts.ts:119` | заголовок |
| `panel.testEditor.hideConfirm` | `src/components/testEditor/editorTexts.ts:120` | текст |
| `panel.testEditor.created` | `src/components/testEditor/editorTexts.ts:122` | текст |
| `panel.testEditor.saved` | `src/components/testEditor/editorTexts.ts:123` | текст |
| `panel.testEditor.checkOrdered` | `src/components/testEditor/editorTexts.ts:124` | текст |
| `panel.testEditor.checkAlreadyReady` | `src/components/testEditor/editorTexts.ts:127` | текст |
| `panel.testEditor.checkReady` | `src/components/testEditor/editorTexts.ts:129` | текст |
| `panel.testEditor.checkReadyDoubts` | `src/components/testEditor/editorTexts.ts:130` | текст |
| `panel.testEditor.checkFailedTryAgain` | `src/components/testEditor/editorTexts.ts:133` | повідомлення про помилку |
| `panel.testEditor.publishedNow` | `src/components/testEditor/editorTexts.ts:135` | текст |
| `panel.testEditor.explanationsComing` | `src/components/testEditor/editorTexts.ts:138` | текст |
| `panel.testEditor.alreadyPublished` | `src/components/testEditor/editorTexts.ts:142` | текст |
| `panel.testEditor.replacedFromFile` | `src/components/testEditor/editorTexts.ts:146` | текст |
| `panel.testEditor.questionHeading` | `src/components/testEditor/editorTexts.ts:152` | заголовок |
| `panel.testEditor.moveQuestion` | `src/components/testEditor/editorTexts.ts:160` | текст |
| `panel.testEditor.removeQuestion` | `src/components/testEditor/editorTexts.ts:170` | текст |
| `panel.testEditor.optionText` | `src/components/testEditor/editorTexts.ts:174` | текст |
| `panel.testEditor.correctOption` | `src/components/testEditor/editorTexts.ts:178` | текст |
| `panel.testEditor.moveOption` | `src/components/testEditor/editorTexts.ts:186` | текст |
| `panel.testEditor.removeOption` | `src/components/testEditor/editorTexts.ts:193` | текст |
| `panel.testEditor.replaceOwnText` | `src/components/testEditor/editorTexts.ts:197` | текст |
| `panel.testEditor.replaceYamlText` | `src/components/testEditor/editorTexts.ts:201` | текст |
| `panel.testEditor.hideText` | `src/components/testEditor/editorTexts.ts:205` | текст |
| `panel.testRefusals.notSavedSeeBelow` | `src/utils/testRefusals.ts:31`<br>`src/utils/testRefusals.ts:288` | повідомлення про відмову / помилку |
| `panel.testRefusals.backToCourses` | `src/utils/testRefusals.ts:35` | кнопка |
| `panel.testRefusals.pollingFailed` | `src/utils/testRefusals.ts:39` | повідомлення про відмову / помилку |
| `panel.testRefusals.noNodeForNewTest` | `src/utils/testRefusals.ts:43` | повідомлення про відмову / помилку |
| `panel.testRefusals.notFound` | `src/utils/testRefusals.ts:274`<br>`src/utils/testRefusals.ts:308` | повідомлення про відмову / помилку |
| `panel.testRefusals.notATest` | `src/utils/testRefusals.ts:311` | повідомлення про відмову / помилку |
| `panel.testRefusals.notOpened` | `src/utils/testRefusals.ts:305`<br>`src/utils/testRefusals.ts:312` | повідомлення про відмову / помилку |
| `panel.testRefusals.notFinished` | `src/utils/testRefusals.ts:137`<br>`src/utils/testRefusals.ts:256` | повідомлення про відмову / помилку |
| `panel.testRefusals.failed.save` | `src/utils/testRefusals.ts:48`<br>`src/utils/testRefusals.ts:55` | повідомлення про відмову / помилку |
| `panel.testRefusals.failed.check` | `src/utils/testRefusals.ts:49`<br>`src/utils/testRefusals.ts:56` | повідомлення про відмову / помилку |
| `panel.testRefusals.failed.publish` | `src/utils/testRefusals.ts:50`<br>`src/utils/testRefusals.ts:57` | повідомлення про відмову / помилку |
| `panel.testRefusals.failed.export` | `src/utils/testRefusals.ts:51`<br>`src/utils/testRefusals.ts:58` | повідомлення про відмову / помилку |
| `panel.testRefusals.failed.replace` | `src/utils/testRefusals.ts:52`<br>`src/utils/testRefusals.ts:59` | повідомлення про відмову / помилку |
| `panel.testRefusals.failed.hide` | `src/utils/testRefusals.ts:53`<br>`src/utils/testRefusals.ts:60` | повідомлення про відмову / помилку |
| `panel.testRefusals.collision.check` | `src/utils/testRefusals.ts:66`<br>`src/utils/testRefusals.ts:70` | повідомлення про відмову / помилку |
| `panel.testRefusals.collision.publish` | `src/utils/testRefusals.ts:67`<br>`src/utils/testRefusals.ts:71` | повідомлення про відмову / помилку |
| `panel.testRefusals.saveRefusedAt.fieldInvalid` | `src/utils/testRefusals.ts:76`<br>`src/utils/testRefusals.ts:79` | повідомлення про відмову / помилку |
| `panel.testRefusals.saveRefusedAt.optionsCount` | `src/utils/testRefusals.ts:77`<br>`src/utils/testRefusals.ts:80` | повідомлення про відмову / помилку |
| `panel.testRefusals.saveRefused.fieldInvalid` | `src/utils/testRefusals.ts:85`<br>`src/utils/testRefusals.ts:88` | повідомлення про відмову / помилку |
| `panel.testRefusals.saveRefused.tooLarge` | `src/utils/testRefusals.ts:86`<br>`src/utils/testRefusals.ts:89` | повідомлення про відмову / помилку |
| `panel.testRefusals.screenedText.suspiciousUnicode` | `src/utils/testRefusals.ts:94`<br>`src/utils/testRefusals.ts:97` | повідомлення про відмову / помилку |
| `panel.testRefusals.screenedText.promptInjection` | `src/utils/testRefusals.ts:95`<br>`src/utils/testRefusals.ts:98` | повідомлення про відмову / помилку |
| `panel.testRefusals.screenedText.other` | `src/utils/testRefusals.ts:296` | повідомлення про відмову / помилку |
| `panel.testRefusals.fileReason.yamlUnreadable` | `src/utils/testRefusals.ts:103`<br>`src/utils/testRefusals.ts:111` | повідомлення про відмову / помилку |
| `panel.testRefusals.fileReason.yamlDuplicateKey` | `src/utils/testRefusals.ts:104`<br>`src/utils/testRefusals.ts:112` | повідомлення про відмову / помилку |
| `panel.testRefusals.fileReason.yamlAlias` | `src/utils/testRefusals.ts:105`<br>`src/utils/testRefusals.ts:113` | повідомлення про відмову / помилку |
| `panel.testRefusals.fileReason.fieldInvalid` | `src/utils/testRefusals.ts:106`<br>`src/utils/testRefusals.ts:114` | повідомлення про відмову / помилку |
| `panel.testRefusals.fileReason.optionsCount` | `src/utils/testRefusals.ts:107`<br>`src/utils/testRefusals.ts:115` | повідомлення про відмову / помилку |
| `panel.testRefusals.fileReason.tooLarge` | `src/utils/testRefusals.ts:108`<br>`src/utils/testRefusals.ts:116` | повідомлення про відмову / помилку |
| `panel.testRefusals.fileReason.notYaml` | `src/utils/testRefusals.ts:109`<br>`src/utils/testRefusals.ts:117` | повідомлення про відмову / помилку |
| `panel.testRefusals.fileRefusal` | `src/utils/testRefusals.ts:191` | повідомлення про відмову / помилку |
| `panel.testRefusals.fileRefusalNamed` | `src/utils/testRefusals.ts:192` | повідомлення про відмову / помилку |
| `panel.testRefusals.place.line` | `src/utils/testRefusals.ts:208` | повідомлення про відмову / помилку |
| `panel.testRefusals.place.lineAndColumn` | `src/utils/testRefusals.ts:203` | повідомлення про відмову / помилку |
| `panel.testRefusals.place.question` | `src/utils/testRefusals.ts:224` | повідомлення про відмову / помилку |
| `panel.testRefusals.place.questionAndOption` | `src/utils/testRefusals.ts:217` | повідомлення про відмову / помилку |
| `panel.testRefusals.incomplete.noQuestions` | `src/utils/testRefusals.ts:127` | повідомлення про відмову / помилку |
| `panel.testRefusals.incomplete.questionTextEmpty` | `src/utils/testRefusals.ts:130` | повідомлення про відмову / помилку |
| `panel.testRefusals.incomplete.optionTextEmpty` | `src/utils/testRefusals.ts:131` | повідомлення про відмову / помилку |
| `panel.testRefusals.incomplete.optionsCount` | `src/utils/testRefusals.ts:133` | повідомлення про відмову / помилку |
| `panel.testRefusals.incomplete.noCorrectOption` | `src/utils/testRefusals.ts:135` | повідомлення про відмову / помилку |
| `panel.testRefusals.problem.titleEmpty` | `src/utils/testRefusals.ts:149` | повідомлення про відмову / помилку |
| `panel.testRefusals.problem.titleTooLong` | `src/utils/testRefusals.ts:150` | повідомлення про відмову / помилку |
| `panel.testRefusals.problem.passThreshold` | `src/utils/testRefusals.ts:152` | повідомлення про відмову / помилку |
| `panel.testRefusals.problem.questionTooLong` | `src/utils/testRefusals.ts:154` | повідомлення про відмову / помилку |
| `panel.testRefusals.problem.optionTooLong` | `src/utils/testRefusals.ts:156` | повідомлення про відмову / помилку |
| `panel.testRefusals.problem.explanationTooLong` | `src/utils/testRefusals.ts:160` | повідомлення про відмову / помилку |
| `panel.testRefusals.problem.notYamlFile` | `src/utils/testRefusals.ts:171` | повідомлення про відмову / помилку |
| `panel.testRefusals.problem.fileTooLarge` | `src/utils/testRefusals.ts:172` | повідомлення про відмову / помилку |

</details>

### 7. Учні / доступ

Файли: src/pages/StudentsPage.tsx, src/components/students/*. Ключів: **80**, правок: **2**.

- Таблиця студентів і модальні вікна (додати студента, скинути пароль, відкликати доступ, додати курс), повідомлення про помилки з бекенду.
- У `panel.students.portalOriginMissing` автор бачить назву змінної середовища — див. питання 6.

Знахідки (повний текст «було → стає» — у зведеному списку):

- **№71** `panel.students.pagination.prev` — [Г, пріор. 3] те саме.
- **№72** `panel.students.error.network` — [Т, пріор. 3] «server» — а на екрані входу «platform» (`login.error.offline`); «Please» додано, а в uk його немає.

<details><summary>Ключі екрана (80): де в коді, вигляд</summary>

| Ключ | Де в коді | Вигляд |
|---|---|---|
| `panel.students.title` | `src/pages/StudentsPage.tsx:94` | заголовок |
| `panel.students.subtitle` | `src/pages/StudentsPage.tsx:96` | заголовок |
| `panel.students.copyPortalLink` | `src/pages/StudentsPage.tsx:113` | кнопка |
| `panel.students.copied` | `src/pages/StudentsPage.tsx:112` | текст |
| `panel.students.portalOriginMissing` | `src/pages/StudentsPage.tsx:106` | текст |
| `panel.students.copyFailed` | `src/pages/StudentsPage.tsx:123` | повідомлення про помилку |
| `panel.students.addStudent` | `src/pages/StudentsPage.tsx:116` | кнопка |
| `panel.students.emptyTitle` | `src/pages/StudentsPage.tsx:142` | порожній стан |
| `panel.students.emptyDescription` | `src/pages/StudentsPage.tsx:143` | порожній стан |
| `panel.students.narrowTitle` | `src/pages/StudentsPage.tsx:187` | заголовок |
| `panel.students.narrowDescription` | `src/pages/StudentsPage.tsx:188` | опис / підзаголовок |
| `panel.students.table.student` | `src/pages/StudentsPage.tsx:158` | текст |
| `panel.students.table.login` | `src/pages/StudentsPage.tsx:159` | текст |
| `panel.students.table.status` | `src/pages/StudentsPage.tsx:160` | текст |
| `panel.students.table.courses` | `src/pages/StudentsPage.tsx:161` | текст |
| `panel.students.table.actions` | `src/pages/StudentsPage.tsx:162` | текст |
| `panel.students.rangeOfTotal` | `src/pages/StudentsPage.tsx:194` | лічильник |
| `panel.students.pagination.prev` | `src/pages/StudentsPage.tsx:204` | кнопка |
| `panel.students.pagination.next` | `src/pages/StudentsPage.tsx:211` | кнопка |
| `panel.students.status.noAccess` | `src/components/students/StudentStatusBadge.tsx:15` | текст |
| `panel.students.status.active` | `src/components/students/StudentStatusBadge.tsx:19` | текст |
| `panel.students.status.revoked` | `src/components/students/StudentStatusBadge.tsx:20` | текст |
| `panel.students.action.revoke` | `src/components/students/StudentRow.tsx:134` | кнопка |
| `panel.students.action.restore` | `src/components/students/StudentRow.tsx:143` | кнопка |
| `panel.students.action.resetPassword` | `src/components/students/StudentRow.tsx:154` | кнопка |
| `panel.students.action.courses` | `src/components/students/StudentRow.tsx:172` | текст |
| `panel.students.action.addCourse` | `src/components/students/StudentRow.tsx:178` | кнопка |
| `panel.students.action.loading` | `src/components/students/StudentRow.tsx:184` | текст |
| `panel.students.action.loadError` | `src/components/students/StudentRow.tsx:191` | повідомлення про помилку |
| `panel.students.action.noEnrollments` | `src/components/students/StudentRow.tsx:194` | текст |
| `panel.students.action.deletedCourse` | `src/components/students/StudentRow.tsx:207` | текст |
| `panel.students.action.unbindCourse` | `src/components/students/StudentRow.tsx:217` | кнопка |
| `panel.students.revokeModal.title` | `src/components/students/StudentRow.tsx:237` | заголовок |
| `panel.students.revokeModal.question` | `src/components/students/StudentRow.tsx:241` | текст |
| `panel.students.revokeModal.cancel` | `src/components/students/StudentRow.tsx:253` | кнопка |
| `panel.students.revokeModal.confirm` | `src/components/students/StudentRow.tsx:256` | кнопка |
| `panel.students.provision.autoTitle` | `src/components/students/ProvisionStudentModal.tsx:37` | заголовок |
| `panel.students.provision.autoDesc` | `src/components/students/ProvisionStudentModal.tsx:38` | опис / підзаголовок |
| `panel.students.provision.customTitle` | `src/components/students/ProvisionStudentModal.tsx:42` | заголовок |
| `panel.students.provision.customDesc` | `src/components/students/ProvisionStudentModal.tsx:43` | опис / підзаголовок |
| `panel.students.provision.existingTitle` | `src/components/students/ProvisionStudentModal.tsx:47` | заголовок |
| `panel.students.provision.existingDesc` | `src/components/students/ProvisionStudentModal.tsx:48` | опис / підзаголовок |
| `panel.students.provision.loginRequired` | `src/components/students/ProvisionStudentModal.tsx:71` | повідомлення про помилку |
| `panel.students.provision.passwordRequired` | `src/components/students/ProvisionStudentModal.tsx:72` | повідомлення про помилку |
| `panel.students.provision.externalIdRequired` | `src/components/students/ProvisionStudentModal.tsx:73` | повідомлення про помилку |
| `panel.students.provision.existingIdRequired` | `src/components/students/ProvisionStudentModal.tsx:75` | повідомлення про помилку |
| `panel.students.provision.title` | `src/components/students/ProvisionStudentModal.tsx:107` | заголовок |
| `panel.students.provision.externalIdPlaceholder` | `src/components/students/ProvisionStudentModal.tsx:149` | заповнювач поля |
| `panel.students.provision.existingIdLabel` | `src/components/students/ProvisionStudentModal.tsx:156` | підпис / текст посилання |
| `panel.students.provision.existingIdPlaceholder` | `src/components/students/ProvisionStudentModal.tsx:162` | заповнювач поля |
| `panel.students.provision.loginLabel` | `src/components/students/ProvisionStudentModal.tsx:169` | підпис / текст посилання |
| `panel.students.provision.passwordLabel` | `src/components/students/ProvisionStudentModal.tsx:180` | підпис / текст посилання |
| `panel.students.provision.displayNameLabel` | `src/components/students/ProvisionStudentModal.tsx:191` | підпис / текст посилання |
| `panel.students.provision.cancel` | `src/components/students/ProvisionStudentModal.tsx:208` | кнопка |
| `panel.students.provision.submit` | `src/components/students/ProvisionStudentModal.tsx:214` | кнопка |
| `panel.students.resetPassword.passwordRequired` | `src/components/students/ResetPasswordModal.tsx:53` | повідомлення про помилку |
| `panel.students.resetPassword.title` | `src/components/students/ResetPasswordModal.tsx:68` | заголовок |
| `panel.students.resetPassword.updated` | `src/components/students/ResetPasswordModal.tsx:73` | текст |
| `panel.students.resetPassword.close` | `src/components/students/ResetPasswordModal.tsx:77` | кнопка |
| `panel.students.resetPassword.prompt` | `src/components/students/ResetPasswordModal.tsx:85` | текст |
| `panel.students.resetPassword.passwordLabel` | `src/components/students/ResetPasswordModal.tsx:94` | підпис / текст посилання |
| `panel.students.resetPassword.cancel` | `src/components/students/ResetPasswordModal.tsx:114` | кнопка |
| `panel.students.resetPassword.submit` | `src/components/students/ResetPasswordModal.tsx:120` | кнопка |
| `panel.students.coursePicker.title` | `src/components/students/CoursePickerModal.tsx:64` | заголовок |
| `panel.students.coursePicker.loadError` | `src/components/students/CoursePickerModal.tsx:75` | повідомлення про помилку |
| `panel.students.coursePicker.emptyTitle` | `src/components/students/CoursePickerModal.tsx:84` | порожній стан |
| `panel.students.coursePicker.emptyDescription` | `src/components/students/CoursePickerModal.tsx:85` | порожній стан |
| `panel.students.error.network` | `src/components/students/studentErrors.ts:20` | повідомлення про помилку |
| `panel.students.error.alreadyHasAccess` | `src/components/students/studentErrors.ts:29` | повідомлення про помилку |
| `panel.students.error.loginOrExternalIdInUse` | `src/components/students/studentErrors.ts:30` | повідомлення про помилку |
| `panel.students.error.passwordTooWeak` | `src/components/students/studentErrors.ts:32`<br>`src/components/students/studentErrors.ts:56` | повідомлення про помилку |
| `panel.students.error.studentWithIdNotFound` | `src/components/students/studentErrors.ts:33` | повідомлення про помилку |
| `panel.students.error.noAccess` | `src/components/students/studentErrors.ts:39`<br>`src/components/students/studentErrors.ts:59` | повідомлення про помилку |
| `panel.students.error.studentNotFound` | `src/components/students/studentErrors.ts:40`<br>`src/components/students/studentErrors.ts:49`<br>`src/components/students/studentErrors.ts:60` | повідомлення про помилку |
| `panel.students.error.alreadyEnrolled` | `src/components/students/studentErrors.ts:44` | повідомлення про помилку |
| `panel.students.error.mustBeRootCourse` | `src/components/students/studentErrors.ts:45` | повідомлення про помилку |
| `panel.students.error.courseNotFound` | `src/components/students/studentErrors.ts:48` | повідомлення про помилку |
| `panel.students.error.enrollmentNotFound` | `src/components/students/studentErrors.ts:53` | повідомлення про помилку |
| `panel.students.error.generic` | `src/components/students/studentErrors.ts:65` | повідомлення про помилку |
| `panel.students.loadError` | `src/pages/StudentsPage.tsx:36` | повідомлення про помилку |

</details>

### 8. Історія

Файли: src/pages/HistoryPage.tsx, src/components/history/*. Ключів: **20**, правок: **1**.

- Таблиця історії матеріалів і рядок історії. Зауважень до змісту немає, лише «Back / Next».

Знахідки (повний текст «було → стає» — у зведеному списку):

- **№73** `panel.history.pagination.prev` — [Г, пріор. 3] «Back» поруч із «Next» — пара «Previous / Next»; «Back» — ще й «повернутися».

<details><summary>Ключі екрана (20): де в коді, вигляд</summary>

| Ключ | Де в коді | Вигляд |
|---|---|---|
| `panel.history.title` | `src/pages/HistoryPage.tsx:60` | заголовок |
| `panel.history.subtitle` | `src/pages/HistoryPage.tsx:62` | заголовок |
| `panel.history.loadError` | `src/pages/HistoryPage.tsx:26` | повідомлення про помилку |
| `panel.history.retry` | `src/pages/HistoryPage.tsx:77` | кнопка |
| `panel.history.emptyTitle` | `src/pages/HistoryPage.tsx:83` | порожній стан |
| `panel.history.emptyDescription` | `src/pages/HistoryPage.tsx:84` | порожній стан |
| `panel.history.narrowTitle` | `src/pages/HistoryPage.tsx:150` | заголовок |
| `panel.history.narrowDescription` | `src/pages/HistoryPage.tsx:151` | опис / підзаголовок |
| `panel.history.table.material` | `src/pages/HistoryPage.tsx:118` | текст |
| `panel.history.table.state` | `src/pages/HistoryPage.tsx:119` | текст |
| `panel.history.table.lastJob` | `src/pages/HistoryPage.tsx:121` | текст |
| `panel.history.table.jobs` | `src/pages/HistoryPage.tsx:123` | текст |
| `panel.history.table.activity` | `src/pages/HistoryPage.tsx:124` | текст |
| `panel.history.totalMaterials` | `src/pages/HistoryPage.tsx:158` | текст |
| `panel.history.pagination.prev` | `src/pages/HistoryPage.tsx:167` | кнопка |
| `panel.history.pagination.next` | `src/pages/HistoryPage.tsx:174` | кнопка |
| `panel.history.row.loading` | `src/components/history/MaterialHistoryRowExpandable.tsx:74` | текст |
| `panel.history.row.loadError` | `src/components/history/MaterialHistoryRowExpandable.tsx:81` | повідомлення про помилку |
| `panel.history.row.shownLimit` | `src/components/history/MaterialHistoryRowExpandable.tsx:98` | текст |
| `panel.history.row.untitled` | `src/components/history/MaterialHistoryRow.tsx:86` | текст |

</details>

### 9. Витрати / купівля

Файли: src/pages/BillingPage.tsx, CostPage.tsx, HomeworkCostPage.tsx, src/components/billing/*, src/utils/authorBillingTexts.ts, priceEstimate.ts. Ключів: **111**, правок: **25**.

- Єдиний екран зі словами, яких уникаємо: `shared.payment.*` і `shared.billing.kind.adminCredit` — «credited / Crediting».
- Тексти згоди (`shared.consent.*`) хешуються — зміни тут окремо узгодити (питання 4).

Знахідки (повний текст «було → стає» — у зведеному списку):

- **№74** `panel.billing.runsOut` — [Г, пріор. 2] «At your pace… for about» — неприродний порядок слів.
- **№75** `panel.billing.expiring` — [Г, пріор. 3] Двокрапка й «that is when» — калька; ширше «when the package term ends».
- **№76** `panel.cost.idle` — [Н·Н, пріор. 2] «charge» → «deduct»; uk каже «списувати».
- **№77** `panel.cost.spentInMonth` — [Н·Н, пріор. 2] «Spent» → «Used» (пропонована назва).
- **№78** `panel.cost.covered` — [Г, пріор. 2] «by arrangement» — не вживається так про домовленість.
- **№79** `panel.cost.table.reviewing` — [Г·Н, пріор. 1] «Work reviews» неприродно (work — незлічуване); поняття «Homework review».
- **№80** `panel.cost.table.totalSpent` — [Н·Н, пріор. 2] «Spent» → «used».
- **№81** `panel.homeworkCost.idle` — [Н·Н, пріор. 2] «charge» → «deduct»; «homework» → «homework review» — як у заголовку екрана.
- **№82** `panel.homeworkCost.emptyMonth` — [Т·Н, пріор. 3] Узгодити із заголовком екрана «Homework review costs».
- **№83** `panel.homeworkCost.spent` — [Н·Н, пріор. 2] «Spent» → «Used».
- **№84** `panel.homeworkCost.table.spent` — [Н·Н, пріор. 2] «Spent» → «Used».
- **№85** `panel.priceEstimate.mayFallShort` — [Г, пріор. 2] Одне довге речення з «there are not enough units for» — розбити.
- **№86** `panel.priceEstimate.short` — [Г, пріор. 2] «You are … short» — розмовне; у `panel.billing.heldReviews.waiting` те саме сказано «you need … more».
- **№87** `shared.billing.kind.adminCredit` — [Х, пріор. 1] «credited» — слово, якого уникаємо; пропоноване «added» (uk: «Нараховано»).
- **№88** `shared.billing.kind.benefitCovered` — [Г, пріор. 2] Те саме, що в `panel.cost.covered`.
- **№89** `shared.billing.kind.other` — [Г, пріор. 2] «Other unit movement» — калька.
- **№90** `shared.billing.charge.taskPreparation` — [Т·Н, пріор. 1] «task» → «assignment» (пропонована назва; на екрані «Витрати» вже «Assignment preparation»).
- **№91** `shared.billing.charge.review` — [Г·Н, пріор. 1] «Work review» → «Homework review».
- **№92** `shared.billing.charge.other` — [Н·Н, пріор. 2] «Charge» → «deduct» (uk: «Списання за дію»).
- **№93** `shared.consent.checkbox` — [Г·Q, пріор. 2] «Refunds rules» — іменник у множині перед іменником; сторінка сайту — «Refunds». Текст згоди хешується — питання 4.
- **№94** `shared.consent.refundsLinkWords` — [Г·Q, пріор. 2] Має збігатися з підрядком у `shared.consent.checkbox`.
- **№95** `shared.payment.credited` — [Х, пріор. 1] «credited» — слово, якого уникаємо; пропоноване «added».
- **№96** `shared.payment.failed` — [Х, пріор. 1] «credited» — слово, якого уникаємо.
- **№97** `shared.payment.crediting` — [Х, пріор. 1] «Crediting» — форма слова, якого уникаємо (автоперевірка за списком її не ловить); «Adding units…» читається краще за «Adding…».
- **№98** `shared.statement.empty` — [Т, пріор. 2] «movements» — калька з «рухи»; заголовок екрана — «Unit history».

<details><summary>Ключі екрана (111): де в коді, вигляд</summary>

| Ключ | Де в коді | Вигляд |
|---|---|---|
| `panel.billing.title` | `src/pages/BillingPage.tsx:142` | заголовок |
| `panel.billing.subtitle` | `src/pages/BillingPage.tsx:144` | заголовок |
| `panel.billing.loadFailed` | `src/utils/authorBillingTexts.ts:79`<br>`src/pages/BillingPage.tsx:160`<br>`src/pages/BillingPage.tsx:162` | повідомлення про помилку |
| `panel.billing.providerUnavailable` | `src/utils/authorBillingTexts.ts:83`<br>`src/utils/authorBillingTexts.ts:92` | повідомлення про помилку |
| `panel.billing.actionFailed` | `src/utils/authorBillingTexts.ts:87`<br>`src/utils/authorBillingTexts.ts:93` | повідомлення про помилку |
| `panel.billing.buyUnits` | `src/utils/authorBillingTexts.ts:17` | текст |
| `panel.billing.runsOut` | `src/utils/authorBillingTexts.ts:27` | текст |
| `panel.billing.expiring` | `src/utils/authorBillingTexts.ts:33` | текст |
| `panel.billing.heldReviews.waiting` | `src/utils/authorBillingTexts.ts:54` | текст |
| `panel.billing.heldReviews.enough` | `src/utils/authorBillingTexts.ts:62` | текст |
| `panel.billing.packagesClosedNote` | `src/components/billing/PackagesSection.tsx:48` | примітка |
| `panel.billing.reminders.units` | `src/components/billing/OutlookReminders.tsx:37` | текст |
| `panel.billing.returnToWork.button` | `src/components/billing/ReturnToWork.tsx:44` | кнопка |
| `panel.billing.returnToWork.stayedNote` | `src/components/billing/ReturnToWork.tsx:35` | примітка |
| `panel.billing.returnToWork.myCourses` | `src/components/billing/ReturnToWork.tsx:37` | текст |
| `panel.billing.checkoutNotice.hourNote` | `src/components/billing/CheckoutNotice.tsx:46` | примітка |
| `panel.cost.title` | `src/pages/CostPage.tsx:108` | заголовок |
| `panel.cost.idle` | `src/pages/CostPage.tsx:111` | текст |
| `panel.cost.emptyMonth` | `src/pages/CostPage.tsx:82` | порожній стан |
| `panel.cost.spentInMonth` | `src/pages/CostPage.tsx:89` | текст |
| `panel.cost.covered` | `src/pages/CostPage.tsx:95` | текст |
| `panel.cost.monthPicker.previous` | `src/components/cost/MonthPicker.tsx:29` | текст |
| `panel.cost.monthPicker.next` | `src/components/cost/MonthPicker.tsx:40` | кнопка |
| `panel.cost.table.course` | `src/pages/CostPage.tsx:31` | текст |
| `panel.cost.table.documentProcessing` | `src/pages/CostPage.tsx:33` | текст |
| `panel.cost.table.taskPreparation` | `src/pages/CostPage.tsx:34` | текст |
| `panel.cost.table.reviewing` | `src/pages/CostPage.tsx:35` | текст |
| `panel.cost.table.totalSpent` | `src/pages/CostPage.tsx:36` | текст |
| `panel.cost.table.covered` | `src/pages/CostPage.tsx:37` | текст |
| `panel.cost.unlinkedCourse` | `src/pages/CostPage.tsx:56` | текст |
| `panel.cost.untitledCourse` | `src/pages/HomeworkCostPage.tsx:33`<br>`src/pages/CostPage.tsx:44` | текст |
| `panel.homeworkCost.title` | `src/pages/HomeworkCostPage.tsx:79` | заголовок |
| `panel.homeworkCost.idle` | `src/pages/HomeworkCostPage.tsx:82` | текст |
| `panel.homeworkCost.emptyMonth` | `src/pages/HomeworkCostPage.tsx:91` | порожній стан |
| `panel.homeworkCost.spent` | `src/pages/HomeworkCostPage.tsx:36` | текст |
| `panel.homeworkCost.table.task` | `src/pages/HomeworkCostPage.tsx:45` | текст |
| `panel.homeworkCost.table.reviews` | `src/pages/HomeworkCostPage.tsx:47` | текст |
| `panel.homeworkCost.table.spent` | `src/pages/HomeworkCostPage.tsx:48` | текст |
| `panel.homeworkCost.table.covered` | `src/pages/HomeworkCostPage.tsx:49` | текст |
| `panel.homeworkCost.untitledTask` | `src/pages/HomeworkCostPage.tsx:59` | текст |
| `panel.priceEstimate.pending` | `src/utils/priceEstimate.ts:115` | текст |
| `panel.priceEstimate.failed` | `src/utils/priceEstimate.ts:119` | повідомлення про помилку |
| `panel.priceEstimate.unpriced` | `src/utils/priceEstimate.ts:123` | текст |
| `panel.priceEstimate.unpricedBatch` | `src/utils/priceEstimate.ts:123` | текст |
| `panel.priceEstimate.mayFallShort` | `src/utils/priceEstimate.ts:127` | текст |
| `panel.priceEstimate.afterPurchase` | `src/utils/priceEstimate.ts:131` | текст |
| `panel.priceEstimate.unitsNowEnough` | `src/utils/priceEstimate.ts:135` | текст |
| `panel.priceEstimate.enough` | `src/utils/priceEstimate.ts:141` | текст |
| `panel.priceEstimate.enoughAvailable` | `src/utils/priceEstimate.ts:143` | текст |
| `panel.priceEstimate.unpricedFiles` | `src/utils/priceEstimate.ts:151` | текст |
| `panel.priceEstimate.short` | `src/utils/priceEstimate.ts:160` | текст |
| `shared.billing.kind.purchase` | `src/utils/billingWords.ts:15` | текст |
| `shared.billing.kind.adminCredit` | `src/utils/billingWords.ts:16` | текст |
| `shared.billing.kind.benefitCovered` | `src/utils/billingWords.ts:17` | текст |
| `shared.billing.kind.platformCovered` | `src/utils/billingWords.ts:18` | текст |
| `shared.billing.kind.expired` | `src/utils/billingWords.ts:19` | текст |
| `shared.billing.kind.refund` | `src/utils/billingWords.ts:20` | текст |
| `shared.billing.kind.refundHold` | `src/utils/billingWords.ts:21` | текст |
| `shared.billing.kind.refundReleased` | `src/utils/billingWords.ts:22` | текст |
| `shared.billing.kind.disputeHold` | `src/utils/billingWords.ts:23` | текст |
| `shared.billing.kind.disputeReleased` | `src/utils/billingWords.ts:24` | текст |
| `shared.billing.kind.disputeLost` | `src/utils/billingWords.ts:25` | текст |
| `shared.billing.kind.differenceArisen` | `src/utils/billingWords.ts:26` | текст |
| `shared.billing.kind.differenceRepaid` | `src/utils/billingWords.ts:27` | текст |
| `shared.billing.kind.differenceAnnulled` | `src/utils/billingWords.ts:28` | текст |
| `shared.billing.kind.other` | `src/utils/billingWords.ts:45` | текст |
| `shared.billing.charge.processing` | `src/utils/billingWords.ts:32` | текст |
| `shared.billing.charge.taskPreparation` | `src/utils/billingWords.ts:33` | текст |
| `shared.billing.charge.review` | `src/utils/billingWords.ts:34` | текст |
| `shared.billing.charge.other` | `src/utils/billingWords.ts:44` | текст |
| `shared.billing.packageNotFound` | `src/utils/authorBillingTexts.ts:91`<br>`src/portal/billingTexts.ts:21` | повідомлення про помилку |
| `shared.billing.networkFailed` | `src/utils/authorBillingTexts.ts:94`<br>`src/portal/billingTexts.ts:24` | повідомлення про помилку |
| `shared.consent.author.title` | `src/utils/billingConsent.ts:21` | заголовок |
| `shared.consent.student.title` | `src/utils/billingConsent.ts:21` | заголовок |
| `shared.consent.checkbox` | `src/utils/billingConsent.ts:23` | текст |
| `shared.consent.summary` | `src/utils/billingConsent.ts:24` | текст |
| `shared.consent.change` | `src/utils/billingConsent.ts:25` | текст |
| `shared.consent.termsLinkWords` | `src/components/billing/ConsentDialog.tsx:49` | підпис / текст посилання |
| `shared.consent.refundsLinkWords` | `src/components/billing/ConsentDialog.tsx:50` | підпис / текст посилання |
| `shared.consent.termsUpdated` | `src/components/billing/ConsentDialog.tsx:58` | текст |
| `shared.consent.cancel` | `src/components/billing/ConsentDialog.tsx:86` | кнопка |
| `shared.consent.confirm` | `src/components/billing/ConsentDialog.tsx:95` | кнопка |
| `shared.balance.title` | `src/components/billing/BalanceCard.tsx:45` | заголовок |
| `shared.balance.available` | `src/components/billing/BalanceCard.tsx:48` | текст |
| `shared.balance.reserved` | `src/components/billing/BalanceCard.tsx:54` | текст |
| `shared.balance.held` | `src/components/billing/BalanceCard.tsx:57` | текст |
| `shared.balance.difference` | `src/components/billing/BalanceCard.tsx:61` | текст |
| `shared.balance.nextExpiry` | `src/components/billing/BalanceCard.tsx:66` | текст |
| `shared.balance.nothing` | `src/components/billing/BalanceCard.tsx:72` | порожній стан |
| `shared.balance.pricingLink` | `src/components/billing/BalanceCard.tsx:75` | текст |
| `shared.payment.credited` | `src/components/billing/PaymentResult.tsx:82` | текст |
| `shared.payment.failed` | `src/components/billing/PaymentResult.tsx:89` | повідомлення про помилку |
| `shared.payment.crediting` | `src/components/billing/PaymentResult.tsx:93` | текст |
| `shared.payment.waiting` | `src/components/billing/PaymentResult.tsx:95` | текст |
| `shared.payment.notArrived` | `src/components/billing/PaymentResult.tsx:100` | текст |
| `shared.payment.checkAgain` | `src/components/billing/PaymentResult.tsx:109` | кнопка |
| `shared.payment.dismiss` | `src/components/billing/PaymentResult.tsx:114` | кнопка |
| `shared.statement.title` | `src/components/billing/StatementList.tsx:61` | заголовок |
| `shared.statement.empty` | `src/components/billing/StatementList.tsx:64` | порожній стан |
| `shared.statement.date` | `src/components/billing/StatementList.tsx:71` | текст |
| `shared.statement.what` | `src/components/billing/StatementList.tsx:74` | текст |
| `shared.statement.units` | `src/components/billing/StatementList.tsx:77` | текст |
| `shared.statement.balanceAfter` | `src/components/billing/StatementList.tsx:80` | текст |
| `shared.statement.unchanged` | `src/components/billing/StatementList.tsx:38` | текст |
| `shared.statement.more` | `src/components/billing/StatementList.tsx:110` | кнопка |
| `shared.packages.title` | `src/components/billing/PackagesPurchase.tsx:170` | заголовок |
| `shared.packages.validity` | `src/components/billing/PackagesPurchase.tsx:200` | текст |
| `shared.packages.opening` | `src/components/billing/PackagesPurchase.tsx:209` | текст |
| `shared.packages.buy` | `src/components/billing/PackagesPurchase.tsx:209` | кнопка |
| `shared.packages.pricesNote` | `src/components/billing/PackagesPurchase.tsx:218` | примітка |
| `shared.packages.sellerNote` | `src/components/billing/PackagesPurchase.tsx:219` | примітка |

</details>

### 10. Довідка

Файли: src/pages/HelpPage.tsx. Ключів: **38**, правок: **4**.

- Кроки шляху автора й порада, як написати адміністраторові. Зауваження: «Methodist» і кілька калькованих рядків.

Знахідки (повний текст «було → стає» — у зведеному списку):

- **№99** `panel.help.steps.step6.part1` — [Г·Н, пріор. 1] те саме слово, що вище (питання 3).
- **№100** `panel.help.steps.step6.link` — [Г·Н, пріор. 1] те саме слово, що вище.
- **№101** `panel.help.section2.instruction` — [Г, пріор. 3] «a ready email … already filled in» — повтор.
- **№102** `panel.help.section2.checklistTitle` — [Г, пріор. 2] «What is good to have» — калька; коротше (34 проти 22).

<details><summary>Ключі екрана (38): де в коді, вигляд</summary>

| Ключ | Де в коді | Вигляд |
|---|---|---|
| `panel.help.title` | `src/pages/HelpPage.tsx:127` | заголовок |
| `panel.help.subtitle` | `src/pages/HelpPage.tsx:128` | заголовок |
| `panel.help.section1.title` | `src/pages/HelpPage.tsx:134` | заголовок |
| `panel.help.section1.intro` | `src/pages/HelpPage.tsx:137` | опис / підзаголовок |
| `panel.help.steps.step1.part1` | `src/pages/HelpPage.tsx:23` | текст |
| `panel.help.steps.step1.link` | `src/pages/HelpPage.tsx:25` | текст |
| `panel.help.steps.dot` | `src/pages/HelpPage.tsx:28`<br>`src/pages/HelpPage.tsx:38`<br>`src/pages/HelpPage.tsx:50` | текст |
| `panel.help.steps.step2.part1` | `src/pages/HelpPage.tsx:33` | текст |
| `panel.help.steps.samePlace` | `src/pages/HelpPage.tsx:35`<br>`src/pages/HelpPage.tsx:96` | текст |
| `panel.help.steps.step3.part1` | `src/pages/HelpPage.tsx:44` | текст |
| `panel.help.steps.step3.link` | `src/pages/HelpPage.tsx:47` | текст |
| `panel.help.steps.step4.part1` | `src/pages/HelpPage.tsx:56` | текст |
| `panel.help.steps.step4.link` | `src/pages/HelpPage.tsx:59` | текст |
| `panel.help.steps.step5.part1` | `src/pages/HelpPage.tsx:67` | текст |
| `panel.help.steps.step5.link1` | `src/pages/HelpPage.tsx:69` | текст |
| `panel.help.steps.comma` | `src/pages/HelpPage.tsx:72` | текст |
| `panel.help.steps.step5.link2` | `src/pages/HelpPage.tsx:74` | текст |
| `panel.help.steps.step6.part1` | `src/pages/HelpPage.tsx:82` | текст |
| `panel.help.steps.step6.link` | `src/pages/HelpPage.tsx:84` | текст |
| `panel.help.steps.step7.part1` | `src/pages/HelpPage.tsx:93` | текст |
| `panel.help.steps.step8` | `src/pages/HelpPage.tsx:103` | текст |
| `panel.help.steps.step9.part1` | `src/pages/HelpPage.tsx:107` | текст |
| `panel.help.steps.step9.link` | `src/pages/HelpPage.tsx:109` | текст |
| `panel.help.stepsInProgressNote` | `src/pages/HelpPage.tsx:163` | примітка |
| `panel.help.helpersNote.part1` | `src/pages/HelpPage.tsx:165` | текст |
| `panel.help.helpersNote.link1` | `src/pages/HelpPage.tsx:172` | текст |
| `panel.help.helpersNote.part2` | `src/pages/HelpPage.tsx:174` | текст |
| `panel.help.helpersNote.link2` | `src/pages/HelpPage.tsx:181` | текст |
| `panel.help.section2.title` | `src/pages/HelpPage.tsx:191` | заголовок |
| `panel.help.section2.intro` | `src/pages/HelpPage.tsx:195` | опис / підзаголовок |
| `panel.help.section2.instruction` | `src/pages/HelpPage.tsx:199` | текст |
| `panel.help.section2.checklistTitle` | `src/pages/HelpPage.tsx:204` | заголовок |
| `panel.help.section2.item1` | `src/pages/HelpPage.tsx:206` | текст |
| `panel.help.section2.item2` | `src/pages/HelpPage.tsx:207` | текст |
| `panel.help.section2.item3` | `src/pages/HelpPage.tsx:208` | текст |
| `panel.help.section2.item4` | `src/pages/HelpPage.tsx:209` | текст |
| `panel.help.section2.item5` | `src/pages/HelpPage.tsx:210` | текст |
| `panel.help.section2.importantNotice` | `src/pages/HelpPage.tsx:214` | примітка |

</details>

### 11. Сторінка помилки

Файли: src/pages/RouteErrorPage.tsx. Ключів: **3**, правок: **0**.

- Три ключі: заголовок, пояснення, кнопка «Refresh the page». Зауважень немає.

Знахідок немає.

<details><summary>Ключі екрана (3): де в коді, вигляд</summary>

| Ключ | Де в коді | Вигляд |
|---|---|---|
| `panel.routeError.title` | `src/pages/RouteErrorPage.tsx:30` | заголовок |
| `panel.routeError.description` | `src/pages/RouteErrorPage.tsx:23` | опис / підзаголовок |
| `panel.routeError.reloadButton` | `src/pages/RouteErrorPage.tsx:39` | кнопка |

</details>

### 12. Загальна рамка

Файли: src/components/layout/*, src/components/ui/*, src/components/activity/*, src/utils/*. Ключів: **85**, правок: **6**.

- Шапка (`header.*`), перемикач мов, смуга «Recent jobs», лист адміністраторові (`contactAdmin.*`), словники станів і одиниць, підвал сайту.
- Зведені словники (`state.*`, `sourceType.*`, `duration.*`, `size.*`, `shared.units.*`) показуються на кількох екранах — вони тут одним разом.

Знахідки (повний текст «було → стає» — у зведеному списку):

- **№103** `panel.header.nav.homeworkCost` — [Т·Н, пріор. 2] У заголовку сторінки (`panel.homeworkCost.title`) — «Homework review costs»; у меню — «Homework costs». Те саме поняття — одне слово.
- **№104** `panel.state.job.obsolete` — [Г, пріор. 3] «Obsolete» звучить як «знято з вжитку»; для результату, що застарів, — «Outdated» (так у `rejectionNotice.description`).
- **№105** `panel.state.kind.baseNormalize` — [Т·Н, пріор. 2] «Project preparation» — «project» тут означає базовий архів, а на екрані завантаження «Project» — тип завдання.
- **№106** `panel.sourceType.web` — [Г, пріор. 3] Тип джерела — веб-сторінка; у `pipeline.processDescription` вона названа «web pages».
- **№107** `panel.workProgress.unit.node` — [Н·Н, пріор. 2] Слово видно в підписі смуги «node 3 of 10»; автор бачить розділи.
- **№108** `shared.units.works` — [Г, пріор. 1] «piece of work / pieces of work» — калька, у реченні «…waiting for units: 3 pieces of work» звучить неприродно.

<details><summary>Ключі екрана (85): де в коді, вигляд</summary>

| Ключ | Де в коді | Вигляд |
|---|---|---|
| `panel.header.nav.courses` | `src/components/layout/Header.tsx:34` | текст |
| `panel.header.nav.students` | `src/components/layout/Header.tsx:35` | текст |
| `panel.header.nav.units` | `src/components/layout/Header.tsx:36` | текст |
| `panel.header.nav.cost` | `src/components/layout/Header.tsx:37` | текст |
| `panel.header.nav.homeworkCost` | `src/components/layout/Header.tsx:40` | текст |
| `panel.header.nav.materialHistory` | `src/components/layout/Header.tsx:41` | текст |
| `panel.header.nav.help` | `src/components/layout/Header.tsx:42` | текст |
| `panel.header.logout` | `src/components/layout/Header.tsx:134`<br>`src/components/layout/Header.tsx:135`<br>`src/components/layout/Header.tsx:143` | кнопка |
| `panel.state.phase.queued` | `src/utils/stateVocabulary.ts:18` | текст |
| `panel.state.phase.processing` | `src/utils/stateVocabulary.ts:19` | текст |
| `panel.state.phase.awaitingAuthor` | `src/utils/stateVocabulary.ts:20` | текст |
| `panel.state.phase.ready` | `src/utils/stateVocabulary.ts:21` | текст |
| `panel.state.phase.error` | `src/utils/stateVocabulary.ts:22` | повідомлення про помилку |
| `panel.state.test` | `src/utils/stateVocabulary.ts:114` | текст |
| `panel.state.job.queued` | `src/utils/stateVocabulary.ts:119` | текст |
| `panel.state.job.processing` | `src/utils/stateVocabulary.ts:120` | текст |
| `panel.state.job.ready` | `src/utils/stateVocabulary.ts:121` | текст |
| `panel.state.job.error` | `src/utils/stateVocabulary.ts:122` | повідомлення про помилку |
| `panel.state.job.cancelled` | `src/utils/stateVocabulary.ts:123` | текст |
| `panel.state.job.obsolete` | `src/utils/stateVocabulary.ts:124` | текст |
| `panel.state.kind.documentProcessing` | `src/utils/stateVocabulary.ts:133` | текст |
| `panel.state.kind.documentPreparation` | `src/utils/stateVocabulary.ts:134` | текст |
| `panel.state.kind.baseNormalize` | `src/utils/stateVocabulary.ts:135` | текст |
| `panel.state.kind.nodeSummaryRegeneration` | `src/utils/stateVocabulary.ts:136` | текст |
| `panel.relativeTime.justNow` | `src/utils/relativeTime.ts:16` | текст |
| `panel.duration.lessThanMinute` | `src/utils/formatDuration.ts:25` | текст |
| `panel.duration.days` | `src/utils/formatDuration.ts:35` | текст |
| `panel.duration.hours` | `src/utils/formatDuration.ts:36` | текст |
| `panel.duration.minutes` | `src/utils/formatDuration.ts:37` | текст |
| `panel.size.bytes` | `src/components/flow/BaseManifestView.tsx:16`<br>`src/utils/formatBytes.ts:21` | текст |
| `panel.size.kilobytes` | `src/components/flow/BaseManifestView.tsx:17`<br>`src/utils/formatBytes.ts:23` | текст |
| `panel.size.megabytes` | `src/components/flow/BaseManifestView.tsx:18`<br>`src/utils/formatBytes.ts:24` | текст |
| `panel.contactAdmin.button` | `src/components/ui/ContactAdmin.tsx:100` | кнопка |
| `panel.contactAdmin.notOpenedNote` | `src/components/ui/ContactAdmin.tsx:106` | примітка |
| `panel.contactAdmin.copied` | `src/components/ui/ContactAdmin.tsx:119`<br>`src/components/ui/ContactAdmin.tsx:129` | текст |
| `panel.contactAdmin.copyAddress` | `src/components/ui/ContactAdmin.tsx:120` | кнопка |
| `panel.contactAdmin.copyBody` | `src/components/ui/ContactAdmin.tsx:130` | кнопка |
| `panel.contactAdmin.copyFailed` | `src/components/ui/ContactAdmin.tsx:136` | повідомлення про помилку |
| `panel.contactAdmin.bodyTitle` | `src/components/ui/ContactAdmin.tsx:142`<br>`src/components/ui/ContactAdmin.tsx:148` | заголовок |
| `panel.contactAdmin.writeToUsPhrase` | `src/utils/contactAdmin.ts:10` | текст |
| `panel.contactAdmin.letterSubject` | `src/utils/contactAdmin.ts:14` | текст |
| `panel.contactAdmin.letter.greeting` | `src/utils/contactAdmin.ts:88`<br>`src/utils/contactAdmin.ts:131` | текст |
| `panel.contactAdmin.letter.introNoMessage` | `src/utils/contactAdmin.ts:90` | текст |
| `panel.contactAdmin.letter.myQuestion` | `src/utils/contactAdmin.ts:92` | текст |
| `panel.contactAdmin.letter.context.course` | `src/utils/contactAdmin.ts:103` | текст |
| `panel.contactAdmin.letter.context.section` | `src/utils/contactAdmin.ts:108` | текст |
| `panel.contactAdmin.letter.context.material` | `src/utils/contactAdmin.ts:113` | текст |
| `panel.contactAdmin.letter.context.test` | `src/utils/contactAdmin.ts:118` | текст |
| `panel.contactAdmin.letter.context.page` | `src/utils/contactAdmin.ts:123` | текст |
| `panel.contactAdmin.letter.context.when` | `src/utils/contactAdmin.ts:127` | текст |
| `panel.contactAdmin.letter.introWithMessage` | `src/utils/contactAdmin.ts:133` | текст |
| `panel.contactAdmin.letter.whatHappened` | `src/utils/contactAdmin.ts:138` | текст |
| `panel.sourceType.video` | `src/utils/sourceTypeIcon.ts:8` | текст |
| `panel.sourceType.presentation` | `src/utils/sourceTypeIcon.ts:10` | текст |
| `panel.sourceType.text` | `src/utils/sourceTypeIcon.ts:12` | текст |
| `panel.sourceType.web` | `src/utils/sourceTypeIcon.ts:14` | текст |
| `panel.sourceType.audio` | `src/utils/sourceTypeIcon.ts:16` | текст |
| `panel.sourceType.code` | `src/utils/sourceTypeIcon.ts:22` | текст |
| `panel.sourceType.testObject` | `src/utils/sourceTypeIcon.ts:26` | текст |
| `panel.workProgress.unit.frame` | `src/utils/workProgress.ts:23` | текст |
| `panel.workProgress.unit.node` | `src/utils/workProgress.ts:25` | текст |
| `panel.workProgress.lessThan1Mb` | `src/utils/workProgress.ts:41` | текст |
| `panel.workProgress.uploadCaption` | `src/utils/workProgress.ts:42` | текст |
| `panel.workProgress.caption` | `src/utils/workProgress.ts:54` | текст |
| `panel.languageSelect.autoDetect` | `src/components/ui/LanguageSelect.tsx:43` | кнопка |
| `panel.languageSelect.chooseLanguage` | `src/components/ui/LanguageSelect.tsx:68` | текст |
| `panel.languageSelect.autoBadge` | `src/components/ui/LanguageSelect.tsx:91` | текст |
| `panel.activity.recentWorks` | `src/components/activity/ActivityStripPanel.tsx:26`<br>`src/components/activity/ActivityStrip.tsx:48` | текст |
| `panel.activity.showRecentWorks` | `src/components/activity/ActivityStrip.tsx:49` | текст |
| `panel.activity.moreCount` | `src/components/activity/ActivityStrip.tsx:83` | лічильник |
| `panel.materialLabel.short` | `src/utils/materialLabel.ts:25` | текст |
| `panel.materialLabel.authorLine` | `src/utils/materialLabel.ts:36` | текст |
| `shared.units.units` | `src/utils/units.ts:65` | текст |
| `shared.units.days` | `src/utils/units.ts:97` | текст |
| `shared.units.works` | `src/utils/units.ts:105` | текст |
| `shared.units.reviews` | `src/utils/units.ts:116` | текст |
| `shared.site.legal.terms` | `src/components/billing/PackagesPurchase.tsx:221`<br>`src/components/site/SiteFooter.tsx:13` | текст |
| `shared.site.legal.refunds` | `src/components/billing/PackagesPurchase.tsx:222`<br>`src/components/site/SiteFooter.tsx:14` | текст |
| `shared.site.legal.privacy` | `src/components/site/SiteFooter.tsx:15` | текст |
| `shared.site.legal.contact` | `src/components/site/SiteFooter.tsx:16` | текст |
| `shared.site.legalNav` | `src/components/site/SiteFooter.tsx:30` | текст |
| `shared.site.company` | `src/components/site/SiteFooter.tsx:44` | текст |
| `shared.site.support` | `src/components/site/SiteFooter.tsx:47` | текст |
| `shared.site.mainNav` | `src/components/site/SiteHeader.tsx:27` | текст |
| `shared.modal.close` | `src/components/ui/Modal.tsx:123` | кнопка |

</details>

### Окремо: ключі та код

- **Код викликає, а в en-каталозі ключа немає:** 0. Усі літерали `panel.*` / `shared.*` у `src/**` (без тестів) є в en-каталозі; ключі без літерала (збірні) в коді панелі не знайдено. Тест `catalogEn.test.ts` теж вимагає ті самі ключі в en і uk. Обмеження методу: ключ, складений у коді з частин (`"panel.x." + y`), не бачить пошук за літералами; таких місць у `panel.*` / `shared.*` я не знайшов (є лише `shared.units.` і `portal.units.`/`portal.recovery.` — коментарі й префікси).
- **Ключі en-каталогу, яких код не викликає:** 0 (з 895 ключів кожен має виклик у файлі, досяжному з `src/main.tsx`). Серед них 107 ключів `panel.criteria.*`.
- **Не підключено:** `src/i18n/translate.ts` збирає англійський каталог лише з `shared.json` і `portal.json` (`const EN = { ...enShared, ...enPortal }`); `en/panel.json` у ньому немає (коміт `82bd5d6` «English catalog (not wired in)»). Поки це так, панель показує uk навіть коли обрано English — див. питання 1.

---

## Зведений список правок

Для одного доручення Antigravity. Усі правки — лише в `src/i18n/catalogs/en/{panel,shared}.json`; заповнювачі й ICU-структура збережені (перевірено за uk). Рядки з **Н** застосовувати лише після погодження назви; з **Q** — після відповіді на питання. «⏎» — перенос рядка в значенні.

| № | Ключ | Було | Стає | Чому | Клас · пріор. · назва |
|---|---|---|---|---|---|
| 1 | `panel.dashboard.statsNodes` | `Total nodes` | `Total sections` | «nodes» → «sections»: на цьому ж екрані картка курсу рахує «sections»; автор бачить розділи, а не вузли. | Н · 2 · Н |
| 2 | `panel.dashboard.documentsCount` | `{count, plural, one {# document} other {# documents}}` | `{count, plural, one {# material} other {# materials}}` | «document» → «material»: так названо матеріал на всіх інших екранах (історія, витрати, завантаження). | Н · 2 · Н |
| 3 | `panel.dashboard.courseDescPlaceholder` | `A short description of the course...` | `A short description of the course…` | Три крапки «...» замість «…» — в інших рядках скрізь «…» (виняток — URL-зразок у `detail.linkPlaceholder`). | С · 3 |
| 4 | `panel.dashboard.courseLanguageHint` | `Used for all materials of the course (STT, metadata generation). Required.` | `Used for all materials in the course (speech-to-text, metadata generation). Required.` | «STT» — скорочення без розшифрування. | Г · 3 |
| 5 | `panel.flow.courseRootNode.documentsCount` | `{count, plural, one {# document} other {# documents}}` | `{count, plural, one {# material} other {# materials}}` | «document» → «material». | Н · 2 · Н |
| 6 | `panel.flow.projectBaseBadge.pending` | `Normalising…` | `Preparing…` | «Normalising» — жаргон; та сама дія названа «Project preparation» у `panel.state.kind.baseNormalize`. | Т · 2 · Н |
| 7 | `panel.flow.projectBase.reuploadWarning` | `Uploading again creates a new version. Existing student submissions stay linked to their own version — the student will see a notice about the update.` | `Uploading again creates a new version. Existing student submissions stay linked to their own version — students will see a notice about the update.` | Одн./мн. узгодити з «Existing student submissions». | Г · 3 |
| 8 | `panel.flow.projectBase.viewManifestHint` | `View the manifest of the normalised starter archive` | `View the manifest of the prepared starter archive` | «normalised» → «prepared» (див. вище). | Т · 2 · Н |
| 9 | `panel.flow.manifest.reason.denylistDir` | `service folder` | `system folder` | «service folder» — калька з «службова тека»; англійською — «system folder». | Г · 2 |
| 10 | `panel.flow.contextMenu.generateSummary` | `Generate the description` | `Generate description` | Пункт меню: без артикля коротше (24 проти 16 знаків). | Д · 3 |
| 11 | `panel.flow.contextMenu.processNotice.refusedItem` | `{name} — could not start processing — try again` | `{name}: could not start processing — try again` | Два довгі тире в одному короткому рядку. | С · 3 |
| 12 | `panel.flow.contextMenu.addChild.placeholder` | `Section name` | `Subsection name` | Заголовок вікна «New subsection», а поле — «Section name». | Т · 3 |
| 13 | `panel.flow.contextMenu.renameModal.doneHint` | `The name has been changed. The node description will not update automatically — if needed, correct it by hand.` | `The name has been changed. The section description will not update automatically — if needed, correct it by hand.` | «node» → «section». | Н · 2 · Н |
| 14 | `panel.flow.detail.noDocuments` | `No documents uploaded yet` | `No materials uploaded yet` | «documents» → «materials». | Н · 2 · Н |
| 15 | `panel.course.backToCourses` | `Back to the course list` | `Back to courses` | Кнопка: 23 знаки проти 16 в uk. | Д · 3 |
| 16 | `panel.course.changeLanguage` | `Change the course language` | `Change course language` | Кнопка: 26 проти 18. | Д · 3 |
| 17 | `panel.ingestErrors.emptyDocument` | `The document has no extractable content — no text block or code file to process was found.` | `The material has no readable content — no text block or code file to process was found.` | «extractable» (калька з «видобувного») неприродне; «document» → «material». | Г · 1 · Н |
| 18 | `panel.ingestErrors.presentationEmptySegment` | `Some slides have no extractable text (images only) — the presentation could not be segmented.` | `Some slides contain no text that can be read (images only) — the presentation could not be split into parts.` | «extractable» і «segmented» — жаргон. | Г · 2 |
| 19 | `panel.ingestErrors.insufficientUnits` | `Processing has not started: there were not enough units for it. The material has been saved — after buying units, start the processing again.` | `Processing did not start: you do not have enough units. The material is saved — after buying units, start processing again.` | «there were not enough units for it» — безособово й незграбно. | Г · 3 |
| 20 | `panel.rolesIntro.paragraph2` | `Why not widen the set of full files without need? Besides spreading the system’s attention thin, it is a direct cost — yours or your students’: the more material the system has to work through, the more both the course preparation and the homework reviews cost. But this is not a call to cut everything — keep in full everything that really relates to the topic of this lesson.` | `Why not widen the set of full files unnecessarily? Besides spreading the system’s attention thin, it is a direct cost — yours or your students’: the more material the system has to work through, the more both the course preparation and the homework reviews cost. But this is not a call to cut everything — keep in full everything that really relates to the topic of this lesson.` | «without need» — калька. | Г · 3 |
| 21 | `panel.rolesIntro.strategy1` | `files that did not pass the security check, and the contents of service folders, were removed by the system during unpacking — they can be neither seen nor brought back;` | `files that did not pass the security check, and the contents of system folders, were removed by the system during unpacking — they can be neither seen nor brought back;` | те саме. | Г · 2 |
| 22 | `panel.rolesIntro.strategy3` | `mark as auxiliary the files you created within the project that are not central to the topic of the lesson: the system will know they are secondary — none of their concepts will become a main concept of the lesson, and the Mentor will keep them only as reference background;` | `mark as auxiliary the files you created within the project that are not central to the topic of the lesson: the system will know they are secondary — none of their concepts will become a core concept of the lesson, and the Mentor will keep them only as reference background;` | «main concept» → «core concept». | Н · 2 · Н |
| 23 | `panel.rolesIntro.strategy4` | `mark as not essential to the topic the automatically generated files, standard libraries and trivial files: the system understands their role and content perfectly well — only a mention in the project tree will remain in the course.` | `mark automatically generated files, standard libraries and trivial files as not essential to the topic: the system understands their role and content perfectly well — only a mention in the project tree will remain in the course.` | Порядок слів «mark as not essential to the topic the … files» — дієслово відірване від додатка. | Г · 1 |
| 24 | `panel.rolesIntro.ackLabel` | `I have read it, got it` | `I have read and understood this` | «I have read it, got it» — розмовне для підпису прапорця. | Г · 2 |
| 25 | `panel.codeStructure.denylistDir` | `A service folder of an environment or an editor.` | `A system folder of an environment or an editor.` | те саме. | Г · 2 |
| 26 | `panel.codeStructure.denylistFile` | `A service file of the system or an editor.` | `A system file of the operating system or an editor.` | те саме; «of the system» — незрозуміло, якої. | Г · 2 |
| 27 | `panel.codeStructure.oversize` | `The file is too large — not taken for reading.` | `The file is too large — it was not read.` | «not taken for reading» — калька. | Г · 2 |
| 28 | `panel.codeStructure.oversizeDetail` | `The file is too large: {size}, against a limit of {cap}.` | `The file is too large: {size} (the limit is {cap}).` | «against a limit of» — юридичний зворот; і довше за uk (56 проти 38). | Г · 3 |
| 29 | `panel.upload.dialog.title` | `Document type` | `Material type` | «Document type» → «Material type». | Н · 2 · Н |
| 30 | `panel.upload.dialog.choosePrompt` | `Choose the document type before uploading:` | `Choose the material type before uploading:` | «document» → «material». | Н · 2 · Н |
| 31 | `panel.upload.role.methodologicalDesc` | `States the intentions of the course` | `States the course’s intent` | Опис варіанта: 35 проти 21. | Д · 3 |
| 32 | `panel.upload.taskType.prompt` | `If the document is a specific assignment, choose its type:` | `If the material is a specific assignment, choose its type:` | «document» → «material». | Н · 2 · Н |
| 33 | `panel.upload.code.label` | `This is a code material` | `Code material` | Підпис прапорця: 23 проти 15. | Д · 3 |
| 34 | `panel.upload.code.desc` | `The HTML file will be taken verbatim as a code example, without extracting prose (an article and code differ only by your intent).` | `The HTML file will be taken verbatim as a code example, without extracting prose (an article and code differ only in your intent).` | «differ only by» → «differ only in». | Г · 3 |
| 35 | `panel.upload.note.testRefused` | `A test is uploaded only as a YAML file (.yaml or .yml). Choose another kind of assignment or upload a YAML file.` | `A test is uploaded only as a YAML file (.yaml or .yml). Choose another assignment type or upload a YAML file.` | «another kind of assignment» — у діалозі це «type». | Т · 3 |
| 36 | `panel.upload.note.codeActive` | `Code material: your own files will go into the lesson in full. Typical and service files — dependencies, standard libraries, generated and oversized files — will remain only as a mention in the project structure.` | `Code material: your own files will go into the lesson in full. Standard and system files — dependencies, standard libraries, generated and oversized files — will remain only as a mention in the project structure.` | те саме; «Typical» → «Standard». | Г · 2 |
| 37 | `panel.fileRoles.reason.denylistDir` | `service folder` | `system folder` | те саме. | Г · 2 |
| 38 | `panel.fileRoles.reason.denylistFile` | `service file` | `system file` | те саме. | Г · 2 |
| 39 | `panel.confirmRoles.noProposal` | `There is no file role proposal for this document yet.` | `There is no file role proposal for this material yet.` | «document» → «material». | Н · 2 · Н |
| 40 | `panel.confirmRoles.loadFailed` | `Could not load the document.` | `Could not load the material.` | «document» → «material». | Н · 2 · Н |
| 41 | `panel.confirmRoles.saveIncomplete` | `The marking is incomplete or contains an extra path. Try again.` | `The roles are incomplete or include a file that is not in the project. Try again.` | «The marking … an extra path» — жаргон («розмітка», «шлях»). | Г · 2 |
| 42 | `panel.confirmRoles.removedLine` | `The system removed {count, plural, one {# file} other {# files}} (security or service folders) — they are shown only in the project structure; they cannot be brought back.` | `The system removed {count, plural, one {# file} other {# files}} (for security reasons or because they were in system folders) — they are shown only in the project structure and cannot be brought back.` | «security or service folders» — незрозуміло, що саме; «service» → «system». Також: в uk тут немає ICU-множини (див. «Питання», п. 9). | Г · 1 |
| 43 | `panel.flow.summaryBadge.materialsChangedHint` | `The node’s materials changed after the description was generated` | `The section’s materials changed after the description was generated` | «node» → «section». | Н · 2 · Н |
| 44 | `panel.flow.rejectionNotice.description` | `There are outdated nodes outside the subtree ({count}). Go to them to review them, or generate anyway with a forced run.` | `There are outdated sections outside this branch of the course ({count}). Go to them to review, or generate anyway.` | «nodes outside the subtree» → «sections outside this branch»; «review them» повторює «Go to them»; «with a forced run» → кнопка «Generate anyway». | Н · 2 · Н |
| 45 | `panel.flow.rejectionNotice.goToNode` | `Go to the node` | `Go to the section` | «node» → «section». | Н · 2 · Н |
| 46 | `panel.flow.rejectionNotice.generateForce` | `Generate with force` | `Generate anyway` | «with force» — жаргон (uk лишає латиницею); кнопка запускає генерацію попри застарілі розділи. «force» у `retryProcessingForceHint` лишено — питання 5. | Г · 2 · Н |
| 47 | `panel.flow.pipeline.generateTitle` | `Layer 3: Node description (NodeSummary)` | `Layer 3: Section description (NodeSummary)` | «Node» → «Section»; внутрішня назва «NodeSummary» у дужках — див. питання 5. | Н · 2 · Н |
| 48 | `panel.flow.pipeline.generateDescription` | `Two-pass generation of the methodological description of this node’s subtree. Pass 1 (bottom-up) — summarising the child nodes; pass 2 (top-down) — the enclosing context of each node’s position.⏎⏎Starts a background run; the progress and the result are shown in the status card at the bottom right. Nodes that are already fresh are skipped (memoised by hash).` | `Two-pass generation of the methodological description of this section and its subsections. Pass 1 (bottom-up) — summarising the subsections; pass 2 (top-down) — the enclosing context of each section’s position.⏎⏎Starts a background run; the progress and the result are shown in the status card at the bottom right. Sections that are already up to date are skipped (memoised by hash).` | «node/nodes» → «section/subsection»; «fresh» → «up to date». | Н · 2 · Н |
| 49 | `panel.flow.summary.notYetGenerated` | `No description has been generated for this node yet.` | `No description has been generated for this section yet.` | «node» → «section». | Н · 2 · Н |
| 50 | `panel.flow.summary.nodeNotFound` | `The description is not available — the node was not found.` | `The description is not available — the section was not found.` | «node» → «section». | Н · 2 · Н |
| 51 | `panel.flow.summary.modalTitle` | `Node description — {title}` | `Section description — {title}` | «Node» → «Section». Назву вікна цитують тексти критеріїв (див. питання 2). | Н · 2 · Н |
| 52 | `panel.flow.summary.acceptRawHint` | `Overwrite the description with the generated one (Raw) and approve it` | `Replace the description with the generated one and approve it` | «(Raw)» — внутрішній термін; «Overwrite» різкіше, ніж потрібно. | Г · 3 |
| 53 | `panel.flow.summary.field.mainConcepts` | `Main concepts` | `Core concepts` | «Main concepts» → «Core concepts» (пропонована назва). | Н · 2 · Н |
| 54 | `panel.flow.summary.field.enclosingContext` | `Enclosing context` | `Surrounding context` | «Enclosing» — калька з «охоплюючий»; природне «surrounding». | Г · 2 |
| 55 | `panel.flow.summary.field.rawObservations` | `Methodist’s observations` | `Methodologist’s observations` | «Methodist» англійською — прихильник релігійної течії; для ролі, що складає методичний опис, природне «methodologist». | Г · 1 · Н |
| 56 | `panel.flow.summary.metrics` | `Documents: {docs} (with subtree {cumDocs}) · characters: {chars} (with subtree {cumChars})` | `Materials: {docs} ({cumDocs} including subsections) · characters: {chars} ({cumChars} including subsections)` | «document» → «material»; «with subtree» — калька; «Documents… · characters…» — різний регістр у межах рядка. | Н · 2 · Н |
| 57 | `panel.flow.summary.placeholder.description` | `Methodological description of the node` | `Methodological description of the section` | «node» → «section». | Н · 2 · Н |
| 58 | `panel.testEditor.replaceYaml` | `Replace from YAML…` | `Replace from a YAML file…` | «from YAML» без іменника; у заголовку вікна (`replaceYamlTitle`) уже «with a file». | Г · 3 |
| 59 | `panel.testEditor.passThreshold` | `Pass threshold, %` | `Pass mark, %` | «Pass threshold» → «Pass mark». | Н · 2 · Н |
| 60 | `panel.testEditor.passThresholdHint` | `Optional. If set, the student will see “passed” or “not passed”; without a threshold, only the score.` | `Optional. If set, the student will see “passed” or “not passed”; without a pass mark, only the score.` | «threshold» → «pass mark». | Н · 2 · Н |
| 61 | `panel.testEditor.takeModelText` | `Use the model’s text as a starting point` | `Start from the model’s text` | Кнопка: 40 проти 28. | Д · 3 |
| 62 | `panel.testEditor.doubtText` | `The model doubts the correct-answer marks for this question. Check them: if you change the marks and check again, the model will assess them anew. If the marks are correct, write your own explanation — the student will see exactly that, because the model’s explanation for a question with a doubt is not shown to the student.` | `The model doubts the correct-answer marks for this question. Check them: if you change the marks and check again, the model will assess them again. If the marks are correct, write your own explanation — the student will see exactly that, because the model’s explanation for a question with a doubt is not shown to the student.` | «anew» — книжне. | Г · 3 |
| 63 | `panel.testEditor.firstPublication` | `The students of the course will see the test.` | `Students in the course will see the test.` | «The students of the course» — калька (довше за uk: 45 проти 29 знаків). | Д · 3 |
| 64 | `panel.testEditor.publishChecked` | `The model’s explanations are already ready.` | `The model’s explanations are ready.` | «already ready» — тавтологія. | Г · 2 |
| 65 | `panel.testEditor.checkReadyDoubts` | `The model has a doubt about some questions — they are marked.` | `The model has doubts about some questions — they are marked.` | «has a doubt about some questions» — однина не в парі з «some questions». | Г · 2 |
| 66 | `panel.testEditor.replaceYamlText` | `The questions, options, marks, threshold and your own explanations will be replaced with the contents of the file “{fileName}”. If the file has a title, the test will get it. The published version will not change until you publish the test again.` | `The questions, options, marks, pass mark and your own explanations will be replaced with the contents of the file “{fileName}”. If the file has a title, the test will get it. The published version will not change until you publish the test again.` | «threshold» → «pass mark». | Н · 2 · Н |
| 67 | `panel.testRefusals.backToCourses` | `Back to the course list` | `Back to courses` | Те саме, і однакові кнопки мають бути однакові. | Д · 3 |
| 68 | `panel.testRefusals.saveRefused.fieldInvalid` | `Could not save the title or the threshold: check them.` | `Could not save the title or the pass mark: check them.` | «threshold» → «pass mark». | Н · 2 · Н |
| 69 | `panel.testRefusals.fileReason.fieldInvalid` | `a field is written incorrectly — check the field’s name, kind and length against the “Tests” page` | `a field is written incorrectly — check the field’s name, type and length against the “Tests” page` | «kind» → «type» (у діалозі завантаження це «type»). | Т · 3 |
| 70 | `panel.testRefusals.problem.passThreshold` | `The threshold is a whole number from 1 to 100.` | `The pass mark must be a whole number from 1 to 100.` | «threshold» → «pass mark»; «The threshold is …» → «must be …» (повідомлення про вимогу). | Н · 2 · Н |
| 71 | `panel.students.pagination.prev` | `Back` | `Previous` | те саме. | Г · 3 |
| 72 | `panel.students.error.network` | `Could not connect to the server. Please try again.` | `Could not connect to the platform. Try again.` | «server» — а на екрані входу «platform» (`login.error.offline`); «Please» додано, а в uk його немає. | Т · 3 |
| 73 | `panel.history.pagination.prev` | `Back` | `Previous` | «Back» поруч із «Next» — пара «Previous / Next»; «Back» — ще й «повернутися». | Г · 3 |
| 74 | `panel.billing.runsOut` | `At your pace, your units will last for about {days}.` | `At your current pace, your units will last about {days}.` | «At your pace… for about» — неприродний порядок слів. | Г · 2 |
| 75 | `panel.billing.expiring` | `{units} will expire on {date}: that is when the package’s term ends.` | `{units} will expire on {date}, when the package term ends.` | Двокрапка й «that is when» — калька; ширше «when the package term ends». | Г · 3 |
| 76 | `panel.cost.idle` | `Your costs in units for material processing will be shown here, broken down by course. They will appear as soon as the platform starts charging units. No units are being charged right now.` | `Your costs in units for material processing will be shown here, broken down by course. They will appear as soon as the platform starts deducting units. No units are being deducted right now.` | «charge» → «deduct»; uk каже «списувати». | Н · 2 · Н |
| 77 | `panel.cost.spentInMonth` | `Spent in {month}: {units}.` | `Used in {month}: {units}.` | «Spent» → «Used» (пропонована назва). | Н · 2 · Н |
| 78 | `panel.cost.covered` | `Covered by the platform or by arrangement: {units}.` | `Covered by the platform or under an agreement: {units}.` | «by arrangement» — не вживається так про домовленість. | Г · 2 |
| 79 | `panel.cost.table.reviewing` | `Work reviews` | `Homework reviews` | «Work reviews» неприродно (work — незлічуване); поняття «Homework review». | Г · 1 · Н |
| 80 | `panel.cost.table.totalSpent` | `Total spent` | `Total used` | «Spent» → «used». | Н · 2 · Н |
| 81 | `panel.homeworkCost.idle` | `Your costs in units related to homework will be shown here, broken down by course and assignment. They will appear as soon as the platform starts charging units. No units are being charged right now.` | `Your costs in units for homework review will be shown here, broken down by course and assignment. They will appear as soon as the platform starts deducting units. No units are being deducted right now.` | «charge» → «deduct»; «homework» → «homework review» — як у заголовку екрана. | Н · 2 · Н |
| 82 | `panel.homeworkCost.emptyMonth` | `No homework costs this month.` | `No homework review costs this month.` | Узгодити із заголовком екрана «Homework review costs». | Т · 3 · Н |
| 83 | `panel.homeworkCost.spent` | `Spent:` | `Used:` | «Spent» → «Used». | Н · 2 · Н |
| 84 | `panel.homeworkCost.table.spent` | `Spent` | `Used` | «Spent» → «Used». | Н · 2 · Н |
| 85 | `panel.priceEstimate.mayFallShort` | `You may not have enough units for all the files together: processing stops for the files there are not enough units for, and you can start it again after a purchase.` | `You may not have enough units for all the files together. Processing stops for the files you cannot cover; you can restart it after buying more units.` | Одне довге речення з «there are not enough units for» — розбити. | Г · 2 |
| 86 | `panel.priceEstimate.short` | `This action costs about {price}, and you have {available}. You are {missing} short.` | `This action costs about {price}, and you have {available}. You need {missing} more.` | «You are … short» — розмовне; у `panel.billing.heldReviews.waiting` те саме сказано «you need … more». | Г · 2 |
| 87 | `shared.billing.kind.adminCredit` | `Credited by the platform administrator` | `Added by the platform administrator` | «credited» — слово, якого уникаємо; пропоноване «added» (uk: «Нараховано»). | Х · 1 |
| 88 | `shared.billing.kind.benefitCovered` | `Paid by the platform by arrangement` | `Paid by the platform under an agreement` | Те саме, що в `panel.cost.covered`. | Г · 2 |
| 89 | `shared.billing.kind.other` | `Other unit movement` | `Other change in units` | «Other unit movement» — калька. | Г · 2 |
| 90 | `shared.billing.charge.taskPreparation` | `Preparing a task for review` | `Preparing an assignment for review` | «task» → «assignment» (пропонована назва; на екрані «Витрати» вже «Assignment preparation»). | Т · 1 · Н |
| 91 | `shared.billing.charge.review` | `Work review` | `Homework review` | «Work review» → «Homework review». | Г · 1 · Н |
| 92 | `shared.billing.charge.other` | `Charge for an action` | `Units deducted for an action` | «Charge» → «deduct» (uk: «Списання за дію»). | Н · 2 · Н |
| 93 | `shared.consent.checkbox` | `I have read and accept the Terms of Use and the Refunds rules.` | `I have read and accept the Terms of Use and the Refund rules.` | «Refunds rules» — іменник у множині перед іменником; сторінка сайту — «Refunds». Текст згоди хешується — питання 4. | Г · 2 · Q |
| 94 | `shared.consent.refundsLinkWords` | `Refunds rules` | `Refund rules` | Має збігатися з підрядком у `shared.consent.checkbox`. | Г · 2 · Q |
| 95 | `shared.payment.credited` | `{units} credited. You now have {available} available.` | `{units} added. You now have {available} available.` | «credited» — слово, якого уникаємо; пропоноване «added». | Х · 1 |
| 96 | `shared.payment.failed` | `The payment did not go through — no units were credited. You can choose a package again.` | `The payment did not go through — no units were added. You can choose a package again.` | «credited» — слово, якого уникаємо. | Х · 1 |
| 97 | `shared.payment.crediting` | `Crediting…` | `Adding units…` | «Crediting» — форма слова, якого уникаємо (автоперевірка за списком її не ловить); «Adding units…» читається краще за «Adding…». | Х · 1 |
| 98 | `shared.statement.empty` | `No unit movements yet.` | `No unit history yet.` | «movements» — калька з «рухи»; заголовок екрана — «Unit history». | Т · 2 |
| 99 | `panel.help.steps.step6.part1` | `When everything is uploaded, run the Methodist for the whole course — ` | `When everything is uploaded, run the Methodologist for the whole course — ` | те саме слово, що вище (питання 3). | Г · 1 · Н |
| 100 | `panel.help.steps.step6.link` | `Section descriptions: the Methodist` | `Section descriptions: the Methodologist` | те саме слово, що вище. | Г · 1 · Н |
| 101 | `panel.help.section2.instruction` | `Press the button — a ready email will open, with the address and subject already filled in. Add what you were doing before that, and attach a screenshot if it helps.` | `Press the button — an email will open with the address and subject already filled in. Add what you were doing before that, and attach a screenshot if it helps.` | «a ready email … already filled in» — повтор. | Г · 3 |
| 102 | `panel.help.section2.checklistTitle` | `What is good to have in the email:` | `What to include in the email:` | «What is good to have» — калька; коротше (34 проти 22). | Г · 2 |
| 103 | `panel.header.nav.homeworkCost` | `Homework costs` | `Homework review costs` | У заголовку сторінки (`panel.homeworkCost.title`) — «Homework review costs»; у меню — «Homework costs». Те саме поняття — одне слово. | Т · 2 · Н |
| 104 | `panel.state.job.obsolete` | `Obsolete` | `Outdated` | «Obsolete» звучить як «знято з вжитку»; для результату, що застарів, — «Outdated» (так у `rejectionNotice.description`). | Г · 3 |
| 105 | `panel.state.kind.baseNormalize` | `Project preparation` | `Starter archive preparation` | «Project preparation» — «project» тут означає базовий архів, а на екрані завантаження «Project» — тип завдання. | Т · 2 · Н |
| 106 | `panel.sourceType.web` | `Web` | `Web page` | Тип джерела — веб-сторінка; у `pipeline.processDescription` вона названа «web pages». | Г · 3 |
| 107 | `panel.workProgress.unit.node` | `node` | `section` | Слово видно в підписі смуги «node 3 of 10»; автор бачить розділи. | Н · 2 · Н |
| 108 | `shared.units.works` | `{count, plural, one {{n} piece of work} other {{n} pieces of work}}` | `{count, plural, one {{n} submission} other {{n} submissions}}` | «piece of work / pieces of work» — калька, у реченні «…waiting for units: 3 pieces of work» звучить неприродно. | Г · 1 |

### Правки за назвами (для швидкого рішення)

Скільки правок спирається на кожну пропоновану назву (одна правка може бути в двох списках):

- **added (не credited)** — 4: №87, 95, 96, 97.
- **deduct / used (не charge / spent)** — 7: №76, 77, 80, 81, 83, 84, 92.
- **Homework review** — 5: №79, 81, 82, 91, 103.
- **assignment (не task)** — 1: №90.
- **section (не node)** — 12: №1, 13, 43, 44, 45, 47, 48, 49, 50, 51, 57, 107.
- **material (не document)** — 10: №2, 5, 14, 17, 29, 30, 32, 39, 40, 56.
- **core concepts** — 2: №22, 53.
- **pass mark** — 5: №59, 60, 66, 68, 70.
- **starter archive** — 3: №6, 8, 105.

---

## Питання

Оператора немає до ≈ 20:40, тому нічого не чекав — це те, що лишилося неясним; у тексті правок воно вирішено так, як написано в «Стає».

1. **Англійський каталог панелі не підключено** (`translate.ts`: `EN = { ...enShared, ...enPortal }`; `en/panel.json` читає лише тест). Це навмисно до завершення огляду? Після підключення варто пройти екрани в браузері: довжини й переноси тут оцінено лише за знаками.
2. **Чи мають uk і en розходитися в назвах?** Пропоновані «section», «material», «core concepts», «pass mark» в uk-каталозі зараз інші: вузол / документ / основні концепти / поріг заліку. Якщо назви приймають лише для en — вони розійдуться з uk (наприклад, у `dashboard.*`, `flow.summary.*`, `upload.*`). Якщо для обох — uk-каталог теж треба змінити окремим дорученням. Окремо: тексти `panel.criteria.*` цитують назви, які тут змінюються — вікно «Node description» (`criteria.concepts.empty`, `contradictions.fixHint`), «main concepts» (`concepts.hint`, `refusal.unknownConcept`), «threshold» (`criteria.pass.strict`, `pass.score`). Їх узгодити в роботі, що веде `criteria`.
3. **«Methodist» → «Methodologist».** Англійською «Methodist» — член церкви, тож «Methodist’s observations» і «run the Methodist» читаються неправильно. Чи закріплене це ім’я англійською на сайті документації? Потрібне рішення, як називати агента в продукті (я вжив «Methodologist»).
4. **Текст згоди хешується.** `consentSha256` рахується від чотирьох рядків (`shared.consent.author.title`, `checkbox`, `summary`, `change`), тож будь-яка правка `shared.consent.checkbox` / `refundsLinkWords` змінює відбиток (в uk і en він різний). Правки з позначкою **Q** (№93, 94) вносити лише з урахуванням того, як версіюється згода. Сторінка сайту названа «Refunds»; у тексті згоди — «Refunds rules».
5. **Внутрішні слова у видимих текстах (лишено без правки):** `NodeSummary` (`flow.pipeline.generateTitle`), «Raw» (`flow.summary.acceptRawHint`, в дужках), «force» (`flow.detail.retryProcessingForceHint`, `rejectionNotice.generateForce` — другу замінено), «memoised by hash», «Idempotent … snapshots» (`flow.pipeline.processDescription`). Автору вони потрібні? Те саме в uk.
6. **`panel.students.portalOriginMissing`** показує автору «VITE_PORTAL_ORIGIN is not set» — назва змінної середовища; в uk теж. Замінити на «The portal link is not available: the portal address is not set up. Write to the platform administrator.»?
7. **`panel.flow.runState.expectedReason`** — «Expected: {reason}» показується біля рядків із попередженням (не помилки). Англійською «Expected:» неясне; можливі «As expected:» або «Not an error:». Потрібно знати, які саме причини сюди потрапляють.
8. **Варіант англійської.** `languages.ts` задає `en-GB`, і каталог послідовно британський (enrolment, analysed, normalised, artefact, Cancelled, summarising). Британські форми я не вважаю помилкою; «Normalising» у списку — через жаргон, а не правопис. Якщо потрібен американський — окремий прохід.
9. **uk-сторона (поза доручення):** `panel.confirmRoles.removedLine` в uk — «{count} файл(ів)» без ICU-множини; в en множина є. `shared.statement.title`: en «Unit history», uk «Рухи юнітів» — слова різні; в en вибрано «history» і замінено «movements» в `statement.empty`.
10. **`shared.packages.sellerNote`** каже, що назву продавця буде показано на сторінці оплати; у `CLAUDE.md` сайту його названо з 22.11.2026. Чи треба й тут називати Creem?
11. **«Role» vs «type»** для навчальний / методичний лишено «type» (як у uk): діалог завантаження — «Material type», підказка на бейджі — «type». Ключі `role…` — внутрішні. Якщо назвати «role», то з екраном `confirmRoles` (ролі файлів) вийде плутанина.

