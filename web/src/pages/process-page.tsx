import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Plus,
  Send,
  Trash2,
  Waves,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAudioJobsQuery, useProcessAudioMutation } from '@/features/audio/api'
import {
  createDefaultEffect,
  effectTitle,
  effectTypeOptions,
} from '@/features/audio/effects'
import type {
  EffectConfig,
  EffectType,
  ProcessAudioResponse,
} from '@/features/audio/types'
import { useAuth } from '@/features/auth/auth-context'
import { getErrorMessage } from '@/lib/api'

export function ProcessPage() {
  const { token } = useAuth()
  const processMutation = useProcessAudioMutation(token)
  const latestJobsQuery = useAudioJobsQuery(token, 1, 10)
  const queryClient = useQueryClient()

  const [sourceMode, setSourceMode] = useState<'url' | 'upload'>('url')
  const [inputUrl, setInputUrl] = useState('')
  const [inputFile, setInputFile] = useState<File | null>(null)
  const [effects, setEffects] = useState<EffectConfig[]>([createDefaultEffect('gain')])
  const [newEffectType, setNewEffectType] = useState<EffectType>('gain')
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<ProcessAudioResponse | null>(null)
  const latestCompletedJob = latestJobsQuery.data?.items.find(
    (job) => job.status === 'completed' && Boolean(job.output_url),
  )

  function updateEffect(index: number, updater: (current: EffectConfig) => EffectConfig) {
    setEffects((previous) =>
      previous.map((effect, currentIndex) =>
        currentIndex === index ? updater(effect) : effect,
      ),
    )
  }

  function removeEffect(index: number) {
    setEffects((previous) => previous.filter((_, currentIndex) => currentIndex !== index))
  }

  function moveEffect(index: number, direction: -1 | 1) {
    setEffects((previous) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= previous.length) {
        return previous
      }

      const draft = [...previous]
      const [removed] = draft.splice(index, 1)
      draft.splice(targetIndex, 0, removed)
      return draft
    })
  }

  function addEffect() {
    setEffects((previous) => [...previous, createDefaultEffect(newEffectType)])
  }

  function validateInput(): string | null {
    if (sourceMode === 'upload') {
      if (!inputFile) {
        return 'Select an audio file to upload.'
      }

      return null
    }

    const url = inputUrl
    if (url.trim().length === 0) {
      return 'Input URL is required.'
    }

    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'Input URL must use http or https.'
      }
    } catch {
      return 'Input URL is invalid.'
    }

    return null
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const validationError = validateInput()
    if (validationError) {
      setFormError(validationError)
      return
    }

    processMutation.mutate(
      {
        input_url: sourceMode === 'url' ? inputUrl.trim() : undefined,
        file: sourceMode === 'upload' ? inputFile : null,
        effects,
      },
      {
        onSuccess: (response) => {
          setResult(response)
          if (sourceMode === 'upload') {
            setInputFile(null)
          }
          void queryClient.invalidateQueries({ queryKey: ['audio-jobs'] })
          void latestJobsQuery.refetch()
        },
      },
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card className="border-slate-800 bg-slate-950/75">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="inline-flex items-center gap-2">
              <Waves size={18} />
              Signal Chain Builder
            </CardTitle>
            <Badge>{effects.length} effect(s)</Badge>
          </div>
          <CardDescription>
            Compose effect order and submit a process job to `POST /api/audio/process`.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <Label>Input source</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={sourceMode === 'url' ? 'primary' : 'secondary'}
                  onClick={() => setSourceMode('url')}
                >
                  Remote URL
                </Button>
                <Button
                  type="button"
                  variant={sourceMode === 'upload' ? 'primary' : 'secondary'}
                  onClick={() => setSourceMode('upload')}
                >
                  Upload file
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {sourceMode === 'url' ? (
                <>
                  <Label htmlFor="audio-url">Input audio URL</Label>
                  <Input
                    id="audio-url"
                    type="url"
                    value={inputUrl}
                    onChange={(event) => setInputUrl(event.target.value)}
                    placeholder="https://example.com/sample.mp3"
                    required
                  />
                </>
              ) : (
                <>
                  <Label htmlFor="audio-file">Upload local audio file</Label>
                  <Input
                    id="audio-file"
                    type="file"
                    accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aac"
                    onChange={(event) => setInputFile(event.target.files?.[0] ?? null)}
                    required
                  />
                  <p className="text-xs text-slate-400">
                    {inputFile
                      ? `Selected: ${inputFile.name}`
                      : 'Choose a local audio file to send to the backend before processing.'}
                  </p>
                </>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <Label htmlFor="new-effect-type">Add effect</Label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  id="new-effect-type"
                  className="h-10 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  value={newEffectType}
                  onChange={(event) => setNewEffectType(event.target.value as EffectType)}
                >
                  {effectTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="secondary" onClick={addEffect}>
                  <Plus size={16} />
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {effects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-400">
                  No effects configured. Add at least one effect for a richer output.
                </div>
              ) : null}

              {effects.map((effect, index) => (
                <Card key={`${effect.type}-${index}`} className="border-slate-700 bg-slate-900/40">
                  <CardHeader className="mb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{effectTitle(effect.type)}</CardTitle>
                        <CardDescription>Position #{index + 1}</CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => moveEffect(index, -1)}
                          disabled={index === 0}
                          aria-label="Move effect up"
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => moveEffect(index, 1)}
                          disabled={index === effects.length - 1}
                          aria-label="Move effect down"
                        >
                          <ArrowDown size={14} />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => removeEffect(index)}
                          aria-label="Remove effect"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    {renderEffectControls(effect, (nextEffect) => {
                      updateEffect(index, () => nextEffect)
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>

            {formError ? (
              <p className="rounded-lg border border-amber-300/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
                {formError}
              </p>
            ) : null}

            {processMutation.isError ? (
              <p className="rounded-lg border border-rose-300/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-100">
                {getErrorMessage(processMutation.error)}
              </p>
            ) : null}

            <Button className="w-full" size="lg" type="submit" disabled={processMutation.isPending}>
              <Send size={16} />
              {processMutation.isPending ? 'Dispatching job...' : 'Dispatch processing job'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-950/75">
        <CardHeader>
          <CardTitle>Dispatch Result</CardTitle>
          <CardDescription>
            API persists audio jobs; open Library to track completion and playback.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {result ? (
            <div className="space-y-3 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-4">
              <p className="text-sm text-emerald-100">{result.message}</p>
              <div className="space-y-1 text-sm text-slate-200">
                <p>
                  <span className="text-slate-400">Job ID:</span> {result.job_id}
                </p>
                <p>
                  <span className="text-slate-400">Status:</span> {result.status}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
              Submit a job to view `job_id` and status.
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300">
            <p className="font-medium text-slate-100">Check processing in Library</p>
            <p className="mt-2 text-slate-400">
              Completed jobs expose `output_url` and can be played directly in the library.
            </p>
            <Link
              className="mt-3 inline-flex text-sm text-emerald-300 transition hover:text-emerald-200"
              to="/app/library"
            >
              Open Library
            </Link>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300">
            <p className="font-medium text-slate-100">Latest completed result</p>
            {latestJobsQuery.isPending ? (
              <p className="mt-2 text-slate-400">Loading latest completed audio...</p>
            ) : null}
            {latestJobsQuery.isError ? (
              <p className="mt-2 text-rose-200">Could not load latest result.</p>
            ) : null}
            {!latestJobsQuery.isPending &&
            !latestJobsQuery.isError &&
            !latestCompletedJob ? (
              <p className="mt-2 text-slate-400">
                No completed output yet. Dispatch a job and wait for processing.
              </p>
            ) : null}
            {latestCompletedJob?.output_url ? (
              <div className="mt-3 space-y-2">
                <audio
                  className="w-full"
                  controls
                  preload="none"
                  src={latestCompletedJob.output_url}
                >
                  Your browser does not support audio playback.
                </audio>
                <a
                  className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200"
                  href={latestCompletedJob.output_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open latest output URL
                  <ExternalLink size={12} />
                </a>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function renderEffectControls(
  effect: EffectConfig,
  onChange: (effect: EffectConfig) => void,
) {
  switch (effect.type) {
    case 'gain':
      return (
        <NumberField
          id="gain-amount"
          label="Amount"
          value={effect.amount}
          min={0}
          max={5}
          step={0.1}
          onChange={(value) => onChange({ ...effect, amount: value })}
        />
      )

    case 'delay':
      return (
        <>
          <NumberField
            id="delay-ms"
            label="Delay (ms)"
            value={effect.delay_ms}
            min={1}
            max={4000}
            step={1}
            onChange={(value) => onChange({ ...effect, delay_ms: Math.round(value) })}
          />
          <NumberField
            id="delay-feedback"
            label="Feedback"
            value={effect.feedback}
            min={0}
            max={0.99}
            step={0.01}
            onChange={(value) => onChange({ ...effect, feedback: value })}
          />
          <NumberField
            id="delay-mix"
            label="Mix"
            value={effect.mix}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => onChange({ ...effect, mix: value })}
          />
        </>
      )

    case 'bitcrusher':
      return (
        <NumberField
          id="bitcrusher-bits"
          label="Bits"
          value={effect.bits}
          min={1}
          max={24}
          step={1}
          onChange={(value) => onChange({ ...effect, bits: Math.round(value) })}
        />
      )

    case 'tremolo':
      return (
        <>
          <NumberField
            id="tremolo-frequency"
            label="Frequency"
            value={effect.frequency}
            min={0.1}
            max={20}
            step={0.1}
            onChange={(value) => onChange({ ...effect, frequency: value })}
          />
          <NumberField
            id="tremolo-depth"
            label="Depth"
            value={effect.depth}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => onChange({ ...effect, depth: value })}
          />
        </>
      )

    case 'distortion':
      return (
        <>
          <NumberField
            id="distortion-drive"
            label="Drive"
            value={effect.drive}
            min={0.01}
            max={10}
            step={0.01}
            onChange={(value) => onChange({ ...effect, drive: value })}
          />
          <NumberField
            id="distortion-mix"
            label="Mix"
            value={effect.mix}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => onChange({ ...effect, mix: value })}
          />
        </>
      )

    case 'lowpass':
      return (
        <NumberField
          id="lowpass-cutoff"
          label="Cutoff"
          value={effect.cutoff}
          min={20}
          max={22000}
          step={10}
          onChange={(value) => onChange({ ...effect, cutoff: value })}
        />
      )
  }
}

type NumberFieldProps = {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

function NumberField({ id, label, value, min, max, step, onChange }: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
