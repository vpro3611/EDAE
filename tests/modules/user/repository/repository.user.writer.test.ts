import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RepositoryUserWriter } from '../../../../src/modules/user/repository/repository.user.writer';
import { DatabaseError } from '../../../../src/modules/errors/errors.database';

dotenv.config();

describe('RepositoryUserWriter Integration Test', () => {
    let pool: Pool;
    let writer: RepositoryUserWriter;

    beforeAll(() => {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        writer = new RepositoryUserWriter(pool);
    });

    afterAll(async () => {
        await pool.end();
    });

    beforeEach(async () => {
        await pool.query('DELETE FROM users');
    });

    describe('create static method', () => {
        it('should instantiate the repository', () => {
            const newWriter = RepositoryUserWriter.create(pool);
            expect(newWriter).toBeInstanceOf(RepositoryUserWriter);
        });
    });

    describe('createUser', () => {
        it('should create a new user successfully', async () => {
            const name = 'John Doe';
            const email = 'john@example.com';
            const password = 'hashed_password';

            await writer.createUser(name, email, password);

            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            expect(result.rows.length).toBe(1);
            expect(result.rows[0].name).toBe(name);
            expect(result.rows[0].email).toBe(email);
            expect(result.rows[0].password_hashed).toBe(password);
            expect(result.rows[0].is_deleted).toBe(false);
        });

        it('should throw a DatabaseError when creating a user with a duplicate email', async () => {
            const name = 'John Doe';
            const email = 'john@example.com';
            const password = 'hashed_password';

            await writer.createUser(name, email, password);

            try {
                await writer.createUser('Another User', email, 'another_password');
                throw new Error('Should have thrown a DatabaseError');
            } catch (error: any) {
                expect(error).toBeInstanceOf(DatabaseError);
                expect(error.statusCode).toBe(409);
                expect(error.message).toBe('The email already exists.');
            }
        });
    });

    describe('updateUser', () => {
        it('should update an existing user successfully', async () => {
            const email = 'update@example.com';
            await pool.query(
                "INSERT INTO users (name, email, password_hashed) VALUES ($1, $2, $3)",
                ['Original Name', email, 'old_password']
            );
            const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            const userId = userResult.rows[0].id;

            const newName = 'Updated Name';
            const newPassword = 'new_password';
            const newEmail = 'updated@example.com';

            await writer.updateUser(userId, newName, newEmail, newPassword);

            const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
            expect(result.rows[0].name).toBe(newName);
            expect(result.rows[0].email).toBe(newEmail);
            expect(result.rows[0].password_hashed).toBe(newPassword);
        });

        it('should throw DatabaseError on database failure', async () => {
            const badWriter = new RepositoryUserWriter({
                query: () => Promise.reject(new Error('simulated db error'))
            } as any);

            try {
                await badWriter.updateUser('uuid', 'Name', 'email', 'pass');
                throw new Error('Should have thrown');
            } catch (error: any) {
                expect(error).toBeInstanceOf(DatabaseError);
                expect(error.internalError).toBe('RepositoryUserWriter.updateUser');
            }
        });
    });

    describe('deleteUser', () => {
        it('should soft delete an existing user successfully', async () => {
            const email = 'delete@example.com';
            await pool.query(
                "INSERT INTO users (name, email, password_hashed) VALUES ($1, $2, $3)",
                ['Delete Me', email, 'some_password']
            );
            const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            const userId = userResult.rows[0].id;

            await writer.deleteUser(userId);

            const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
            expect(result.rows[0].is_deleted).toBe(true);
        });

        it('should throw DatabaseError on database failure', async () => {
            const badWriter = new RepositoryUserWriter({
                query: () => Promise.reject(new Error('simulated db error'))
            } as any);

            try {
                await badWriter.deleteUser('uuid');
                throw new Error('Should have thrown');
            } catch (error: any) {
                expect(error).toBeInstanceOf(DatabaseError);
                expect(error.internalError).toBe('RepositoryUserWriter.deleteUser');
            }
        });
    });
});
