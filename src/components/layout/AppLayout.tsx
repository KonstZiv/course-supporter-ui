import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { useActivityStrip } from '../../hooks/useActivityStrip'

export function AppLayout() {
  // The activity-strip poll lives here — above the route outlet — so it survives
  // child-route changes (В3). The last successful list feeds the header's
  // collapsed floor (and, when opened, the detailed panel).
  const { items } = useActivityStrip()
  return (
    <div className="min-h-screen bg-canvas">
      <Header stripItems={items} />
      <main className="mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
