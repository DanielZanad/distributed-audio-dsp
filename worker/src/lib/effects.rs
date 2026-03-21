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
    Tremolo {
        frequency: f32,
        depth: f32,
    },
    Distortion {
        drive: f32,
        mix: f32,
    },
    Lowpass {
        cutoff: f32,
    },
}

impl EffectConfig {
    pub fn into_effect(self, sample_rate: usize, channels: usize) -> Box<dyn AudioEffect> {
        match self {
            EffectConfig::Bitcrusher { bits } => Box::new(BitCrusher { bits }),
            EffectConfig::Delay {
                delay_ms,
                feedback,
                mix,
            } => {
                let delay_frames = (sample_rate as f32 * (delay_ms as f32 / 1000.0)) as usize;
                Box::new(SimpleDelay::new(delay_frames, feedback, mix, channels))
            }
            EffectConfig::Gain { amount } => Box::new(Gain { amount }),
            EffectConfig::Tremolo { frequency, depth } => {
                Box::new(Tremolo::new(frequency, depth, sample_rate, channels))
            }
            EffectConfig::Distortion { drive, mix } => Box::new(Distortion::new(drive, mix)),
            EffectConfig::Lowpass { cutoff } => {
                Box::new(LowPass::new(cutoff, sample_rate, channels))
            }
        }
    }
}

#[derive(Deserialize, Debug)]
pub struct AudioJob {
    pub job_id: String,
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
    /// delay_frames = (sample_rate * delay_seconds)
    pub fn new(delay_frames: usize, feedback: f32, mix: f32, channels: usize) -> Self {
        let channels = channels.max(1);
        let buffer_size = delay_frames * channels;
        Self {
            buffer: vec![0.0; buffer_size],
            write_pos: 0,
            feedback,
            mix,
        }
    }
}

impl AudioEffect for SimpleDelay {
    fn process(&mut self, samples: &mut [f32]) {
        if self.buffer.is_empty() {
            return;
        }
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

pub struct Tremolo {
    pub depth: f32,
    phase: f32,
    phase_increment: f32,
    channel_toggle: usize,
    channels: usize,
    current_lfo: f32,
}

impl Tremolo {
    pub fn new(frequency: f32, depth: f32, sample_rate: usize, channels: usize) -> Self {
        let channels = channels.max(1);
        let phase_increment = 2.0 * std::f32::consts::PI * frequency / (sample_rate as f32);
        Self {
            depth,
            phase: 0.0,
            phase_increment,
            channel_toggle: 0,
            channels,
            current_lfo: 1.0,
        }
    }
}

impl AudioEffect for Tremolo {
    fn process(&mut self, samples: &mut [f32]) {
        for sample in samples.iter_mut() {
            if self.channel_toggle == 0 {
                self.current_lfo = 1.0 - self.depth * (0.5 * (1.0 - self.phase.sin()));
                self.phase += self.phase_increment;
                if self.phase > 2.0 * std::f32::consts::PI {
                    self.phase -= 2.0 * std::f32::consts::PI;
                }
            }
            *sample *= self.current_lfo;
            self.channel_toggle = (self.channel_toggle + 1) % self.channels;
        }
    }
}

pub struct Distortion {
    pub drive: f32,
    pub mix: f32,
}

impl Distortion {
    pub fn new(drive: f32, mix: f32) -> Self {
        Self { drive, mix }
    }
}

impl AudioEffect for Distortion {
    fn process(&mut self, samples: &mut [f32]) {
        let drive_clamped = self.drive.max(0.01);
        let norm = 1.0 / drive_clamped.tanh();
        for sample in samples.iter_mut() {
            let clean = *sample;
            let distorted = (clean * drive_clamped).tanh() * norm;
            *sample = clean * (1.0 - self.mix) + distorted * self.mix;
        }
    }
}

pub struct LowPass {
    prev_out: Vec<f32>,
    alpha: f32,
    channel_toggle: usize,
    channels: usize,
}

impl LowPass {
    pub fn new(cutoff: f32, sample_rate: usize, channels: usize) -> Self {
        let channels = channels.max(1);
        let dt = 1.0 / sample_rate as f32;
        let rc = 1.0 / (cutoff * 2.0 * std::f32::consts::PI);
        let alpha = dt / (rc + dt);
        Self {
            prev_out: vec![0.0; channels],
            alpha,
            channel_toggle: 0,
            channels,
        }
    }
}

impl AudioEffect for LowPass {
    fn process(&mut self, samples: &mut [f32]) {
        if self.prev_out.is_empty() {
            return;
        }
        for sample in samples.iter_mut() {
            let out = self.prev_out[self.channel_toggle]
                + self.alpha * (*sample - self.prev_out[self.channel_toggle]);
            self.prev_out[self.channel_toggle] = out;
            *sample = out;
            self.channel_toggle = (self.channel_toggle + 1) % self.channels;
        }
    }
}
