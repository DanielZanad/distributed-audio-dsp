import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";
import { UserRepository } from "@app/repositories/user-repository";
import { PrismaUserRepository } from "./prisma/repositories/prisma-user-repository";
import { RabbitMQService } from "./rabbitmq/rabbitmq.service";
import { AudioJobRepository } from "@app/repositories/audio-job-repository";
import { RabbitMQJobRepository } from "./rabbitmq/repositories/rabbitmq-job-repository";

@Module({
    providers: [
        PrismaService,
        {
            provide: UserRepository,
            useClass: PrismaUserRepository
        },
        RabbitMQService,
        {
            provide: AudioJobRepository,
            useClass: RabbitMQJobRepository
        }

    ],
    exports: [UserRepository, AudioJobRepository]
})
export class DatabaseModule { }