export type GainEffect = {
  type: 'gain'
  amount: number
}

export type DelayEffect = {
  type: 'delay'
  delay_ms: number
  feedback: number
  mix: number
}

export type BitcrusherEffect = {
  type: 'bitcrusher'
  bits: number
}

export type TremoloEffect = {
  type: 'tremolo'
  frequency: number
  depth: number
}

export type DistortionEffect = {
  type: 'distortion'
  drive: number
  mix: number
}

export type LowpassEffect = {
  type: 'lowpass'
  cutoff: number
}

export type EffectConfig =
  | GainEffect
  | DelayEffect
  | BitcrusherEffect
  | TremoloEffect
  | DistortionEffect
  | LowpassEffect

export type EffectType = EffectConfig['type']

export type ProcessAudioPayload = {
  input_url: string
  effects: EffectConfig[]
}

export type ProcessAudioResponse = {
  message: string
  job_id: string
  status: string
}
