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
  return apiRequest<ProcessAudioResponse>('/api/audio/process', {
    method: 'POST',
    token,
    body: payload,
  })
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
