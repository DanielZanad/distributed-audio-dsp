import { User } from "@app/entities/user/user";
import { UserRepository } from "@app/repositories/user-repository";

export class InMemoryUserRepository implements UserRepository {
    public users: User[] = [];
    async findOneByEmail(email: string): Promise<User | null> {
        const user = this.users.find(user => user.email === email);

        if (!user) {
            return null;
        }

        return user;
    }

}