// "Витрати ДЗ": the author's spending tied to homework. The author does not see
// what model calls cost in dollars (product owner's decision), so the page makes
// no request and shows no money; it will show the author's spending in units,
// by course and task, once the platform starts charging units. Until then it
// says so. costApi (src/api/cost.ts) and HomeworkCostTree
// (src/components/cost/) stay, unused, for that work.
export function HomeworkCostPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="page-title">Витрати на перевірку ДЗ</h1>
      </div>

      <div className="card p-6">
        <p className="text-ink">
          Тут будуть ваші витрати в юнітах, пов'язані з домашніми завданнями, — з
          розбивкою по курсах і завданнях. Вони з'являться, щойно платформа почне
          списувати юніти. Зараз юніти не списуються.
        </p>
      </div>
    </div>
  )
}
