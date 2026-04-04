import { AudioJobRepository } from "@app/repositories/audio-job-repository";
import { AudioOutputStorageService } from "@infra/storage/audio-output-storage.service";
import { Injectable, NotFoundException } from "@nestjs/common";

interface FindAudioJobByIdRequest {
    jobId: string;
    userId: string;
    requestOrigin?: string | null;
}

@Injectable()
export class FindAudioJobById {
    constructor(
        private readonly audioRepository: AudioJobRepository,
        private readonly outputStorageService: AudioOutputStorageService,
    ) { }

    async execute(request: FindAudioJobByIdRequest) {
        const audioJob = await this.audioRepository.findByJobIdAndUser(request.jobId, request.userId);

        if (!audioJob) {
            throw new NotFoundException("Audio job not found");
        }

        const outputUrl = await this.outputStorageService.resolveOutputUrl({
            job_id: audioJob.job_id,
            user_id: audioJob.user_id,
            output_key: audioJob.output_key,
            output_url: audioJob.output_url,
            requestOrigin: request.requestOrigin ?? null,
        });

        return {
            ...audioJob,
            output_url: outputUrl,
        };
    }
}
