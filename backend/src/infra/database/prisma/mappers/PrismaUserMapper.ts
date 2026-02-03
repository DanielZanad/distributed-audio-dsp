import { Password } from "@app/entities/user/password";
import { User } from "@app/entities/user/user";


export class PrismaUserMapper {
    static toDomain(user: {
        id: string
        username: string
        email: string
        password_hash: string
        created_at: Date
        updated_at: Date
        avatar_url: string
    }) {

        const userDomain = new User({
            username: user.username,
            email: user.email,
            password: new Password(user.password_hash),
            avatar_url: user.avatar_url,
            created_at: user.created_at,
            updated_at: user.updated_at
        }, user.id);

        return userDomain
    }

    static toPrisma(user: User) {
        return {
            avatar_url: user.avatar_url,
            email: user.email,
            password_hash: user.password,
            username: user.username,
        }
    }
}
