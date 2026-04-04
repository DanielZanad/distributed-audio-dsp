import { AudioJobRepository } from "@app/repositories/audio-job-repository";
import { AudioInputStorage } from "@app/storage/audio-input-storage";
import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { randomUUID } from "crypto";

interface ProcessAudioRequest {
    userId: string;
    inputUrl?: string;
    uploadedFile?: {
        buffer: Buffer;
        originalname: string;
    };
    effects: unknown;
}

export interface ProcessAudioResponse {
    message: string;
    job_id: string;
    status: string;
}

@Injectable()
export class ProcessAudio {
    constructor(
        private readonly audioRepository: AudioJobRepository,
        private readonly audioInputStorage: AudioInputStorage,
    ) { }

    async execute(request: ProcessAudioRequest): Promise<ProcessAudioResponse> {
        const jobId = randomUUID();
        const effects = this.normalizeEffects(request.effects);
        const inputSource = await this.resolveInputSource({
            inputUrl: request.inputUrl,
            uploadedFile: request.uploadedFile,
            userId: request.userId,
            jobId,
        });

        const jobPayload = {
            job_id: jobId,
            input_path: inputSource.inputPath,
            output_path: `processed/${jobId}.wav`,
            effects,
        };

        await this.audioRepository.createJobRecord({
            job_id: jobId,
            user_id: request.userId,
            input_url: inputSource.inputLabel,
            status: "processing",
        });

        try {
            await this.audioRepository.sendToQueue("audio_jobs", jobPayload);
        } catch {
            await this.audioRepository.updateJobStatus(jobId, "dispatch_failed");
            throw new InternalServerErrorException("Failed to dispatch job to queue");
        }

        return {
            message: "Job dispatched to worker",
            job_id: jobId,
            status: "processing",
        };
    }

    private normalizeEffects(effects: unknown) {
        if (Array.isArray(effects)) {
            return effects;
        }

        if (typeof effects === "string") {
            try {
                const parsed = JSON.parse(effects);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            } catch {
                throw new BadRequestException("effects must be a valid JSON array");
            }
        }

        throw new BadRequestException("effects must be an array");
    }

    private async resolveInputSource(input: {
        inputUrl?: string;
        uploadedFile?: {
            buffer: Buffer;
            originalname: string;
        };
        userId: string;
        jobId: string;
    }) {
        const inputUrl = input.inputUrl?.trim();

        if (input.uploadedFile) {
            if (!input.uploadedFile.buffer?.length) {
                throw new BadRequestException("Uploaded audio file is empty");
            }

            return this.audioInputStorage.storeUploadedInput({
                userId: input.userId,
                jobId: input.jobId,
                file: input.uploadedFile,
            });
        }

        if (!inputUrl) {
            throw new BadRequestException("Provide either an input_url or an uploaded audio file");
        }

        return {
            inputPath: inputUrl,
            inputLabel: inputUrl,
        };
    }
}
