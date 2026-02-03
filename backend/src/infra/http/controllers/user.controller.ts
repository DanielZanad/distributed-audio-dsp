import { FindUserByEmail } from "@app/use-cases/find-user-by-email";
import { Body, Controller, Get, HttpException, HttpStatus, Post, Request, Res, UseGuards } from "@nestjs/common";
import { registerUserBody } from "../dtos/register-user-body";
import { RegisterUser } from "@app/use-cases/register-user";
import { Response } from "express";
import { AuthGuard } from "../auth/auth.guard";

@Controller("api/users")
export class UserController {
    constructor(
        private readonly findUserByEmail: FindUserByEmail,
        private readonly registerUser: RegisterUser) { }

    @Post("register")
    async register(@Body() body: registerUserBody, @Res() res: Response) {
        const { email, password, username, avatar_url } = body;

        const emailExists = await this.findUserByEmail.execute({ email });
        if (emailExists.user) {
            throw new HttpException("Email already exists", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        await this.registerUser.execute({
            email,
            password,
            username,
            avatar_url,
        });

        res.status(HttpStatus.CREATED).send()

    }

    @UseGuards(AuthGuard)
    @Get("profile")
    getProfile(@Request() req) {
        return req.user
    }
}