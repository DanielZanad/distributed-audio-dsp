import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useRegisterMutation } from '@/features/auth/api'
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

export function RegisterPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const registerMutation = useRegisterMutation()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/app/process" replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    registerMutation.mutate(
      {
        username,
        email,
        password,
        avatar_url: avatarUrl.trim().length > 0 ? avatarUrl.trim() : undefined,
      },
      {
        onSuccess: () => {
          navigate('/login', {
            replace: true,
            state: { registered: true },
          })
        },
      },
    )
  }

  return (
    <Card className="border-slate-800 bg-slate-950/90">
      <CardHeader>
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>Register a user to access processing endpoints.</CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </div>

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
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar_url">Avatar URL (optional)</Label>
            <Input
              id="avatar_url"
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://example.com/avatar.png"
            />
          </div>

          {registerMutation.isError ? (
            <p className="rounded-lg border border-rose-400/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
              {getErrorMessage(registerMutation.error)}
            </p>
          ) : null}

          <Button
            className="w-full"
            size="lg"
            type="submit"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <div className="mt-5 flex flex-col gap-3 text-sm text-slate-400">
          <p>
            Already have an account?{' '}
            <Link className="text-emerald-300 hover:text-emerald-200" to="/login">
              Sign in
            </Link>
          </p>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-slate-500">
            <CheckCircle2 size={14} />
            Account creation calls `POST /api/users/register`
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
