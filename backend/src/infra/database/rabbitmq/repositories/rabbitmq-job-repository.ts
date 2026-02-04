import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "../rabbitmq.service";
import { AudioJobRepository } from "@app/repositories/audio-job-repository";

@Injectable()
export class RabbitMQJobRepository implements OnModuleInit, AudioJobRepository {
    private readonly JOB_QUEUE = "audio_jobs";
    private readonly logger = new Logger(RabbitMQJobRepository.name); // Create a logger instance

    constructor(private readonly rabbitMQService: RabbitMQService) { }

    async onModuleInit() {
        // ONLY listen to the STATUS queue, not the JOB queue
        await this.rabbitMQService.consume(
            "audio_status",
            (msg) => this.handleJobComplete(msg)
        );
    }

    async sendToQueue(queue: any, message: any) {
        try {
            await this.rabbitMQService.channelWrapper.sendToQueue(queue, message);
            this.logger.log(`Message sent to Rust:${queue.job_id}`)
        } catch (error) {
            this.logger.error(`Error sending message to ${queue}: ${error}`)
            throw error;
        }
    }

    // Now this method resides correctly in the Repository
    async handleJobComplete(message: any) {
        this.logger.log("Received status update from Rust")
        console.log(message);
        // Add your repository logic here (e.g., update database)
    }
}