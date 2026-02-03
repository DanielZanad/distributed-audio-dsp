import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { User } from '../entities/user/user';
import { FindUserByEmail } from './find-user-by-email';
import { Password } from '@app/entities/user/password';

describe('Find User By Email', () => {
    it('should be able to find a user by email', async () => {
        const userRepository = new InMemoryUserRepository();
        const findUserByEmail = new FindUserByEmail(userRepository);

        const user = new User({
            username: 'johndoe',
            email: 'john@example.com',
            password: new Password('password123'),
            avatar_url: 'http://example.com/avatar.jpg',
        });

        userRepository.users.push(user);

        const { user: foundUser } = await findUserByEmail.execute({
            email: 'john@example.com',
        });

        expect(foundUser).toBeTruthy();
        expect(foundUser?.id).toEqual(user.id);
    });

    it('should return null if user does not exist', async () => {
        const userRepository = new InMemoryUserRepository();
        const findUserByEmail = new FindUserByEmail(userRepository);

        const { user } = await findUserByEmail.execute({
            email: 'doesnotexist@example.com',
        });

        expect(user).toBeNull();
    });
});
