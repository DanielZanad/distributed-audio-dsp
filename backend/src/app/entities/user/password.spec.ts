import { Password } from './password';

describe('Password Value Object', () => {
    it('should be able to create a new password with valid value', () => {
        const password = new Password('123456abc');
        expect(password).toBeTruthy();
        expect(password.value).toEqual('123456abc');
    });

    it('should not be able to create a password with less than 6 characters', () => {
        expect(() => {
            new Password('12345');
        }).toThrow('Password length error!');
    });

    it('should not be able to create a password with more than 230 characters', () => {
        expect(() => {
            new Password('a'.repeat(231));
        }).toThrow('Password length error!');
    });

    it('should not be able to create a password with only numbers', () => {
        expect(() => {
            new Password('12345678');
        }).toThrow('Password only contains numbers!');
    });
});