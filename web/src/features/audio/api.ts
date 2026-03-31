import { useMutation } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import type {
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

export function useProcessAudioMutation(token: string | null) {
  return useMutation({
    mutationFn: (payload: ProcessAudioPayload) => processAudio(token ?? '', payload),
  })
}
