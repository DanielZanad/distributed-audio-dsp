import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "../controllers/auth.controller";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { jwtConstants } from "./constants";
import { DatabaseModule } from "@infra/database/database.module";
import type { StringValue } from "ms";

@Module({
    imports: [
        JwtModule.register({
            global: true,
            secret: jwtConstants.secret,
            signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? "1d") as StringValue }
        }),
        DatabaseModule
    ],
    providers: [{ provide: AuthService, useClass: AuthService }],
    controllers: [AuthController],
    exports: [AuthService]
})
export class AuthModule {

}
