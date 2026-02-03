import { Password } from './password';
import { User } from './user';

describe('User Entity', () => {
    it('should be able to create a new user with default values', () => {
        const user = new User({
            username: 'johndoe',
            email: 'john@example.com',
            password: new Password('password123'),
            avatar_url: 'http://example.com/avatar.jpg',
        });

        expect(user).toBeTruthy();
        expect(user.id).toBeDefined();
        expect(user.username).toEqual('johndoe');
        expect(user.plan).toEqual('free');
        expect(user.created_at).toBeInstanceOf(Date);
        expect(user.updated_at).toBeUndefined();
    });

    it('should be able to create a new user with provided optional values', () => {
        const id = 'custom-uuid';
        const createdAt = new Date('2023-01-01');
        const user = new User(
            {
                username: 'janedoe',
                email: 'jane@example.com',
                password: new Password('password123'),
                avatar_url: 'http://example.com/avatar.jpg',
                plan: 'premium',
                created_at: createdAt,
            },
            id,
        );

        expect(user.id).toEqual(id);
        expect(user.plan).toEqual('premium');
        expect(user.created_at).toEqual(createdAt);
    });

    it('should update username and set updated_at', () => {
        const user = new User({
            username: 'johndoe',
            email: 'john@example.com',
            password: new Password('password123'),
            avatar_url: 'avatar.jpg',
        });

        expect(user.updated_at).toBeUndefined();
        user.username = 'newusername';
        expect(user.username).toEqual('newusername');
        expect(user.updated_at).toBeInstanceOf(Date);
    });

    it('should update email and set updated_at', () => {
        const user = new User({
            username: 'johndoe',
            email: 'john@example.com',
            password: new Password('password123'),
            avatar_url: 'avatar.jpg',
        });

        user.email = 'new@example.com';
        expect(user.email).toEqual('new@example.com');
        expect(user.updated_at).toBeInstanceOf(Date);
    });

    it('should update password and set updated_at', () => {
        const user = new User({
            username: 'johndoe',
            email: 'john@example.com',
            password: new Password('password123'),
            avatar_url: 'avatar.jpg',
        });

        user.password = new Password('newpassword');
        expect(user.password).toEqual('newpassword');
        expect(user.updated_at).toBeInstanceOf(Date);
    });

    it('should update plan and set updated_at', () => {
        const user = new User({
            username: 'johndoe',
            email: 'john@example.com',
            password: new Password('password123'),
            avatar_url: 'avatar.jpg',
        });

        user.plan = 'premium';
        expect(user.plan).toEqual('premium');
        expect(user.updated_at).toBeInstanceOf(Date);
    });
});