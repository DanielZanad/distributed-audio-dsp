import {
    AudioJobRecord,
    AudioJobRepository,
    AudioStatusMessageDTO,
    CreateAudioJobRecordDTO,
    ListAudioJobsResult,
} from "@app/repositories/audio-job-repository";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "@infra/database/prisma/prisma.service";
import { RabbitMQService } from "../rabbitmq.service";

@Injectable()
export class RabbitMQJobRepository implements OnModuleInit, AudioJobRepository {
    private readonly logger = new Logger(RabbitMQJobRepository.name);

    constructor(
        private readonly rabbitMQService: RabbitMQService,
        private readonly prisma: PrismaService,
    ) { }

    async onModuleInit() {
        await this.rabbitMQService.consume(
            "audio_status",
            async (msg) => this.handleJobComplete(msg)
        );
    }

    async sendToQueue(queue: string, message: any) {
        try {
            await this.rabbitMQService.sendToQueue(queue, message);
            this.logger.log(`Message sent to queue ${queue} for job ${message.job_id}`)
        } catch (error) {
            this.logger.error(`Error sending message to ${queue}: ${error}`)
            throw error;
        }
    }

    async createJobRecord(data: CreateAudioJobRecordDTO): Promise<void> {
        await this.prisma.audioJob.create({
            data: {
                job_id: data.job_id,
                user_id: data.user_id,
                input_url: data.input_url,
                status: data.status,
            }
        });
    }

    async updateJobStatus(jobId: string, status: string): Promise<void> {
        await this.prisma.audioJob.updateMany({
            where: { job_id: jobId },
            data: {
                status,
                completed_at: status === "completed" ? new Date() : null,
            },
        });
    }

    async handleJobComplete(message: AudioStatusMessageDTO) {
        this.logger.log(`Received status update from Rust for job ${message.job_id}`)

        const result = await this.prisma.audioJob.updateMany({
            where: { job_id: message.job_id },
            data: {
                status: message.status,
                output_url: message.output_url,
                output_size_bytes:
                    typeof message.output_size_bytes === "number"
                        ? message.output_size_bytes
                        : null,
                completed_at: message.status === "completed" ? new Date() : null,
            },
        });

        if (result.count === 0) {
            this.logger.warn(`No audio job found to update for job_id ${message.job_id}`);
        }
    }

    async findByJobIdAndUser(jobId: string, userId: string): Promise<AudioJobRecord | null> {
        return this.prisma.audioJob.findFirst({
            where: {
                job_id: jobId,
                user_id: userId,
            }
        });
    }

    async listByUser(userId: string, page: number, limit: number): Promise<ListAudioJobsResult> {
        const skip = (page - 1) * limit;

        const [items, total] = await this.prisma.$transaction([
            this.prisma.audioJob.findMany({
                where: {
                    user_id: userId,
                },
                orderBy: {
                    created_at: "desc",
                },
                skip,
                take: limit,
            }),
            this.prisma.audioJob.count({
                where: {
                    user_id: userId,
                },
            })
        ]);

        return {
            items,
            total,
        };
    }
}
