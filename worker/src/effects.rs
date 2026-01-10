use serde::Deserialize;

#[derive(Deserialize, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum EffectConfig {
    Bitcrusher {
        bits: u32,
    },
    Delay {
        delay_ms: usize,
        feedback: f32,
        mix: f32,
    },
    Gain {
        amount: f32,
    },
}

impl EffectConfig {
    pub fn into_effect(self, sample_rate: usize) -> Box<dyn AudioEffect> {
        match self {
            EffectConfig::Bitcrusher { bits } => Box::new(BitCrusher { bits }),
            EffectConfig::Delay {
                delay_ms,
                feedback,
                mix,
            } => {
                let delay_samples = (sample_rate as f32 * (delay_ms as f32 / 1000.0)) as usize;
                Box::new(SimpleDelay::new(delay_samples, feedback, mix))
            }
            EffectConfig::Gain { amount } => Box::new(Gain { amount }),
        }
    }
}

#[derive(Deserialize, Debug)]
pub struct AudioJob {
    pub input_path: String,
    pub output_path: String,
    pub effects: Vec<EffectConfig>,
}

pub trait AudioEffect {
    /// Processes a slice of interleaved f32 samples.
    /// [L, R, L, R, ...]
    fn process(&mut self, samples: &mut [f32]);
}

pub struct Gain {
    pub amount: f32,
}

impl AudioEffect for Gain {
    fn process(&mut self, samples: &mut [f32]) {
        for sample in samples.iter_mut() {
            *sample *= self.amount;
        }
    }
}

// Digital Distortion
pub struct BitCrusher {
    pub bits: u32,
}

impl AudioEffect for BitCrusher {
    fn process(&mut self, samples: &mut [f32]) {
        let steps = 2.0_f32.powi(self.bits as i32);
        for sample in samples.iter_mut() {
            *sample = (*sample * steps).round() / steps;
        }
    }
}

pub struct SimpleDelay {
    buffer: Vec<f32>,
    write_pos: usize,
    pub feedback: f32,
    pub mix: f32,
}

impl SimpleDelay {
    /// delay_samples = (sample_rate * delay_seconds)
    pub fn new(delay_samples: usize, feedback: f32, mix: f32) -> Self {
        Self {
            buffer: vec![0.0; delay_samples],
            write_pos: 0,
            feedback,
            mix,
        }
    }
}

impl AudioEffect for SimpleDelay {
    fn process(&mut self, samples: &mut [f32]) {
        for sample in samples.iter_mut() {
            let delayed_sample = self.buffer[self.write_pos];

            // Store the input + a portion of the old output (feedback)
            self.buffer[self.write_pos] = *sample + (delayed_sample * self.feedback);

            // Mix original signal with delayed signal
            *sample = *sample + (delayed_sample * self.mix);

            // Move circular buffer head
            self.write_pos = (self.write_pos + 1) % self.buffer.len();
        }
    }
}
