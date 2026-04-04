import { useEffect, useState } from 'react'
import { ExternalLink, LibraryBig, LoaderCircle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAudioJobsQuery } from '@/features/audio/api'
import type { AudioJob } from '@/features/audio/types'
import { useAuth } from '@/features/auth/auth-context'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

export function LibraryPage() {
  const { token } = useAuth()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const jobsQuery = useAudioJobsQuery(token, page, limit)

  const jobs = jobsQuery.data?.items ?? []
  const total = jobsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-950/75">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="inline-flex items-center gap-2">
                <LibraryBig size={18} />
                Audio Library
              </CardTitle>
              <CardDescription>
                View your processed jobs and play results directly via `output_url`.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
                value={limit}
                onChange={(event) => {
                  const nextLimit = Number(event.target.value)
                  setLimit(nextLimit)
                  setPage(1)
                }}
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
              </select>
              <Button
                variant="secondary"
                onClick={() => jobsQuery.refetch()}
                disabled={jobsQuery.isFetching}
              >
                <RefreshCw size={14} className={jobsQuery.isFetching ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {jobsQuery.isPending ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-8 text-sm text-slate-300">
              <LoaderCircle size={16} className="animate-spin" />
              Loading your audio jobs...
            </div>
          ) : null}

          {jobsQuery.isError ? (
            <div className="space-y-3 rounded-xl border border-rose-300/40 bg-rose-950/30 p-4">
              <p className="text-sm text-rose-100">{getErrorMessage(jobsQuery.error)}</p>
              <Button variant="secondary" size="sm" onClick={() => jobsQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : null}

          {!jobsQuery.isPending && !jobsQuery.isError && jobs.length === 0 ? (
            <div className="space-y-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-8 text-center">
              <p className="text-sm text-slate-300">No audio jobs yet.</p>
              <p className="text-xs text-slate-500">Dispatch one from the process page.</p>
              <Link
                className="inline-flex text-sm text-emerald-300 transition hover:text-emerald-200"
                to="/app/process"
              >
                Go to Process
              </Link>
            </div>
          ) : null}

          {!jobsQuery.isPending && !jobsQuery.isError && jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <AudioJobCard key={job.job_id} job={job} />
              ))}
            </div>
          ) : null}

          {!jobsQuery.isPending && !jobsQuery.isError && jobs.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
              <p className="text-xs text-slate-400">
                Page {page} of {totalPages} ({total} jobs)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function AudioJobCard({ job }: { job: AudioJob }) {
  const isCompleted = job.status === 'completed'
  const [stableOutputUrl, setStableOutputUrl] = useState(job.output_url)

  useEffect(() => {
    setStableOutputUrl((current) => {
      if (!job.output_url) {
        return current
      }

      if (!current) {
        return job.output_url
      }

      return current
    })
  }, [job.job_id, job.output_url])

  return (
    <Card className="border-slate-700 bg-slate-900/40">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{job.job_id}</CardTitle>
            <CardDescription className="break-all text-xs">{job.input_url}</CardDescription>
          </div>
          <Badge className={statusClassName(job.status)}>{job.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
          <p>
            <span className="text-slate-500">Created:</span> {formatDate(job.created_at)}
          </p>
          <p>
            <span className="text-slate-500">Completed:</span>{' '}
            {job.completed_at ? formatDate(job.completed_at) : '—'}
          </p>
          <p>
            <span className="text-slate-500">Size:</span>{' '}
            {job.output_size_bytes ? formatBytes(job.output_size_bytes) : '—'}
          </p>
        </div>

        {stableOutputUrl ? (
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <audio className="w-full" controls preload="none" src={stableOutputUrl}>
              Your browser does not support audio playback.
            </audio>
            <a
              className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200"
              href={stableOutputUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open output URL
              <ExternalLink size={12} />
            </a>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-400">
            {isCompleted
              ? 'Output URL not available yet. Refresh to try again.'
              : 'Still processing. This list auto-refreshes every 5 seconds.'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB']
  let size = bytes / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

function statusClassName(status: string) {
  return cn(
    'border uppercase tracking-wide',
    status === 'completed' && 'border-emerald-300/40 bg-emerald-400/10 text-emerald-100',
    status === 'processing' && 'border-amber-300/40 bg-amber-400/10 text-amber-100',
    status !== 'completed' &&
      status !== 'processing' &&
      'border-rose-300/40 bg-rose-400/10 text-rose-100',
  )
}
