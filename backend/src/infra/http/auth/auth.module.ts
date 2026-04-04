import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "../controllers/auth.controller";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { jwtConstants } from "./constants";
import { DatabaseModule } from "@infra/database/database.module";
import type { StringValue } from "ms";
import { AuthGuard } from "./auth.guard";
import { AudioOutputAuthGuard } from "./audio-output-auth.guard";

@Module({
    imports: [
        JwtModule.register({
            global: true,
            secret: jwtConstants.secret,
            signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? "1d") as StringValue }
        }),
        DatabaseModule
    ],
    providers: [AuthService, AuthGuard, AudioOutputAuthGuard],
    controllers: [AuthController],
    exports: [AuthService, AuthGuard, AudioOutputAuthGuard]
})
export class AuthModule {

}
