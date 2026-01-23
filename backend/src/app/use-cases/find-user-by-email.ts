import { User } from "@app/entities/user/user";
import { UserRepository } from "@app/repositories/user-repository";

interface FindUserByEmailRequest {
    email: string;
}

interface FindUserByEmailResponse {
    user: User | null;
}


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