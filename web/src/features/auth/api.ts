import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import type {
  LoginPayload,
  LoginResponse,
  Profile,
  RegisterPayload,
} from '@/features/auth/types'

async function registerUser(payload: RegisterPayload): Promise<void> {
  await apiRequest<null>('/api/users/register', {
    method: 'POST',
    body: payload,
  })
}

async function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  })
}

async function profile(token: string): Promise<Profile> {
  return apiRequest<Profile>('/api/users/profile', {
    method: 'GET',
    token,
  })
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: registerUser,
  })
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
  })
}

export function useProfileQuery(token: string | null) {
  return useQuery({
    queryKey: ['profile', token],
    queryFn: () => profile(token ?? ''),
    enabled: Boolean(token),
    retry: false,
  })
}
