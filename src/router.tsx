import {
  createBrowserRouter,
  type DataRouter,
  type RouteObject,
} from 'react-router-dom'
import App from './App'
import { RouteErrorPage } from './pages/RouteErrorPage'

/**
 * The author program under a data router (task 07c, decision 12).
 *
 * `useBlocker` — what keeps a page with unsaved changes from being left
 * without a question — works only inside a data router, so the program mounts
 * one. Its pages stay where they were: `App`'s own `<Routes>` sit under a single
 * catch-all route, so every address reaches them as before. A page that fails
 * to render gets `RouteErrorPage` instead of the router's default English screen.
 *
 * `create` builds the router: the browser's by default, and in tests
 * `createMemoryRouter` with the address to start at.
 */
export function createAppRouter(
  create: (routes: RouteObject[]) => DataRouter = createBrowserRouter,
): DataRouter {
  return create([
    { path: '*', element: <App />, errorElement: <RouteErrorPage /> },
  ])
}
