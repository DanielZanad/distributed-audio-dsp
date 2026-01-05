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
