import { genSalt, hash } from "bcryptjs";

export const generatePasswordHash = async (password: string) => {
    const salt = await genSalt();
    const hashedPassword = await hash(password, salt);

    return hashedPassword;
}