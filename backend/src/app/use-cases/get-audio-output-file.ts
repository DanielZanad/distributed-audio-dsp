import { AudioJobRepository } from "@app/repositories/audio-job-repository";
import { AudioOutputStorageService } from "@infra/storage/audio-output-storage.service";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

interface GetAudioOutputFileRequest {
    jobId: string;
    userId: string;
}

@Injectable()
export class GetAudioOutputFile {
    constructor(
        private readonly audioRepository: AudioJobRepository,
        private readonly outputStorageService: AudioOutputStorageService,
    ) { }

    async execute(request: GetAudioOutputFileRequest) {
        const audioJob = await this.audioRepository.findByJobIdAndUser(request.jobId, request.userId);

        if (!audioJob) {
            throw new NotFoundException("Audio job not found");
        }

        if (audioJob.status !== "completed") {
            throw new ConflictException("Audio job is not completed yet");
        }

        const outputPath = await this.outputStorageService.resolveLocalOutputPath(audioJob.output_key);
        if (!outputPath) {
            throw new NotFoundException("Audio output file not found");
        }

        return {
            audioJob,
            outputPath,
        };
    }
}
