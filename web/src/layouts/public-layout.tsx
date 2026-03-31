import { AudioLines } from 'lucide-react'
import { Outlet } from 'react-router-dom'

export function PublicLayout() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="grid min-h-[calc(100vh-5rem)] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70 shadow-[0_0_80px_-40px_rgba(20,184,166,0.45)] backdrop-blur md:grid-cols-[1.2fr_1fr]">
        <aside className="relative hidden overflow-hidden border-r border-slate-800 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.2),transparent_45%),radial-gradient(circle_at_85%_40%,rgba(56,189,248,0.2),transparent_40%),linear-gradient(130deg,#050816_0%,#090d1d_50%,#050816_100%)] p-10 md:block">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:38px_38px]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/50 bg-emerald-300/20 text-emerald-200">
                <AudioLines size={22} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
                Event-Driven DSP
              </p>
              <h1 className="font-heading text-4xl leading-tight text-slate-100">
                Build your signal chain. Dispatch in milliseconds.
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-slate-300">
                Authenticate, configure effects, and push audio jobs into the distributed queue.
                Worker execution remains asynchronous by design.
              </p>
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              NestJS API + RabbitMQ + Rust Worker
            </p>
          </div>
        </aside>

        <main className="flex items-center justify-center bg-slate-950/85 p-6 sm:p-8">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
