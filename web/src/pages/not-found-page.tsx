import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">404</p>
      <h1 className="font-heading mt-3 text-3xl text-slate-100">Route not found</h1>
      <p className="mt-3 max-w-md text-sm text-slate-400">
        The URL does not match an existing screen in this frontend.
      </p>
      <Link to="/">
        <Button className="mt-6">Return to start</Button>
      </Link>
    </div>
  )
}
