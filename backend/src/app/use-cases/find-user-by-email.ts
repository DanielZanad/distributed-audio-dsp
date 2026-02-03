import { User } from "@app/entities/user/user";
import { UserRepository } from "@app/repositories/user-repository";
import { Injectable } from "@nestjs/common";

interface FindUserByEmailRequest {
    email: string;
}

interface FindUserByEmailResponse {
    user: User | null;
}

@Injectable()
export class FindUserByEmail {
    constructor(private userRepository: UserRepository) {

    }

    async execute(request: FindUserByEmailRequest): Promise<FindUserByEmailResponse> {
        const { email } = request;

        const user = await this.userRepository.findOneByEmail(email);

        return {
            user,
        }

    }
}