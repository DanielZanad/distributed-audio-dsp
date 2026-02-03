import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { RegisterUser } from './register-user';

describe('Register User', () => {
    it('should be able to register a new user', async () => {
        const userRepository = new InMemoryUserRepository();
        const registerUser = new RegisterUser(userRepository);

        await registerUser.execute({
            username: 'johndoe',
            email: 'johndoe@example.com',
            password: 'password123',
            avatar_url: 'http://example.com/avatar.jpg',
        });

        expect(userRepository.users).toHaveLength(1);
        expect(userRepository.users[0].email).toEqual('johndoe@example.com');
    });
});