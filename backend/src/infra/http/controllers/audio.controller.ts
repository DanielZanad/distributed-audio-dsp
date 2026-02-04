import { AudioJobRepository } from "@app/repositories/audio-job-repository";
import { Body, Controller, Post } from "@nestjs/common";
import { randomUUID } from "crypto";

@Controller("api/audio")
export class AudioController {
    constructor(private readonly audioRepository: AudioJobRepository) { }

    @Post("process")
    async processAudio(@Body() body: { input_url: string, effects: any[] }) {
        const jobId = randomUUID()

        const jobPayload = {
            job_id: jobId,
            input_path: body.input_url, // Change input_url to input_path to match Rust
            output_path: `processed/${jobId}.wav`,
            effects: body.effects
        }

        await this.audioRepository.sendToQueue("audio_jobs", jobPayload)

        return {
            message: 'Job dispatched to worker',
            job_id: jobId,
            status: 'processing'
        };
    }
}