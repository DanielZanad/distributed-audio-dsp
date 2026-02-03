import { User } from '@app/entities/user/user';


export abstract class UserRepository {
    abstract findOneByEmail(email: string): Promise<User | null>;
    abstract register(user: User): Promise<void>;
}