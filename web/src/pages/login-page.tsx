import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useLoginMutation } from '@/features/auth/api'
import { useAuth } from '@/features/auth/auth-context'
import { getErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type RedirectState = {
  from?: string
  registered?: boolean
}

export function LoginPage() {
  const { isAuthenticated, setToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const redirectPath = useMemo(() => {
    const state = location.state as RedirectState | null
    return state?.from || '/app/process'
  }, [location.state])
  const justRegistered = Boolean((location.state as RedirectState | null)?.registered)

  const loginMutation = useLoginMutation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/app/process" replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          setToken(data.access_token)
          navigate(redirectPath, { replace: true })
        },
      },
    )
  }

  return (
    <Card className="border-slate-800 bg-slate-950/90">
      <CardHeader>
        <CardTitle className="text-2xl">Sign in to audio console</CardTitle>
        <CardDescription>
          Authenticate with your API account to dispatch DSP jobs.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {justRegistered ? (
          <p className="mb-4 inline-flex w-full items-center gap-2 rounded-lg border border-emerald-300/40 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
            <CheckCircle2 size={16} />
            Account created. Sign in to continue.
          </p>
        ) : null}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {loginMutation.isError ? (
            <p className="rounded-lg border border-rose-400/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
              {getErrorMessage(loginMutation.error)}
            </p>
          ) : null}

          <Button className="w-full" size="lg" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            <ArrowRight size={16} />
          </Button>
        </form>

        <p className="mt-5 text-sm text-slate-400">
          Need an account?{' '}
          <Link className="text-emerald-300 hover:text-emerald-200" to="/register">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
