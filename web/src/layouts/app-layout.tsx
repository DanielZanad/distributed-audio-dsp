import { AudioLines, LogOut, UserCircle2 } from 'lucide-react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useProfileQuery } from '@/features/auth/api'
import { useAuth } from '@/features/auth/auth-context'
import { Button } from '@/components/ui/button'

export function AppLayout() {
  const { token, logout } = useAuth()
  const profileQuery = useProfileQuery(token)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (profileQuery.isPending) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-6 py-5 text-sm text-slate-300">
          Validating session...
        </div>
      </div>
    )
  }

  if (profileQuery.isError) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4">
        <div className="max-w-md space-y-4 rounded-2xl border border-rose-300/40 bg-rose-950/30 p-6 text-sm text-rose-100">
          <p>Unable to load profile data. Your token may be expired.</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => profileQuery.refetch()}>
              Retry
            </Button>
            <Button variant="danger" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="min-h-[calc(100vh-4rem)] rounded-3xl border border-slate-800 bg-slate-950/70 shadow-[0_0_80px_-42px_rgba(45,212,191,0.5)] backdrop-blur">
        <header className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/40 bg-emerald-300/10 text-emerald-200">
              <AudioLines size={18} />
            </div>
            <div>
              <p className="font-heading text-base font-semibold text-slate-100">Audio Console</p>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Event-Driven Pipeline</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <NavLink
              to="/app/process"
              className={({ isActive }) =>
                [
                  'rounded-lg px-3 py-2 text-sm transition',
                  isActive
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100',
                ].join(' ')
              }
            >
              Process
            </NavLink>
            <NavLink
              to="/app/library"
              className={({ isActive }) =>
                [
                  'rounded-lg px-3 py-2 text-sm transition',
                  isActive
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100',
                ].join(' ')
              }
            >
              Library
            </NavLink>
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300">
              <UserCircle2 size={14} />
              {profileQuery.data.username}
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut size={14} />
              Logout
            </Button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
