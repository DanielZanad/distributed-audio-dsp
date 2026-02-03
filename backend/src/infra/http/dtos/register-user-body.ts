import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class registerUserBody {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsOptional()
    avatar_url: string;
}