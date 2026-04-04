import { ProcessAudioBody } from "../dtos/process-audio-body";
import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Param,
    ParseIntPipe,
    ParseUUIDPipe,
    Post,
    Query,
    DefaultValuePipe,
    Res,
    Request,
    StreamableFile,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { Request as ExpressRequest, Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { basename } from "path";
import { AuthGuard } from "../auth/auth.guard";
import { AudioOutputAuthGuard } from "../auth/audio-output-auth.guard";
import { AudioJobViewModel } from "../view-models/audio-job-view-model";
import { ProcessAudio } from "@app/use-cases/process-audio";
import { ListAudioJobs } from "@app/use-cases/list-audio-jobs";
import { FindAudioJobById } from "@app/use-cases/find-audio-job-by-id";
import { GetAudioOutputFile } from "@app/use-cases/get-audio-output-file";

type UploadedAudioFile = {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
};

const DEFAULT_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;

@Controller("api/audio")
export class AudioController {
    constructor(
        private readonly processAudioUseCase: ProcessAudio,
        private readonly listAudioJobs: ListAudioJobs,
        private readonly findAudioJobById: FindAudioJobById,
        private readonly getAudioOutputFile: GetAudioOutputFile,
    ) { }

    @UseGuards(AuthGuard)
    @Post("process")
    @UseInterceptors(
        FileInterceptor("file", {
            limits: {
                fileSize: Number(process.env.LOCAL_AUDIO_UPLOAD_MAX_BYTES ?? DEFAULT_UPLOAD_LIMIT_BYTES),
            },
        }),
    )
    async processAudio(
        @Body() body: ProcessAudioBody,
        @Request() req,
        @UploadedFile() file?: UploadedAudioFile,
    ) {
        return this.processAudioUseCase.execute({
            userId: req.user.sub as string,
            inputUrl: body.input_url,
            uploadedFile: file
                ? {
                    buffer: file.buffer,
                    originalname: file.originalname,
                }
                : undefined,
            effects: body.effects,
        });
    }

    @UseGuards(AuthGuard)
    @Get()
    async listAudios(
        @Request() req,
        @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        const result = await this.listAudioJobs.execute({
            userId: req.user.sub,
            page,
            limit,
            requestOrigin: this.resolveRequestOrigin(req),
        });

        return {
            ...result,
            items: result.items.map((item) => AudioJobViewModel.toHTTP(item)),
        };
    }

    @UseGuards(AudioOutputAuthGuard)
    @Get(":jobId/output")
    async streamOutput(
        @Param("jobId", new ParseUUIDPipe()) jobId: string,
        @Request() req,
        @Res({ passthrough: true }) response: Response,
    ): Promise<StreamableFile> {
        const { audioJob, outputPath } = await this.getAudioOutputFile.execute({
            jobId,
            userId: req.user.sub,
        });

        const fileStat = await stat(outputPath);
        const byteRange = this.parseByteRange(req as ExpressRequest, fileStat.size);

        response.setHeader("Content-Type", "audio/wav");
        response.setHeader("Accept-Ranges", "bytes");
        response.setHeader(
            "Content-Disposition",
            `inline; filename="${basename(audioJob.output_key ?? "output.wav")}"`,
        );

        if (byteRange) {
            response.status(HttpStatus.PARTIAL_CONTENT);
            response.setHeader(
                "Content-Range",
                `bytes ${byteRange.start}-${byteRange.end}/${fileStat.size}`,
            );
            response.setHeader("Content-Length", String(byteRange.end - byteRange.start + 1));

            return new StreamableFile(
                createReadStream(outputPath, {
                    start: byteRange.start,
                    end: byteRange.end,
                }),
            );
        }

        response.setHeader("Content-Length", String(fileStat.size));
        return new StreamableFile(createReadStream(outputPath));
    }

    @UseGuards(AuthGuard)
    @Get(":jobId")
    async findByJobId(@Param("jobId", new ParseUUIDPipe()) jobId: string, @Request() req) {
        const audioJob = await this.findAudioJobById.execute({
            jobId,
            userId: req.user.sub,
            requestOrigin: this.resolveRequestOrigin(req),
        });

        return AudioJobViewModel.toHTTP(audioJob);
    }

    private resolveRequestOrigin(req: { protocol?: string; get?: (header: string) => string | undefined }) {
        const host = req.get?.("host");

        if (!host) {
            return null;
        }

        return `${req.protocol ?? "http"}://${host}`;
    }

    private parseByteRange(
        req: ExpressRequest,
        fileSize: number,
    ): { start: number; end: number } | null {
        const rangeHeader = req.headers.range;

        if (!rangeHeader) {
            return null;
        }

        if (Array.isArray(rangeHeader)) {
            throw new HttpException("Multiple range headers are not supported", HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
        }

        const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
        if (!match) {
            throw new HttpException("Invalid range header", HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
        }

        const [, startValue, endValue] = match;
        if (!startValue && !endValue) {
            throw new HttpException("Invalid range header", HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
        }

        let start: number;
        let end: number;

        if (!startValue) {
            const suffixLength = Number(endValue);
            if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
                throw new HttpException("Invalid range header", HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
            }

            start = Math.max(fileSize - suffixLength, 0);
            end = fileSize - 1;
        } else {
            start = Number(startValue);
            end = endValue ? Number(endValue) : fileSize - 1;
        }

        if (
            !Number.isFinite(start) ||
            !Number.isFinite(end) ||
            start < 0 ||
            end < start ||
            start >= fileSize ||
            end >= fileSize
        ) {
            throw new HttpException("Invalid range header", HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
        }

        return { start, end };
    }
}
