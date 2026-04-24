import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RepositoryUserWriter } from '../../../../src/modules/user/repository/repository.user.writer';
import { DatabaseError } from '../../../../src/modules/errors/errors.database';
import { User } from '../../../../src/modules/user/entity/user';

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

    describe('createUser', () => {
        it('should create a new user successfully', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password_hashed: 'hashed_password',
                last_password: 'hashed_password'
            };

            await writer.createUser(userData);

            const result = await pool.query('SELECT * FROM users WHERE email = $1', [userData.email]);
            expect(result.rows.length).toBe(1);
            expect(result.rows[0].name).toBe(userData.name);
            expect(result.rows[0].email).toBe(userData.email);
            expect(result.rows[0].password_hashed).toBe(userData.password_hashed);
            expect(result.rows[0].last_password).toBe(userData.last_password);
            expect(result.rows[0].is_deleted).toBe(false);
        });

        it('should throw a DatabaseError when creating a user with a duplicate email', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password_hashed: 'hashed_password',
                last_password: 'hashed_password'
            };

            await writer.createUser(userData);

            try {
                await writer.createUser({ ...userData, name: 'Another' });
                throw new Error('Should have thrown a DatabaseError');
            } catch (error: any) {
                expect(error).toBeInstanceOf(DatabaseError);
                expect(error.statusCode).toBe(409);
                expect(error.message).toBe('The email already exists.');
            }
        });
    });

    describe('updateUser', () => {
        it('should update an existing user successfully using User entity', async () => {
            const email = 'update@example.com';
            const insertResult = await pool.query(
                "INSERT INTO users (name, email, password_hashed, last_password, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING *",
                ['Original Name', email, 'old_password', 'old_password', true]
            );
            const row = insertResult.rows[0];
            
            const user = User.restoreUser(
                row.id,
                row.name,
                row.email,
                row.password_hashed,
                row.created_at,
                row.updated_at,
                row.is_deleted,
                row.is_verified,
                row.last_password,
                row.pending_password,
                row.pending_email   // pending_email
            );

            user.updateName('Updated Name');
            user.updateEmail('updated@example.com');
            user.updatePassword('new_hashed_password');
            user.updatePendingPassword('pending_hashed');

            await writer.updateUser(user);

            const result = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
            expect(result.rows[0].name).toBe('Updated Name');
            expect(result.rows[0].email).toBe('updated@example.com');
            expect(result.rows[0].password_hashed).toBe('new_hashed_password');
            expect(result.rows[0].pending_password).toBe('pending_hashed');
        });
    });

    describe('markUserAsVerified', () => {
        it('should mark an unverified user as verified', async () => {
            const insertResult = await pool.query(
                "INSERT INTO users (name, email, password_hashed, last_password, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                ['Verify Me', 'verify@example.com', 'pass', 'pass', false]
            );
            const id = insertResult.rows[0].id;

            await writer.markUserAsVerified(id);

            const result = await pool.query('SELECT is_verified FROM users WHERE id = $1', [id]);
            expect(result.rows[0].is_verified).toBe(true);
        });
    });

    describe('deleteUser', () => {
        it('should soft delete an existing user successfully', async () => {
            const insertResult = await pool.query(
                "INSERT INTO users (name, email, password_hashed, last_password) VALUES ($1, $2, $3, $4) RETURNING id",
                ['Delete Me', 'delete@example.com', 'pass', 'pass']
            );
            const id = insertResult.rows[0].id;

            await writer.deleteUser(id);

            const result = await pool.query('SELECT is_deleted FROM users WHERE id = $1', [id]);
            expect(result.rows[0].is_deleted).toBe(true);
        });
    });

    describe('error handling', () => {
        const badDb = {
            query: () => Promise.reject(new Error('simulated db error'))
        } as any;
        const badWriter = new RepositoryUserWriter(badDb);

        it('should throw DatabaseError on database failure in createUser', async () => {
            await expect(badWriter.createUser({ name: 'n', email: 'e', password_hashed: 'p', last_password: 'p' }))
                .rejects.toThrow();
        });

        it('should throw DatabaseError on database failure in updateUser', async () => {
            const user = User.restoreUser('id', 'name', 'e@e.com', 'p', new Date(), new Date(), false, true, 'p', null, null);
            await expect(badWriter.updateUser(user)).rejects.toThrow();
        });

        it('should throw DatabaseError on database failure in deleteUser', async () => {
            await expect(badWriter.deleteUser('uuid')).rejects.toThrow();
        });

        it('should throw DatabaseError on database failure in markUserAsVerified', async () => {
            await expect(badWriter.markUserAsVerified('uuid')).rejects.toThrow();
        });
    });
});
