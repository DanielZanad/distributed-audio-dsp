import { Password } from "@app/entities/user/password";
import { User } from "@app/entities/user/user";
import { generatePasswordHash } from "@app/helpers/generatePasswordHash";
import { UserRepository } from "@app/repositories/user-repository";
import { Injectable } from "@nestjs/common";

interface RegisterUserRequest {
    username: string;
    email: string;
    password: string;
    avatar_url?: string;
}

@Injectable()
export class RegisterUser {
    constructor(private userRepository: UserRepository) { }

    async execute(request: RegisterUserRequest) {
        const { email, password, username, avatar_url } = request;

        const passwordHash = new Password(password)
        passwordHash.value = await generatePasswordHash(passwordHash.value);

        const user = new User({
            username,
            email,
            password: passwordHash,
            avatar_url,
        });

        await this.userRepository.register(user);

    }
}