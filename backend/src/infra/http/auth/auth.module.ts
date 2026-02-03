import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "../controllers/auth.controller";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { jwtConstants } from "./constants";
import { DatabaseModule } from "@infra/database/database.module";

@Module({
    imports: [
        JwtModule.register({
            global: true,
            secret: jwtConstants.secret,
            signOptions: { expiresIn: "69s" }
        }),
        DatabaseModule
    ],
    providers: [{ provide: AuthService, useClass: AuthService }],
    controllers: [AuthController],
    exports: [AuthService]
})
export class AuthModule {

}