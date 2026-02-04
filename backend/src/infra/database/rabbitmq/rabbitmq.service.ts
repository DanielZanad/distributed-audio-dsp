import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as amqp from 'amqp-connection-manager';
import { ConfirmChannel } from "amqplib";

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {

    private connection: amqp.AmqpConnectionManager;
    public channelWrapper: amqp.ChannelWrapper; // Made public so Repo can access if needed
    readonly logger = new Logger(RabbitMQService.name)

    private readonly JOB_QUEUE = "audio_jobs"
    private readonly STATUS_QUEUE = "audio_status"

    onModuleInit() {
        const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
        this.connection = amqp.connect([url]);

        this.connection.on("connect", () => this.logger.log("Connected to RabbitMQ"))
        this.connection.on("disconnect", () => this.logger.log("Disconnected from RabbitMQ"))

        this.channelWrapper = this.connection.createChannel({
            json: true,
            setup: async (channel: ConfirmChannel) => {
                // Assert queues here to ensure they exist
                await channel.assertQueue(this.JOB_QUEUE, { durable: true })
                await channel.assertQueue(this.STATUS_QUEUE, { durable: true })
            }
        })
    }

    async onModuleDestroy() {
        await this.connection.close();
    }

    // New generic method to register a consumer
    async consume(queue: string, handler: (msg: any) => void) {
        await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
            await channel.consume(queue, async (msg) => {
                if (msg) {
                    const content = JSON.parse(msg.content.toString())
                    // Run the handler passed from the Repository
                    handler(content);
                    channel.ack(msg);
                }
            })
        });
    }

    async sendToQueue(queue: string, message: any) {
        try {
            await this.channelWrapper.sendToQueue(queue, message);
            this.logger.log(`Message sent to ${queue}`)
        } catch (error) {
            this.logger.error(`Error sending message to ${queue}: ${error}`)
            throw error;
        }
    }
}