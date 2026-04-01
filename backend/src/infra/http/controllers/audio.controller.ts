import { AudioJobRepository } from "@app/repositories/audio-job-repository";
import { ProcessAudioBody } from "../dtos/process-audio-body";
import {
    BadRequestException,
    Body,
    Controller,
    DefaultValuePipe,
    Get,
    InternalServerErrorException,
    NotFoundException,
    Param,
    ParseIntPipe,
    ParseUUIDPipe,
    Post,
    Query,
    Request,
    UseGuards,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { AuthGuard } from "../auth/auth.guard";
import { AudioJobViewModel } from "../view-models/audio-job-view-model";

@Controller("api/audio")
export class AudioController {
    constructor(private readonly audioRepository: AudioJobRepository) { }

    @UseGuards(AuthGuard)
    @Post("process")
    async processAudio(@Body() body: ProcessAudioBody, @Request() req) {
        const userId = req.user.sub as string;
        const jobId = randomUUID()

        const jobPayload = {
            job_id: jobId,
            input_path: body.input_url,
            output_path: `processed/${jobId}.wav`,
            effects: body.effects
        }

        await this.audioRepository.createJobRecord({
            job_id: jobId,
            user_id: userId,
            input_url: body.input_url,
            status: "processing",
        });

        try {
            await this.audioRepository.sendToQueue("audio_jobs", jobPayload)
        } catch (error) {
            await this.audioRepository.updateJobStatus(jobId, "dispatch_failed");
            throw new InternalServerErrorException("Failed to dispatch job to queue");
        }

        return {
            message: 'Job dispatched to worker',
            job_id: jobId,
            status: 'processing'
        };
    }

    @UseGuards(AuthGuard)
    @Get()
    async listAudios(
        @Request() req,
        @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        if (page < 1) {
            throw new BadRequestException("page must be greater than or equal to 1");
        }

        const normalizedLimit = Math.min(Math.max(limit, 1), 100);
        const result = await this.audioRepository.listByUser(req.user.sub, page, normalizedLimit);

        return {
            items: result.items.map(AudioJobViewModel.toHTTP),
            page,
            limit: normalizedLimit,
            total: result.total,
        };
    }

    @UseGuards(AuthGuard)
    @Get(":jobId")
    async findByJobId(@Param("jobId", new ParseUUIDPipe()) jobId: string, @Request() req) {
        const audioJob = await this.audioRepository.findByJobIdAndUser(jobId, req.user.sub);

        if (!audioJob) {
            throw new NotFoundException("Audio job not found");
        }

        return AudioJobViewModel.toHTTP(audioJob);
    }
}
