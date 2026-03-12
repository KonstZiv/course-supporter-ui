import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { nodesApi } from '../api/nodes'
import { reportsApi } from '../api/reports'
import type { NodeResponse, CostReport } from '../types/api'
import { motion } from 'framer-motion'
import {
  Plus,
  BookOpen,
  Layers,
  Paperclip,
  DollarSign,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'

export function DashboardPage() {
  const [courses, setCourses] = useState<NodeResponse[]>([])
  const [report, setReport] = useState<CostReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [coursesRes, costRes] = await Promise.all([
        nodesApi.listRoots(50),
        reportsApi.cost().catch(() => null),
      ])
      setCourses(coursesRes.items)
      setReport(costRes)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const course = await nodesApi.createRoot(newTitle.trim(), newDesc.trim() || undefined)
      setShowCreate(false)
      setNewTitle('')
      setNewDesc('')
      navigate(`/course/${course.id}`)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="page-title">Мої курси</h1>
          <p className="page-subtitle">
            {courses.length > 0
              ? `${courses.length} ${courses.length === 1 ? 'курс' : courses.length < 5 ? 'курси' : 'курсів'}`
              : 'Створіть перший курс'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} />
          Новий курс
        </button>
      </div>

      {/* Stats row */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={BookOpen}
            label="Курсів"
            value={String(courses.length)}
            color="navy"
          />
          <StatCard
            icon={Layers}
            label="Всього вузлів"
            value={String(courses.reduce((s, c) => s + (c.children_count ?? 0), 0))}
            color="forest"
          />
          <StatCard
            icon={DollarSign}
            label="Витрати LLM"
            value={`$${report.summary.total_cost_usd.toFixed(2)}`}
            color="amber"
          />
        </div>
      )}

      {/* Course grid */}
      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Ще немає курсів"
          description="Створіть перший курс, додайте навчальні матеріали та згенеруйте структуру"
          action={
            <button className="btn-primary btn-lg" onClick={() => setShowCreate(true)}>
              <Plus size={18} />
              Створити перший курс
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <button
                onClick={() => navigate(`/course/${course.id}`)}
                className="card w-full text-left p-5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-navy-pale flex items-center justify-center">
                    <BookOpen size={18} className="text-navy" />
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-ink-muted opacity-0 group-hover:opacity-100
                               transition-all group-hover:translate-x-1"
                  />
                </div>
                <h3 className="font-display text-lg text-ink mb-1 line-clamp-2">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="text-ink-muted text-sm line-clamp-2 mb-3">
                    {course.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-ink-muted">
                  <span className="flex items-center gap-1">
                    <Layers size={12} />
                    {course.children_count ?? 0} розділів
                  </span>
                  <span className="flex items-center gap-1">
                    <Paperclip size={12} />
                    {course.materials_count ?? 0} матеріалів
                  </span>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новий курс">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Назва курсу</label>
            <input
              className="input"
              placeholder="Наприклад: Python для початківців"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Опис <span className="text-ink-muted">(необов'язково)</span>
            </label>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="Короткий опис курсу..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>
              Скасувати
            </button>
            <button className="btn-primary" onClick={create} disabled={creating || !newTitle.trim()}>
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Створити
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof BookOpen
  label: string
  value: string
  color: 'navy' | 'forest' | 'amber'
}) {
  const bg = { navy: 'bg-navy-pale', forest: 'bg-forest-pale', amber: 'bg-amber-pale' }
  const fg = { navy: 'text-navy', forest: 'text-forest', amber: 'text-amber' }

  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${bg[color]} flex items-center justify-center`}>
        <Icon size={20} className={fg[color]} />
      </div>
      <div>
        <p className="text-2xl font-bold text-ink">{value}</p>
        <p className="text-sm text-ink-muted">{label}</p>
      </div>
    </div>
  )
}
