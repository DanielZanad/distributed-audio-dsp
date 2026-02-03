import { User } from "@app/entities/user/user";
import { UserRepository } from "@app/repositories/user-repository";
import { PrismaService } from "../prisma.service";
import { PrismaUserMapper } from "../mappers/PrismaUserMapper";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PrismaUserRepository implements UserRepository {
    constructor(private readonly prisma: PrismaService) { }
    async register(user: User): Promise<void> {
        const result = await this.prisma.user.create({
            data: PrismaUserMapper.toPrisma(user)
        });

    }
    async findOneByEmail(email: string): Promise<User | null> {

        const result = await this.prisma.user.findUnique({
            where: {
                email,
            }
        });
        if (!result) return null;
        const user = PrismaUserMapper.toDomain(result);
        return user;
    }

}