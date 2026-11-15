// "Витрати": the author's spending on processing materials. The author does
// not see what model calls cost in dollars (product owner's decision), so the
// page makes no request and shows no money; it will show the author's spending
// in units, by course, once the platform starts charging units. Until then it
// says so. costApi (src/api/cost.ts) stays for that work.
export function CostPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="page-title">Витрати</h1>
      </div>

      <div className="card p-6">
        <p className="text-ink">
          Тут будуть ваші витрати в юнітах на обробку матеріалів — з розбивкою по
          курсах. Вони з'являться, щойно платформа почне списувати юніти. Зараз
          юніти не списуються.
        </p>
      </div>
    </div>
  )
}
