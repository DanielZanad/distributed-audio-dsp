import { AudioJobRepository } from "@app/repositories/audio-job-repository";
import { AudioOutputStorageService } from "@infra/storage/audio-output-storage.service";
import { BadRequestException, Injectable } from "@nestjs/common";

interface ListAudioJobsRequest {
    userId: string;
    page: number;
    limit: number;
    requestOrigin?: string | null;
}

@Injectable()
export class ListAudioJobs {
    constructor(
        private readonly audioRepository: AudioJobRepository,
        private readonly outputStorageService: AudioOutputStorageService,
    ) { }

    async execute(request: ListAudioJobsRequest) {
        if (request.page < 1) {
            throw new BadRequestException("page must be greater than or equal to 1");
        }

        const normalizedLimit = Math.min(Math.max(request.limit, 1), 100);
        const result = await this.audioRepository.listByUser(request.userId, request.page, normalizedLimit);

        const items = await Promise.all(
            result.items.map(async (item) => {
                const outputUrl = await this.outputStorageService.resolveOutputUrl({
                    job_id: item.job_id,
                    user_id: item.user_id,
                    output_key: item.output_key,
                    output_url: item.output_url,
                    requestOrigin: request.requestOrigin ?? null,
                });

                return {
                    ...item,
                    output_url: outputUrl,
                };
            }),
        );

        return {
            items,
            page: request.page,
            limit: normalizedLimit,
            total: result.total,
        };
    }
}
