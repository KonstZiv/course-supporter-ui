import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { useActivityStrip } from '../../hooks/useActivityStrip'

export function AppLayout() {
  // The activity-strip poll lives here — above the route outlet — so it survives
  // child-route changes (В3). This commit only mounts the session-long loop in
  // the shell; the two display floors land in the next commit.
  useActivityStrip()
  return (
    <div className="min-h-screen bg-canvas">
      <Header />
      <main className="mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
