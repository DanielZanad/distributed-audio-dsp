import type { EffectConfig, EffectType } from '@/features/audio/types'

export const effectTypeOptions: Array<{ value: EffectType; label: string }> = [
  { value: 'gain', label: 'Gain' },
  { value: 'delay', label: 'Delay' },
  { value: 'bitcrusher', label: 'Bitcrusher' },
  { value: 'tremolo', label: 'Tremolo' },
  { value: 'distortion', label: 'Distortion' },
  { value: 'lowpass', label: 'Low-pass Filter' },
]

export function createDefaultEffect(type: EffectType): EffectConfig {
  switch (type) {
    case 'gain':
      return { type: 'gain', amount: 1.2 }
    case 'delay':
      return { type: 'delay', delay_ms: 320, feedback: 0.35, mix: 0.4 }
    case 'bitcrusher':
      return { type: 'bitcrusher', bits: 8 }
    case 'tremolo':
      return { type: 'tremolo', frequency: 4, depth: 0.5 }
    case 'distortion':
      return { type: 'distortion', drive: 1.8, mix: 0.45 }
    case 'lowpass':
      return { type: 'lowpass', cutoff: 1800 }
  }
}

export function effectTitle(type: EffectType): string {
  const match = effectTypeOptions.find((option) => option.value === type)
  return match ? match.label : type
}
