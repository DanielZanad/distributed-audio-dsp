export type RegisterPayload = {
  email: string
  password: string
  username: string
  avatar_url?: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type LoginResponse = {
  access_token: string
}

export type Profile = {
  sub: string
  username: string
  iat: number
  exp: number
}
