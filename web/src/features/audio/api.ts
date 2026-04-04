import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import type {
  AudioJobsListResponse,
  ProcessAudioPayload,
  ProcessAudioResponse,
} from '@/features/audio/types'

async function processAudio(
  token: string,
  payload: ProcessAudioPayload,
): Promise<ProcessAudioResponse> {
  const body = payload.file ? buildProcessAudioFormData(payload) : {
    input_url: payload.input_url,
    effects: payload.effects,
  }

  return apiRequest<ProcessAudioResponse>('/api/audio/process', {
    method: 'POST',
    token,
    body,
  })
}

function buildProcessAudioFormData(payload: ProcessAudioPayload): FormData {
  const formData = new FormData()

  if (payload.input_url) {
    formData.append('input_url', payload.input_url)
  }

  if (payload.file) {
    formData.append('file', payload.file)
  }

  formData.append('effects', JSON.stringify(payload.effects))
  return formData
}

async function listAudioJobs(
  token: string,
  page: number,
  limit: number,
): Promise<AudioJobsListResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  return apiRequest<AudioJobsListResponse>(`/api/audio?${searchParams.toString()}`, {
    method: 'GET',
    token,
  })
}

export function useProcessAudioMutation(token: string | null) {
  return useMutation({
    mutationFn: (payload: ProcessAudioPayload) => processAudio(token ?? '', payload),
  })
}

export function useAudioJobsQuery(
  token: string | null,
  page: number,
  limit: number,
) {
  return useQuery({
    queryKey: ['audio-jobs', token, page, limit],
    queryFn: () => listAudioJobs(token ?? '', page, limit),
    enabled: Boolean(token),
    refetchInterval: (query) => {
      const data = query.state.data as AudioJobsListResponse | undefined
      if (!data) {
        return false
      }

      return data.items.some((item) => item.status === 'processing') ? 5000 : false
    },
  })
}
