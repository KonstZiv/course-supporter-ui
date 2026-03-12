import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-canvas">
      <Header />
      <main className="mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
