import { UserRepository } from "@app/repositories/user-repository";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcryptjs";

@Injectable()
export class AuthService {
    constructor(private userRepository: UserRepository, private jwtService: JwtService) { }

    async signIn(email: string, pass: string) {
        const user = await this.validateUser(email, pass);
        if (!user) {
            throw new UnauthorizedException();
        }
        const payload = { sub: user.id, username: user.username };
        return {
            access_token: await this.jwtService.signAsync(payload),
        };

    }

    async validateUser(email: string, pass: string) {
        const user = await this.userRepository.findOneByEmail(email);
        if (!user) return null;

        if (await compare(pass, user.password)) {
            return user;
        }
        return null
    }
}