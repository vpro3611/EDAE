# Connections Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full `connection` domain module (Telegram/Slack/Email notification channels) in DDD/Clean Architecture style, mirroring the `user` module.

**Architecture:** Entity → Validator → Reader/Writer interfaces → Repositories (AES-256-GCM encrypted credentials) → Use Cases → Transactional Services → Controllers → DTOs, wired into `container.ts` and `app.ts`.

**Tech Stack:** TypeScript, Express, Zod, pg (PostgreSQL), Node.js built-in `crypto` (AES-256-GCM), Jest + Supertest.

---

## Files Overview

**Create:**
```
src/modules/infra/encryption/infra.encryption.interface.ts
src/modules/infra/encryption/infra.encryption_aes.implementation.ts
src/modules/connection/connection.credentials.ts
src/modules/connection/entity/connection.ts
src/modules/connection/entity/connection.validator.ts
src/modules/connection/interfaces/interface.repository.ts
src/modules/connection/repository/repository.connection.reader.ts
src/modules/connection/repository/repository.connection.writer.ts
src/modules/connection/dto/connection.dto.ts
src/modules/connection/dto/connection.dto.mapper.ts
src/modules/connection/usecases/connection.create.usecase.ts
src/modules/connection/usecases/connection.list_active.usecase.ts
src/modules/connection/usecases/connection.list_deleted.usecase.ts
src/modules/connection/usecases/connection.update.usecase.ts
src/modules/connection/usecases/connection.soft_delete.usecase.ts
src/modules/connection/usecases/connection.restore.usecase.ts
src/modules/connection/transactional_services/tx_service.connection.create.ts
src/modules/connection/transactional_services/tx_service.connection.list_active.ts
src/modules/connection/transactional_services/tx_service.connection.list_deleted.ts
src/modules/connection/transactional_services/tx_service.connection.update.ts
src/modules/connection/transactional_services/tx_service.connection.soft_delete.ts
src/modules/connection/transactional_services/tx_service.connection.restore.ts
src/modules/connection/controllers/controller.connection.create.ts
src/modules/connection/controllers/controller.connection.list_active.ts
src/modules/connection/controllers/controller.connection.list_deleted.ts
src/modules/connection/controllers/controller.connection.update.ts
src/modules/connection/controllers/controller.connection.soft_delete.ts
src/modules/connection/controllers/controller.connection.restore.ts
tests/modules/infra/encryption/infra.encryption.test.ts
tests/modules/connection/entity/connection.test.ts
tests/modules/connection/repository/repository.connection.test.ts
tests/modules/connection/dto/connection.dto.mapper.test.ts
tests/modules/connection/usecases/connection.create.usecase.test.ts
tests/modules/connection/usecases/connection.list_active.usecase.test.ts
tests/modules/connection/usecases/connection.list_deleted.usecase.test.ts
tests/modules/connection/usecases/connection.update.usecase.test.ts
tests/modules/connection/usecases/connection.soft_delete.usecase.test.ts
tests/modules/connection/usecases/connection.restore.usecase.test.ts
tests/modules/connection/transactional_services/tx_service.connection.create.test.ts
tests/modules/connection/transactional_services/tx_service.connection.list_active.test.ts
tests/modules/connection/transactional_services/tx_service.connection.list_deleted.test.ts
tests/modules/connection/transactional_services/tx_service.connection.update.test.ts
tests/modules/connection/transactional_services/tx_service.connection.soft_delete.test.ts
tests/modules/connection/transactional_services/tx_service.connection.restore.test.ts
tests/modules/connection/controllers/controller.connection.e2e.test.ts
```

**Modify:**
```
src/container.ts
src/app.ts
.env
tests/modules/user/controllers/user.controllers.e2e.test.ts  (add connection controller noops)
```

---

## Task 1: Infra Encryption Adapter

**Files:**
- Create: `src/modules/infra/encryption/infra.encryption.interface.ts`
- Create: `src/modules/infra/encryption/infra.encryption_aes.implementation.ts`
- Create: `tests/modules/infra/encryption/infra.encryption.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/modules/infra/encryption/infra.encryption.test.ts
import { InfraCryptoAesImplementation } from '../../../../src/modules/infra/encryption/infra.encryption_aes.implementation';

describe('InfraCryptoAesImplementation', () => {
    const KEY = 'a'.repeat(64); // 32 bytes expressed as 64 hex chars

    let enc: InfraCryptoAesImplementation;

    beforeEach(() => {
        enc = InfraCryptoAesImplementation.create(KEY);
    });

    it('round-trips plaintext through encrypt → decrypt', () => {
        const plain = '{"provider":"telegram","bot_token":"tok","chat_id":"123"}';
        expect(enc.decrypt(enc.encrypt(plain))).toBe(plain);
    });

    it('produces a different ciphertext each call (random IV)', () => {
        const c1 = enc.encrypt('hello');
        const c2 = enc.encrypt('hello');
        expect(c1).not.toBe(c2);
    });

    it('throws when the ciphertext is tampered', () => {
        const parts = enc.encrypt('hello').split(':');
        parts[2] = parts[2].slice(0, -2) + 'ff';
        expect(() => enc.decrypt(parts.join(':'))).toThrow();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/modules/infra/encryption/infra.encryption.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '…infra.encryption_aes.implementation'`

- [ ] **Step 3: Create the interface**

```ts
// src/modules/infra/encryption/infra.encryption.interface.ts
export interface InfraEncryptionInterface {
    encrypt(plaintext: string): string;
    decrypt(ciphertext: string): string;
}
```

- [ ] **Step 4: Create the AES-256-GCM implementation**

```ts
// src/modules/infra/encryption/infra.encryption_aes.implementation.ts
import crypto from 'crypto';
import { InfraEncryptionInterface } from './infra.encryption.interface';

export class InfraCryptoAesImplementation implements InfraEncryptionInterface {
    private readonly key: Buffer;

    constructor(hexKey: string) {
        this.key = Buffer.from(hexKey, 'hex');
    }

    static create(hexKey: string): InfraCryptoAesImplementation {
        return new InfraCryptoAesImplementation(hexKey);
    }

    encrypt(plaintext: string): string {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    }

    decrypt(ciphertext: string): string {
        const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
        decipher.setAuthTag(authTag);
        return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest tests/modules/infra/encryption/infra.encryption.test.ts --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 6: Add ENCRYPTION_KEY to .env**

Append to `.env`:
```
# AES-256-GCM encryption key (32 bytes as 64 hex chars)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

> Replace value with a securely generated 64-char hex string in production.

---

## Task 2: Credentials Types

**Files:**
- Create: `src/modules/connection/connection.credentials.ts`

- [ ] **Step 1: Create the file**

```ts
// src/modules/connection/connection.credentials.ts
export type TelegramCredentials = {
    provider: 'telegram';
    bot_token: string;
    chat_id: string;
};

export type SlackCredentials = {
    provider: 'slack';
    webhook_url: string;
};

export type EmailCredentials = {
    provider: 'email';
    address: string;
};

export type ConnectionCredentials =
    | TelegramCredentials
    | SlackCredentials
    | EmailCredentials;
```

No tests needed — pure type definitions with no runtime logic.

---

## Task 3: Connection Entity + Validator

**Files:**
- Create: `src/modules/connection/entity/connection.validator.ts`
- Create: `src/modules/connection/entity/connection.ts`
- Create: `tests/modules/connection/entity/connection.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/modules/connection/entity/connection.test.ts
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const TELEGRAM_CREDS: ConnectionCredentials = {
    provider: 'telegram',
    bot_token: 'bot123',
    chat_id: 'chat456',
};

const SLACK_CREDS: ConnectionCredentials = {
    provider: 'slack',
    webhook_url: 'https://hooks.slack.com/test',
};

const EMAIL_CREDS: ConnectionCredentials = {
    provider: 'email',
    address: 'user@example.com',
};

function makeConnection(overrides: Partial<{
    id: string; user_id: string; provider: string; name: string;
    credentials: ConnectionCredentials; is_deleted: boolean;
}> = {}) {
    return Connection.restore(
        overrides.id ?? 'conn-uuid-1',
        overrides.user_id ?? 'user-uuid-1',
        overrides.provider ?? 'telegram',
        overrides.name ?? 'My Bot',
        overrides.credentials ?? TELEGRAM_CREDS,
        new Date(),
        new Date(),
        overrides.is_deleted ?? false,
    );
}

describe('Connection Entity', () => {

    describe('createForDatabase', () => {
        it('returns insert-ready object with provider derived from credentials', () => {
            const result = Connection.createForDatabase('user-1', 'My Bot', TELEGRAM_CREDS);
            expect(result).toEqual({
                user_id: 'user-1',
                provider: 'telegram',
                name: 'My Bot',
                credentials: TELEGRAM_CREDS,
            });
        });

        it('throws 400 when name is empty', () => {
            expect(() => Connection.createForDatabase('user-1', '', TELEGRAM_CREDS))
                .toThrow(AppError);
        });

        it('throws 400 when telegram bot_token is empty', () => {
            expect(() =>
                Connection.createForDatabase('user-1', 'Bot', {
                    provider: 'telegram', bot_token: '', chat_id: '123',
                }),
            ).toThrow(AppError);
        });

        it('throws 400 when slack webhook_url is not a valid URL', () => {
            expect(() =>
                Connection.createForDatabase('user-1', 'Slack', {
                    provider: 'slack', webhook_url: 'not-a-url',
                }),
            ).toThrow(AppError);
        });

        it('throws 400 when email address is invalid', () => {
            expect(() =>
                Connection.createForDatabase('user-1', 'Email', {
                    provider: 'email', address: 'notanemail',
                }),
            ).toThrow(AppError);
        });
    });

    describe('restore', () => {
        it('creates a Connection instance from valid data', () => {
            const conn = makeConnection();
            expect(conn).toBeInstanceOf(Connection);
            expect(conn.id).toBe('conn-uuid-1');
        });
    });

    describe('ensureNotDeleted', () => {
        it('does not throw when is_deleted is false', () => {
            expect(() => makeConnection().ensureNotDeleted('op')).not.toThrow();
        });

        it('throws 400 when is_deleted is true', () => {
            const conn = makeConnection({ is_deleted: true });
            expect(() => conn.ensureNotDeleted('op')).toThrow(AppError);
        });
    });

    describe('ensureIsDeleted', () => {
        it('throws 400 when is_deleted is false', () => {
            expect(() => makeConnection().ensureIsDeleted('op')).toThrow(AppError);
        });

        it('does not throw when is_deleted is true', () => {
            const conn = makeConnection({ is_deleted: true });
            expect(() => conn.ensureIsDeleted('op')).not.toThrow();
        });
    });

    describe('ensureOwnership', () => {
        it('does not throw when actorId matches user_id', () => {
            const conn = makeConnection({ user_id: 'actor-1' });
            expect(() => conn.ensureOwnership('actor-1', 'op')).not.toThrow();
        });

        it('throws 403 when actorId does not match user_id', () => {
            const conn = makeConnection({ user_id: 'actor-1' });
            try {
                conn.ensureOwnership('other-actor', 'op');
                fail('expected error');
            } catch (e: any) {
                expect(e).toBeInstanceOf(AppError);
                expect(e.statusCode).toBe(403);
            }
        });
    });

    describe('updateName', () => {
        it('mutates name when valid', () => {
            const conn = makeConnection();
            conn.updateName('New Name');
            expect(conn.name).toBe('New Name');
        });

        it('throws 400 when name is empty', () => {
            expect(() => makeConnection().updateName('')).toThrow(AppError);
        });
    });

    describe('updateCredentials', () => {
        it('mutates credentials when valid and same provider', () => {
            const conn = makeConnection();
            const newCreds: ConnectionCredentials = {
                provider: 'telegram', bot_token: 'new-tok', chat_id: 'new-chat',
            };
            conn.updateCredentials(newCreds);
            expect(conn.credentials).toEqual(newCreds);
        });

        it('throws 400 when provider changes', () => {
            const conn = makeConnection({ provider: 'telegram', credentials: TELEGRAM_CREDS });
            expect(() => conn.updateCredentials(SLACK_CREDS)).toThrow(AppError);
        });
    });

    describe('softDelete', () => {
        it('sets is_deleted to true', () => {
            const conn = makeConnection();
            conn.softDelete();
            expect(conn.is_deleted).toBe(true);
        });
    });

    describe('restore', () => {
        it('sets is_deleted to false', () => {
            const conn = makeConnection({ is_deleted: true });
            conn.restore();
            expect(conn.is_deleted).toBe(false);
        });
    });

    describe('ConnectionValidator.validateCredentials', () => {
        it('accepts valid slack credentials', () => {
            expect(() => Connection.createForDatabase('u', 'n', SLACK_CREDS)).not.toThrow();
        });

        it('accepts valid email credentials', () => {
            expect(() => Connection.createForDatabase('u', 'n', EMAIL_CREDS)).not.toThrow();
        });

        it('throws 400 when telegram chat_id is empty', () => {
            expect(() =>
                Connection.createForDatabase('u', 'n', {
                    provider: 'telegram', bot_token: 'tok', chat_id: '',
                }),
            ).toThrow(AppError);
        });

        it('throws 400 when email address is empty string', () => {
            expect(() =>
                Connection.createForDatabase('u', 'n', { provider: 'email', address: '' }),
            ).toThrow(AppError);
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/modules/connection/entity/connection.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '…connection'`

- [ ] **Step 3: Create the validator**

```ts
// src/modules/connection/entity/connection.validator.ts
import { throwAppError } from '../../errors/errors.global';
import { ConnectionCredentials } from '../connection.credentials';

export class ConnectionValidator {
    private static moduleName = 'ConnectionValidator';
    private static MinNameLength = 1;
    private static MaxNameLength = 100;
    private static urlPattern = /^https?:\/\/.+/;
    private static emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    static validateName(name: string): void {
        const trimmed = name.trim();
        if (trimmed.length < this.MinNameLength || trimmed.length > this.MaxNameLength) {
            throwAppError(
                `Name must be between ${this.MinNameLength} and ${this.MaxNameLength} characters.`,
                400,
                `${this.moduleName}.validateName`,
            );
        }
    }

    static validateCredentials(creds: ConnectionCredentials): void {
        switch (creds.provider) {
            case 'telegram':
                if (!creds.bot_token?.trim()) {
                    throwAppError('bot_token is required.', 400, `${this.moduleName}.validateCredentials`);
                }
                if (!creds.chat_id?.trim()) {
                    throwAppError('chat_id is required.', 400, `${this.moduleName}.validateCredentials`);
                }
                break;
            case 'slack':
                if (!this.urlPattern.test(creds.webhook_url)) {
                    throwAppError('webhook_url must be a valid URL.', 400, `${this.moduleName}.validateCredentials`);
                }
                break;
            case 'email':
                if (!this.emailPattern.test(creds.address)) {
                    throwAppError('address must be a valid email address.', 400, `${this.moduleName}.validateCredentials`);
                }
                break;
            default:
                throwAppError('Unknown provider.', 400, `${this.moduleName}.validateCredentials`);
        }
    }
}
```

- [ ] **Step 4: Create the entity**

```ts
// src/modules/connection/entity/connection.ts
import { ConnectionValidator } from './connection.validator';
import { throwAppError } from '../../errors/errors.global';
import { ConnectionCredentials } from '../connection.credentials';

export class Connection {
    private moduleName = 'ConnectionDomain';

    constructor(
        public id: string,
        public user_id: string,
        public provider: string,
        public name: string,
        public credentials: ConnectionCredentials,
        public created_at: Date,
        public updated_at: Date,
        public is_deleted: boolean,
    ) {}

    static createForDatabase(
        userId: string,
        name: string,
        credentials: ConnectionCredentials,
    ): { user_id: string; provider: string; name: string; credentials: ConnectionCredentials } {
        ConnectionValidator.validateName(name);
        ConnectionValidator.validateCredentials(credentials);
        return { user_id: userId, provider: credentials.provider, name, credentials };
    }

    static restore(
        id: string,
        user_id: string,
        provider: string,
        name: string,
        credentials: ConnectionCredentials,
        created_at: Date,
        updated_at: Date,
        is_deleted: boolean,
    ): Connection {
        ConnectionValidator.validateName(name);
        ConnectionValidator.validateCredentials(credentials);
        return new Connection(id, user_id, provider, name, credentials, created_at, updated_at, is_deleted);
    }

    ensureNotDeleted(op: string): void {
        if (this.is_deleted) {
            throwAppError('Connection is deleted.', 400, `${this.moduleName}.${op}`);
        }
    }

    ensureIsDeleted(op: string): void {
        if (!this.is_deleted) {
            throwAppError('Connection is not deleted.', 400, `${this.moduleName}.${op}`);
        }
    }

    ensureOwnership(actorId: string, op: string): void {
        if (this.user_id !== actorId) {
            throwAppError('Forbidden.', 403, `${this.moduleName}.${op}`);
        }
    }

    updateName(name: string): void {
        ConnectionValidator.validateName(name);
        this.name = name;
    }

    updateCredentials(credentials: ConnectionCredentials): void {
        if (credentials.provider !== this.provider) {
            throwAppError('Provider cannot be changed.', 400, `${this.moduleName}.updateCredentials`);
        }
        ConnectionValidator.validateCredentials(credentials);
        // TODO: check provider credentials availability before updating
        this.credentials = credentials;
    }

    softDelete(): void {
        this.is_deleted = true;
    }

    restore(): void {
        // TODO: check provider credentials availability before restoring
        this.is_deleted = false;
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest tests/modules/connection/entity/connection.test.ts --no-coverage
```

Expected: PASS (all tests green)

---

## Task 4: Repository Interfaces

**Files:**
- Create: `src/modules/connection/interfaces/interface.repository.ts`

- [ ] **Step 1: Create the file**

```ts
// src/modules/connection/interfaces/interface.repository.ts
import { Connection } from '../entity/connection';
import { ConnectionCredentials } from '../connection.credentials';

export interface ConnectionRepoReaderInterface {
    getConnectionById(id: string): Promise<Connection | null>;
    getActiveConnectionsByUserId(userId: string): Promise<Connection[]>;
    getDeletedConnectionsByUserId(userId: string): Promise<Connection[]>;
}

export interface ConnectionRepoWriterInterface {
    createConnection(data: {
        user_id: string;
        provider: string;
        name: string;
        credentials: ConnectionCredentials;
    }): Promise<Connection>;
    updateConnection(connection: Connection): Promise<void>;
    softDeleteConnection(id: string): Promise<void>;
    restoreConnection(id: string): Promise<void>;
}
```

Note: `createConnection` returns `Connection` (uses `INSERT … RETURNING *`) so the create use case can return a DTO without a second query.

---

## Task 5: Repository Implementations + Integration Tests

**Files:**
- Create: `src/modules/connection/repository/repository.connection.reader.ts`
- Create: `src/modules/connection/repository/repository.connection.writer.ts`
- Create: `tests/modules/connection/repository/repository.connection.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/modules/connection/repository/repository.connection.test.ts
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../../../../src/modules/connection/repository/repository.connection.writer';
import { InfraCryptoAesImplementation } from '../../../../src/modules/infra/encryption/infra.encryption_aes.implementation';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

dotenv.config();

const TELEGRAM_CREDS: ConnectionCredentials = {
    provider: 'telegram',
    bot_token: 'bot-test-token',
    chat_id: 'chat-test-id',
};

describe('RepositoryConnection Integration Tests', () => {
    let pool: Pool;
    let reader: RepositoryConnectionReader;
    let writer: RepositoryConnectionWriter;
    let testUserId: string;

    beforeAll(async () => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const encryption = InfraCryptoAesImplementation.create(process.env.ENCRYPTION_KEY!);
        reader = RepositoryConnectionReader.create(pool, encryption);
        writer = RepositoryConnectionWriter.create(pool, encryption);

        // Create a test user to satisfy the FK constraint
        const userResult = await pool.query(
            `INSERT INTO users (name, email, password_hashed, last_password, is_verified)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            ['Test User', 'conn-repo-test@example.com', 'HashedPwd1!', 'HashedPwd1!', true],
        );
        testUserId = userResult.rows[0].id;

        // Clean up any leftover connections for this user
        await pool.query('DELETE FROM connections WHERE user_id = $1', [testUserId]);
    });

    afterAll(async () => {
        await pool.query('DELETE FROM connections WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await pool.end();
    });

    describe('createConnection + getConnectionById', () => {
        it('creates a connection and reads it back with decrypted credentials', async () => {
            const created = await writer.createConnection({
                user_id: testUserId,
                provider: 'telegram',
                name: 'My Bot',
                credentials: TELEGRAM_CREDS,
            });

            expect(created).toBeInstanceOf(Connection);
            expect(created.user_id).toBe(testUserId);
            expect(created.provider).toBe('telegram');
            expect(created.credentials).toEqual(TELEGRAM_CREDS);

            const fetched = await reader.getConnectionById(created.id);
            expect(fetched).toBeInstanceOf(Connection);
            expect(fetched?.credentials).toEqual(TELEGRAM_CREDS);
        });

        it('returns null for a non-existent id', async () => {
            const result = await reader.getConnectionById('00000000-0000-0000-0000-000000000000');
            expect(result).toBeNull();
        });
    });

    describe('getActiveConnectionsByUserId', () => {
        it('returns only active connections', async () => {
            await pool.query('DELETE FROM connections WHERE user_id = $1', [testUserId]);

            await writer.createConnection({ user_id: testUserId, provider: 'telegram', name: 'A', credentials: TELEGRAM_CREDS });
            const deleted = await writer.createConnection({ user_id: testUserId, provider: 'telegram', name: 'B', credentials: TELEGRAM_CREDS });
            await writer.softDeleteConnection(deleted.id);

            const active = await reader.getActiveConnectionsByUserId(testUserId);
            expect(active).toHaveLength(1);
            expect(active[0].name).toBe('A');
        });
    });

    describe('getDeletedConnectionsByUserId', () => {
        it('returns only deleted connections', async () => {
            const deleted = await reader.getDeletedConnectionsByUserId(testUserId);
            expect(deleted).toHaveLength(1);
            expect(deleted[0].name).toBe('B');
            expect(deleted[0].is_deleted).toBe(true);
        });
    });

    describe('updateConnection', () => {
        it('updates name and credentials, persists encryption', async () => {
            await pool.query('DELETE FROM connections WHERE user_id = $1', [testUserId]);
            const conn = await writer.createConnection({
                user_id: testUserId, provider: 'telegram', name: 'Old', credentials: TELEGRAM_CREDS,
            });

            conn.updateName('New Name');
            conn.updateCredentials({ provider: 'telegram', bot_token: 'new-tok', chat_id: 'new-chat' });
            await writer.updateConnection(conn);

            const fetched = await reader.getConnectionById(conn.id);
            expect(fetched?.name).toBe('New Name');
            expect(fetched?.credentials).toEqual({ provider: 'telegram', bot_token: 'new-tok', chat_id: 'new-chat' });
        });
    });

    describe('restoreConnection', () => {
        it('sets is_deleted back to false', async () => {
            await pool.query('DELETE FROM connections WHERE user_id = $1', [testUserId]);
            const conn = await writer.createConnection({
                user_id: testUserId, provider: 'telegram', name: 'C', credentials: TELEGRAM_CREDS,
            });
            await writer.softDeleteConnection(conn.id);
            await writer.restoreConnection(conn.id);

            const fetched = await reader.getConnectionById(conn.id);
            expect(fetched?.is_deleted).toBe(false);
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/modules/connection/repository/repository.connection.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '…repository.connection.reader'`

- [ ] **Step 3: Create the reader**

```ts
// src/modules/connection/repository/repository.connection.reader.ts
import { Pool, PoolClient } from 'pg';
import { Connection } from '../entity/connection';
import { ConnectionRepoReaderInterface } from '../interfaces/interface.repository';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { handleDatabaseError } from '../../errors/mapper.database';
import { ConnectionCredentials } from '../connection.credentials';

export class RepositoryConnectionReader implements ConnectionRepoReaderInterface {
    private moduleName = 'RepositoryConnectionReader';

    constructor(
        private readonly db: Pool | PoolClient,
        private readonly encryption: InfraEncryptionInterface,
    ) {}

    static create(db: Pool | PoolClient, encryption: InfraEncryptionInterface): RepositoryConnectionReader {
        return new RepositoryConnectionReader(db, encryption);
    }

    private restoreHelper(row: any): Connection {
        const credentials: ConnectionCredentials = JSON.parse(
            this.encryption.decrypt(row.credentials.e),
        );
        return Connection.restore(
            row.id,
            row.user_id,
            row.provider,
            row.name,
            credentials,
            row.created_at,
            row.updated_at,
            row.is_deleted,
        );
    }

    async getConnectionById(id: string): Promise<Connection | null> {
        try {
            const result = await this.db.query(
                'SELECT * FROM connections WHERE id = $1',
                [id],
            );
            const row = result.rows[0];
            if (!row) return null;
            return this.restoreHelper(row);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getConnectionById: ${id}`);
        }
    }

    async getActiveConnectionsByUserId(userId: string): Promise<Connection[]> {
        try {
            const result = await this.db.query(
                'SELECT * FROM connections WHERE user_id = $1 AND is_deleted = false',
                [userId],
            );
            return result.rows.map(row => this.restoreHelper(row));
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getActiveConnectionsByUserId: ${userId}`);
        }
    }

    async getDeletedConnectionsByUserId(userId: string): Promise<Connection[]> {
        try {
            const result = await this.db.query(
                'SELECT * FROM connections WHERE user_id = $1 AND is_deleted = true',
                [userId],
            );
            return result.rows.map(row => this.restoreHelper(row));
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.getDeletedConnectionsByUserId: ${userId}`);
        }
    }
}
```

- [ ] **Step 4: Create the writer**

```ts
// src/modules/connection/repository/repository.connection.writer.ts
import { Pool, PoolClient } from 'pg';
import { Connection } from '../entity/connection';
import { ConnectionRepoWriterInterface } from '../interfaces/interface.repository';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { handleDatabaseError } from '../../errors/mapper.database';
import { ConnectionCredentials } from '../connection.credentials';

export class RepositoryConnectionWriter implements ConnectionRepoWriterInterface {
    private moduleName = 'RepositoryConnectionWriter';

    constructor(
        private readonly db: Pool | PoolClient,
        private readonly encryption: InfraEncryptionInterface,
    ) {}

    static create(db: Pool | PoolClient, encryption: InfraEncryptionInterface): RepositoryConnectionWriter {
        return new RepositoryConnectionWriter(db, encryption);
    }

    private encrypt(credentials: ConnectionCredentials): object {
        return { e: this.encryption.encrypt(JSON.stringify(credentials)) };
    }

    private restoreHelper(row: any): Connection {
        const credentials: ConnectionCredentials = JSON.parse(
            this.encryption.decrypt(row.credentials.e),
        );
        return Connection.restore(
            row.id,
            row.user_id,
            row.provider,
            row.name,
            credentials,
            row.created_at,
            row.updated_at,
            row.is_deleted,
        );
    }

    async createConnection(data: {
        user_id: string;
        provider: string;
        name: string;
        credentials: ConnectionCredentials;
    }): Promise<Connection> {
        try {
            const result = await this.db.query(
                `INSERT INTO connections (user_id, provider, name, credentials)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [data.user_id, data.provider, data.name, this.encrypt(data.credentials)],
            );
            return this.restoreHelper(result.rows[0]);
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.createConnection`);
        }
    }

    async updateConnection(connection: Connection): Promise<void> {
        try {
            await this.db.query(
                `UPDATE connections SET name = $1, credentials = $2, updated_at = now() WHERE id = $3`,
                [connection.name, this.encrypt(connection.credentials), connection.id],
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.updateConnection: ${connection.id}`);
        }
    }

    async softDeleteConnection(id: string): Promise<void> {
        try {
            await this.db.query(
                'UPDATE connections SET is_deleted = true, updated_at = now() WHERE id = $1',
                [id],
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.softDeleteConnection: ${id}`);
        }
    }

    async restoreConnection(id: string): Promise<void> {
        try {
            await this.db.query(
                'UPDATE connections SET is_deleted = false, updated_at = now() WHERE id = $1',
                [id],
            );
        } catch (e) {
            handleDatabaseError(e, `${this.moduleName}.restoreConnection: ${id}`);
        }
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest tests/modules/connection/repository/repository.connection.test.ts --no-coverage
```

Expected: PASS (all integration tests green)

---

## Task 6: DTO + Mapper

**Files:**
- Create: `src/modules/connection/dto/connection.dto.ts`
- Create: `src/modules/connection/dto/connection.dto.mapper.ts`
- Create: `tests/modules/connection/dto/connection.dto.mapper.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/modules/connection/dto/connection.dto.mapper.test.ts
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const creds: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'chat' };

function makeConnection() {
    return Connection.restore(
        'id-1', 'user-1', 'telegram', 'My Bot', creds,
        new Date('2024-01-01'), new Date('2024-01-02'), false,
    );
}

describe('ConnectionDtoMapper', () => {
    const mapper = ConnectionDtoMapper.create();

    it('maps a Connection to ConnectionDto', () => {
        const dto = mapper.mapToDto(makeConnection());
        expect(dto).toEqual({
            id: 'id-1',
            user_id: 'user-1',
            provider: 'telegram',
            name: 'My Bot',
            credentials: creds,
            created_at: new Date('2024-01-01').toISOString(),
            updated_at: new Date('2024-01-02').toISOString(),
            is_deleted: false,
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/modules/connection/dto/connection.dto.mapper.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '…connection.dto.mapper'`

- [ ] **Step 3: Create the DTO type**

```ts
// src/modules/connection/dto/connection.dto.ts
import { ConnectionCredentials } from '../connection.credentials';

export type ConnectionDto = {
    id: string;
    user_id: string;
    provider: string;
    name: string;
    credentials: ConnectionCredentials;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
};
```

- [ ] **Step 4: Create the mapper**

```ts
// src/modules/connection/dto/connection.dto.mapper.ts
import { Connection } from '../entity/connection';
import { ConnectionDto } from './connection.dto';

export class ConnectionDtoMapper {
    static create(): ConnectionDtoMapper {
        return new ConnectionDtoMapper();
    }

    mapToDto(connection: Connection): ConnectionDto {
        return {
            id: connection.id,
            user_id: connection.user_id,
            provider: connection.provider,
            name: connection.name,
            credentials: connection.credentials,
            created_at: connection.created_at.toISOString(),
            updated_at: connection.updated_at.toISOString(),
            is_deleted: connection.is_deleted,
        };
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest tests/modules/connection/dto/connection.dto.mapper.test.ts --no-coverage
```

Expected: PASS

---

## Task 7: ConnectionCreateUseCase

**Files:**
- Create: `src/modules/connection/usecases/connection.create.usecase.ts`
- Create: `tests/modules/connection/usecases/connection.create.usecase.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/modules/connection/usecases/connection.create.usecase.test.ts
import { ConnectionCreateUseCase } from '../../../../src/modules/connection/usecases/connection.create.usecase';
import { ConnectionRepoWriterInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'chat' };

function makeConnection(id = 'conn-1') {
    return Connection.restore(id, 'user-1', 'telegram', 'My Bot', CREDS, new Date(), new Date(), false);
}

describe('ConnectionCreateUseCase', () => {
    let writer: jest.Mocked<ConnectionRepoWriterInterface>;
    let mapper: ConnectionDtoMapper;
    let useCase: ConnectionCreateUseCase;

    beforeEach(() => {
        writer = {
            createConnection: jest.fn(),
            updateConnection: jest.fn(),
            softDeleteConnection: jest.fn(),
            restoreConnection: jest.fn(),
        };
        mapper = ConnectionDtoMapper.create();
        useCase = ConnectionCreateUseCase.create(writer, mapper);
    });

    it('creates a connection and returns a DTO', async () => {
        writer.createConnection.mockResolvedValue(makeConnection());
        const dto = await useCase.execute('user-1', 'My Bot', CREDS);
        expect(dto.id).toBe('conn-1');
        expect(dto.provider).toBe('telegram');
        expect(writer.createConnection).toHaveBeenCalledWith({
            user_id: 'user-1',
            provider: 'telegram',
            name: 'My Bot',
            credentials: CREDS,
        });
    });

    it('throws 400 when name is empty', async () => {
        await expect(useCase.execute('user-1', '', CREDS)).rejects.toThrow(AppError);
        expect(writer.createConnection).not.toHaveBeenCalled();
    });

    it('throws 400 when credentials are invalid', async () => {
        const badCreds: ConnectionCredentials = { provider: 'telegram', bot_token: '', chat_id: 'c' };
        await expect(useCase.execute('user-1', 'Bot', badCreds)).rejects.toThrow(AppError);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/modules/connection/usecases/connection.create.usecase.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '…connection.create.usecase'`

- [ ] **Step 3: Implement the use case**

```ts
// src/modules/connection/usecases/connection.create.usecase.ts
import { ConnectionRepoWriterInterface } from '../interfaces/interface.repository';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';
import { Connection } from '../entity/connection';
import { ConnectionCredentials } from '../connection.credentials';

export class ConnectionCreateUseCase {
    private moduleName = 'ConnectionCreateUseCase';

    constructor(
        private readonly connectionRepoWriter: ConnectionRepoWriterInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(connectionRepoWriter: ConnectionRepoWriterInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new ConnectionCreateUseCase(connectionRepoWriter, connectionDtoMapper);
    }

    async execute(userId: string, name: string, credentials: ConnectionCredentials): Promise<ConnectionDto> {
        // TODO: check provider credentials availability before persisting
        const data = Connection.createForDatabase(userId, name, credentials);
        const connection = await this.connectionRepoWriter.createConnection(data);
        return this.connectionDtoMapper.mapToDto(connection);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/modules/connection/usecases/connection.create.usecase.test.ts --no-coverage
```

Expected: PASS

---

## Task 8: ConnectionListActiveUseCase + ConnectionListDeletedUseCase

**Files:**
- Create: `src/modules/connection/usecases/connection.list_active.usecase.ts`
- Create: `src/modules/connection/usecases/connection.list_deleted.usecase.ts`
- Create: `tests/modules/connection/usecases/connection.list_active.usecase.test.ts`
- Create: `tests/modules/connection/usecases/connection.list_deleted.usecase.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/modules/connection/usecases/connection.list_active.usecase.test.ts
import { ConnectionListActiveUseCase } from '../../../../src/modules/connection/usecases/connection.list_active.usecase';
import { ConnectionRepoReaderInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'c' };

function makeConn(id: string) {
    return Connection.restore(id, 'user-1', 'telegram', 'Bot', CREDS, new Date(), new Date(), false);
}

describe('ConnectionListActiveUseCase', () => {
    let reader: jest.Mocked<ConnectionRepoReaderInterface>;
    let useCase: ConnectionListActiveUseCase;

    beforeEach(() => {
        reader = {
            getConnectionById: jest.fn(),
            getActiveConnectionsByUserId: jest.fn(),
            getDeletedConnectionsByUserId: jest.fn(),
        };
        useCase = ConnectionListActiveUseCase.create(reader, ConnectionDtoMapper.create());
    });

    it('returns DTOs for all active connections', async () => {
        reader.getActiveConnectionsByUserId.mockResolvedValue([makeConn('a'), makeConn('b')]);
        const dtos = await useCase.execute('user-1');
        expect(dtos).toHaveLength(2);
        expect(dtos[0].id).toBe('a');
        expect(reader.getActiveConnectionsByUserId).toHaveBeenCalledWith('user-1');
    });

    it('returns empty array when no active connections', async () => {
        reader.getActiveConnectionsByUserId.mockResolvedValue([]);
        const dtos = await useCase.execute('user-1');
        expect(dtos).toEqual([]);
    });
});
```

```ts
// tests/modules/connection/usecases/connection.list_deleted.usecase.test.ts
import { ConnectionListDeletedUseCase } from '../../../../src/modules/connection/usecases/connection.list_deleted.usecase';
import { ConnectionRepoReaderInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'c' };

function makeDeletedConn(id: string) {
    return Connection.restore(id, 'user-1', 'telegram', 'Bot', CREDS, new Date(), new Date(), true);
}

describe('ConnectionListDeletedUseCase', () => {
    let reader: jest.Mocked<ConnectionRepoReaderInterface>;
    let useCase: ConnectionListDeletedUseCase;

    beforeEach(() => {
        reader = {
            getConnectionById: jest.fn(),
            getActiveConnectionsByUserId: jest.fn(),
            getDeletedConnectionsByUserId: jest.fn(),
        };
        useCase = ConnectionListDeletedUseCase.create(reader, ConnectionDtoMapper.create());
    });

    it('returns DTOs for all deleted connections', async () => {
        reader.getDeletedConnectionsByUserId.mockResolvedValue([makeDeletedConn('x')]);
        const dtos = await useCase.execute('user-1');
        expect(dtos).toHaveLength(1);
        expect(dtos[0].is_deleted).toBe(true);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/modules/connection/usecases/connection.list_active.usecase.test.ts tests/modules/connection/usecases/connection.list_deleted.usecase.test.ts --no-coverage
```

Expected: FAIL — modules not found

- [ ] **Step 3: Implement both use cases**

```ts
// src/modules/connection/usecases/connection.list_active.usecase.ts
import { ConnectionRepoReaderInterface } from '../interfaces/interface.repository';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';

export class ConnectionListActiveUseCase {
    constructor(
        private readonly connectionRepoReader: ConnectionRepoReaderInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(connectionRepoReader: ConnectionRepoReaderInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new ConnectionListActiveUseCase(connectionRepoReader, connectionDtoMapper);
    }

    async execute(userId: string): Promise<ConnectionDto[]> {
        const connections = await this.connectionRepoReader.getActiveConnectionsByUserId(userId);
        return connections.map(c => this.connectionDtoMapper.mapToDto(c));
    }
}
```

```ts
// src/modules/connection/usecases/connection.list_deleted.usecase.ts
import { ConnectionRepoReaderInterface } from '../interfaces/interface.repository';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';

export class ConnectionListDeletedUseCase {
    constructor(
        private readonly connectionRepoReader: ConnectionRepoReaderInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(connectionRepoReader: ConnectionRepoReaderInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new ConnectionListDeletedUseCase(connectionRepoReader, connectionDtoMapper);
    }

    async execute(userId: string): Promise<ConnectionDto[]> {
        const connections = await this.connectionRepoReader.getDeletedConnectionsByUserId(userId);
        return connections.map(c => this.connectionDtoMapper.mapToDto(c));
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/modules/connection/usecases/connection.list_active.usecase.test.ts tests/modules/connection/usecases/connection.list_deleted.usecase.test.ts --no-coverage
```

Expected: PASS

---

## Task 9: ConnectionUpdateUseCase

**Files:**
- Create: `src/modules/connection/usecases/connection.update.usecase.ts`
- Create: `tests/modules/connection/usecases/connection.update.usecase.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/modules/connection/usecases/connection.update.usecase.test.ts
import { ConnectionUpdateUseCase } from '../../../../src/modules/connection/usecases/connection.update.usecase';
import { ConnectionRepoReaderInterface, ConnectionRepoWriterInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'c' };

function makeConn(userId = 'actor-1', isDeleted = false) {
    return Connection.restore('conn-1', userId, 'telegram', 'Old Name', CREDS, new Date(), new Date(), isDeleted);
}

describe('ConnectionUpdateUseCase', () => {
    let reader: jest.Mocked<ConnectionRepoReaderInterface>;
    let writer: jest.Mocked<ConnectionRepoWriterInterface>;
    let useCase: ConnectionUpdateUseCase;

    beforeEach(() => {
        reader = {
            getConnectionById: jest.fn(),
            getActiveConnectionsByUserId: jest.fn(),
            getDeletedConnectionsByUserId: jest.fn(),
        };
        writer = {
            createConnection: jest.fn(),
            updateConnection: jest.fn(),
            softDeleteConnection: jest.fn(),
            restoreConnection: jest.fn(),
        };
        useCase = ConnectionUpdateUseCase.create(reader, writer, ConnectionDtoMapper.create());
    });

    it('updates name only', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn());
        writer.updateConnection.mockResolvedValue();
        const dto = await useCase.execute('actor-1', 'conn-1', { name: 'New Name' });
        expect(dto.name).toBe('New Name');
        expect(writer.updateConnection).toHaveBeenCalled();
    });

    it('updates credentials only', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn());
        writer.updateConnection.mockResolvedValue();
        const newCreds: ConnectionCredentials = { provider: 'telegram', bot_token: 'new', chat_id: 'new' };
        const dto = await useCase.execute('actor-1', 'conn-1', { credentials: newCreds });
        expect(dto.credentials).toEqual(newCreds);
    });

    it('throws 400 when neither name nor credentials is provided', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn());
        await expect(useCase.execute('actor-1', 'conn-1', {})).rejects.toThrow(AppError);
        expect(writer.updateConnection).not.toHaveBeenCalled();
    });

    it('throws 404 when connection not found', async () => {
        reader.getConnectionById.mockResolvedValue(null);
        await expect(useCase.execute('actor-1', 'conn-1', { name: 'X' })).rejects.toThrow(AppError);
    });

    it('throws 403 when actor does not own the connection', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn('other-user'));
        try {
            await useCase.execute('actor-1', 'conn-1', { name: 'X' });
            fail('expected error');
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(403);
        }
    });

    it('throws 400 when connection is deleted', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn('actor-1', true));
        await expect(useCase.execute('actor-1', 'conn-1', { name: 'X' })).rejects.toThrow(AppError);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/modules/connection/usecases/connection.update.usecase.test.ts --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Implement the use case**

```ts
// src/modules/connection/usecases/connection.update.usecase.ts
import { ConnectionRepoReaderInterface, ConnectionRepoWriterInterface } from '../interfaces/interface.repository';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';
import { ConnectionCredentials } from '../connection.credentials';
import { throwAppError } from '../../errors/errors.global';

export class ConnectionUpdateUseCase {
    private moduleName = 'ConnectionUpdateUseCase';

    constructor(
        private readonly connectionRepoReader: ConnectionRepoReaderInterface,
        private readonly connectionRepoWriter: ConnectionRepoWriterInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(
        connectionRepoReader: ConnectionRepoReaderInterface,
        connectionRepoWriter: ConnectionRepoWriterInterface,
        connectionDtoMapper: ConnectionDtoMapper,
    ) {
        return new ConnectionUpdateUseCase(connectionRepoReader, connectionRepoWriter, connectionDtoMapper);
    }

    async execute(
        actorId: string,
        connectionId: string,
        fields: { name?: string; credentials?: ConnectionCredentials },
    ): Promise<ConnectionDto> {
        if (!fields.name && !fields.credentials) {
            throwAppError('At least one field must be provided.', 400, `${this.moduleName}.execute`);
        }

        const connection = await this.connectionRepoReader.getConnectionById(connectionId);
        if (!connection) {
            throwAppError('Connection not found.', 404, `${this.moduleName}.execute`);
        }

        connection.ensureOwnership(actorId, 'update');
        connection.ensureNotDeleted('update');

        if (fields.name) connection.updateName(fields.name);
        if (fields.credentials) connection.updateCredentials(fields.credentials);

        await this.connectionRepoWriter.updateConnection(connection);
        return this.connectionDtoMapper.mapToDto(connection);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest tests/modules/connection/usecases/connection.update.usecase.test.ts --no-coverage
```

Expected: PASS

---

## Task 10: ConnectionSoftDeleteUseCase + ConnectionRestoreUseCase

**Files:**
- Create: `src/modules/connection/usecases/connection.soft_delete.usecase.ts`
- Create: `src/modules/connection/usecases/connection.restore.usecase.ts`
- Create: `tests/modules/connection/usecases/connection.soft_delete.usecase.test.ts`
- Create: `tests/modules/connection/usecases/connection.restore.usecase.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/modules/connection/usecases/connection.soft_delete.usecase.test.ts
import { ConnectionSoftDeleteUseCase } from '../../../../src/modules/connection/usecases/connection.soft_delete.usecase';
import { ConnectionRepoReaderInterface, ConnectionRepoWriterInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'c' };

function makeConn(userId = 'actor-1', isDeleted = false) {
    return Connection.restore('conn-1', userId, 'telegram', 'Bot', CREDS, new Date(), new Date(), isDeleted);
}

describe('ConnectionSoftDeleteUseCase', () => {
    let reader: jest.Mocked<ConnectionRepoReaderInterface>;
    let writer: jest.Mocked<ConnectionRepoWriterInterface>;
    let useCase: ConnectionSoftDeleteUseCase;

    beforeEach(() => {
        reader = {
            getConnectionById: jest.fn(),
            getActiveConnectionsByUserId: jest.fn(),
            getDeletedConnectionsByUserId: jest.fn(),
        };
        writer = {
            createConnection: jest.fn(),
            updateConnection: jest.fn(),
            softDeleteConnection: jest.fn(),
            restoreConnection: jest.fn(),
        };
        useCase = ConnectionSoftDeleteUseCase.create(reader, writer);
    });

    it('soft-deletes an owned active connection', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn());
        writer.softDeleteConnection.mockResolvedValue();
        await useCase.execute('actor-1', 'conn-1');
        expect(writer.softDeleteConnection).toHaveBeenCalledWith('conn-1');
    });

    it('throws 404 when connection not found', async () => {
        reader.getConnectionById.mockResolvedValue(null);
        await expect(useCase.execute('actor-1', 'conn-1')).rejects.toThrow(AppError);
    });

    it('throws 403 when actor does not own the connection', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn('other-user'));
        try {
            await useCase.execute('actor-1', 'conn-1');
            fail('expected error');
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(403);
        }
    });

    it('throws 400 when connection is already deleted', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn('actor-1', true));
        await expect(useCase.execute('actor-1', 'conn-1')).rejects.toThrow(AppError);
    });
});
```

```ts
// tests/modules/connection/usecases/connection.restore.usecase.test.ts
import { ConnectionRestoreUseCase } from '../../../../src/modules/connection/usecases/connection.restore.usecase';
import { ConnectionRepoReaderInterface, ConnectionRepoWriterInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'c' };

function makeConn(userId = 'actor-1', isDeleted = true) {
    return Connection.restore('conn-1', userId, 'telegram', 'Bot', CREDS, new Date(), new Date(), isDeleted);
}

describe('ConnectionRestoreUseCase', () => {
    let reader: jest.Mocked<ConnectionRepoReaderInterface>;
    let writer: jest.Mocked<ConnectionRepoWriterInterface>;
    let useCase: ConnectionRestoreUseCase;

    beforeEach(() => {
        reader = {
            getConnectionById: jest.fn(),
            getActiveConnectionsByUserId: jest.fn(),
            getDeletedConnectionsByUserId: jest.fn(),
        };
        writer = {
            createConnection: jest.fn(),
            updateConnection: jest.fn(),
            softDeleteConnection: jest.fn(),
            restoreConnection: jest.fn(),
        };
        useCase = ConnectionRestoreUseCase.create(reader, writer, ConnectionDtoMapper.create());
    });

    it('restores an owned deleted connection and returns DTO', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn());
        writer.restoreConnection.mockResolvedValue();
        const dto = await useCase.execute('actor-1', 'conn-1');
        expect(dto.is_deleted).toBe(false);
        expect(writer.restoreConnection).toHaveBeenCalledWith('conn-1');
    });

    it('throws 404 when connection not found', async () => {
        reader.getConnectionById.mockResolvedValue(null);
        await expect(useCase.execute('actor-1', 'conn-1')).rejects.toThrow(AppError);
    });

    it('throws 403 when actor does not own the connection', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn('other-user'));
        try {
            await useCase.execute('actor-1', 'conn-1');
            fail('expected error');
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError);
            expect(e.statusCode).toBe(403);
        }
    });

    it('throws 400 when connection is not deleted', async () => {
        reader.getConnectionById.mockResolvedValue(makeConn('actor-1', false));
        await expect(useCase.execute('actor-1', 'conn-1')).rejects.toThrow(AppError);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/modules/connection/usecases/connection.soft_delete.usecase.test.ts tests/modules/connection/usecases/connection.restore.usecase.test.ts --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Implement both use cases**

```ts
// src/modules/connection/usecases/connection.soft_delete.usecase.ts
import { ConnectionRepoReaderInterface, ConnectionRepoWriterInterface } from '../interfaces/interface.repository';
import { throwAppError } from '../../errors/errors.global';

export class ConnectionSoftDeleteUseCase {
    private moduleName = 'ConnectionSoftDeleteUseCase';

    constructor(
        private readonly connectionRepoReader: ConnectionRepoReaderInterface,
        private readonly connectionRepoWriter: ConnectionRepoWriterInterface,
    ) {}

    static create(
        connectionRepoReader: ConnectionRepoReaderInterface,
        connectionRepoWriter: ConnectionRepoWriterInterface,
    ) {
        return new ConnectionSoftDeleteUseCase(connectionRepoReader, connectionRepoWriter);
    }

    async execute(actorId: string, connectionId: string): Promise<void> {
        const connection = await this.connectionRepoReader.getConnectionById(connectionId);
        if (!connection) {
            throwAppError('Connection not found.', 404, `${this.moduleName}.execute`);
        }
        connection.ensureOwnership(actorId, 'softDelete');
        connection.ensureNotDeleted('softDelete');
        connection.softDelete();
        await this.connectionRepoWriter.softDeleteConnection(connection.id);
    }
}
```

```ts
// src/modules/connection/usecases/connection.restore.usecase.ts
import { ConnectionRepoReaderInterface, ConnectionRepoWriterInterface } from '../interfaces/interface.repository';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';
import { throwAppError } from '../../errors/errors.global';

export class ConnectionRestoreUseCase {
    private moduleName = 'ConnectionRestoreUseCase';

    constructor(
        private readonly connectionRepoReader: ConnectionRepoReaderInterface,
        private readonly connectionRepoWriter: ConnectionRepoWriterInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(
        connectionRepoReader: ConnectionRepoReaderInterface,
        connectionRepoWriter: ConnectionRepoWriterInterface,
        connectionDtoMapper: ConnectionDtoMapper,
    ) {
        return new ConnectionRestoreUseCase(connectionRepoReader, connectionRepoWriter, connectionDtoMapper);
    }

    async execute(actorId: string, connectionId: string): Promise<ConnectionDto> {
        const connection = await this.connectionRepoReader.getConnectionById(connectionId);
        if (!connection) {
            throwAppError('Connection not found.', 404, `${this.moduleName}.execute`);
        }
        connection.ensureOwnership(actorId, 'restore');
        connection.ensureIsDeleted('restore');
        connection.restore();
        await this.connectionRepoWriter.restoreConnection(connection.id);
        return this.connectionDtoMapper.mapToDto(connection);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/modules/connection/usecases/connection.soft_delete.usecase.test.ts tests/modules/connection/usecases/connection.restore.usecase.test.ts --no-coverage
```

Expected: PASS

---

## Task 11: TxService for Create, ListActive, ListDeleted

**Files:**
- Create: `src/modules/connection/transactional_services/tx_service.connection.create.ts`
- Create: `src/modules/connection/transactional_services/tx_service.connection.list_active.ts`
- Create: `src/modules/connection/transactional_services/tx_service.connection.list_deleted.ts`
- Create: `tests/modules/connection/transactional_services/tx_service.connection.create.test.ts`
- Create: `tests/modules/connection/transactional_services/tx_service.connection.list_active.test.ts`
- Create: `tests/modules/connection/transactional_services/tx_service.connection.list_deleted.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/modules/connection/transactional_services/tx_service.connection.create.test.ts
import { TxServiceConnectionCreate } from '../../../../src/modules/connection/transactional_services/tx_service.connection.create';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { RepositoryConnectionWriter } from '../../../../src/modules/connection/repository/repository.connection.writer';
import { ConnectionCreateUseCase } from '../../../../src/modules/connection/usecases/connection.create.usecase';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

jest.mock('../../../../src/modules/connection/repository/repository.connection.writer');
jest.mock('../../../../src/modules/connection/usecases/connection.create.usecase');

describe('TxServiceConnectionCreate', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceConnectionCreate;

    const CREDS: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: 'c' };

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceConnectionCreate.create(txManager, ConnectionDtoMapper.create());
    });

    it('runs create inside a transaction and returns DTO', async () => {
        const mockDto = { id: 'conn-1' } as any;
        const executeMock = jest.fn().mockResolvedValue(mockDto);
        (ConnectionCreateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.createConnectionService('user-1', 'My Bot', CREDS);

        expect(result).toBe(mockDto);
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('user-1', 'My Bot', CREDS);
    });
});
```

```ts
// tests/modules/connection/transactional_services/tx_service.connection.list_active.test.ts
import { TxServiceConnectionListActive } from '../../../../src/modules/connection/transactional_services/tx_service.connection.list_active';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { ConnectionListActiveUseCase } from '../../../../src/modules/connection/usecases/connection.list_active.usecase';

jest.mock('../../../../src/modules/connection/repository/repository.connection.reader');
jest.mock('../../../../src/modules/connection/usecases/connection.list_active.usecase');

describe('TxServiceConnectionListActive', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceConnectionListActive;

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceConnectionListActive.create(txManager, ConnectionDtoMapper.create());
    });

    it('runs list inside a transaction and returns DTOs', async () => {
        const mockDtos = [{ id: 'a' }] as any;
        const executeMock = jest.fn().mockResolvedValue(mockDtos);
        (ConnectionListActiveUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.listActiveConnectionsService('user-1');

        expect(result).toBe(mockDtos);
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('user-1');
    });
});
```

```ts
// tests/modules/connection/transactional_services/tx_service.connection.list_deleted.test.ts
import { TxServiceConnectionListDeleted } from '../../../../src/modules/connection/transactional_services/tx_service.connection.list_deleted';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { ConnectionListDeletedUseCase } from '../../../../src/modules/connection/usecases/connection.list_deleted.usecase';

jest.mock('../../../../src/modules/connection/repository/repository.connection.reader');
jest.mock('../../../../src/modules/connection/usecases/connection.list_deleted.usecase');

describe('TxServiceConnectionListDeleted', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceConnectionListDeleted;

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceConnectionListDeleted.create(txManager, ConnectionDtoMapper.create());
    });

    it('runs list inside a transaction and returns DTOs', async () => {
        const mockDtos = [{ id: 'x', is_deleted: true }] as any;
        const executeMock = jest.fn().mockResolvedValue(mockDtos);
        (ConnectionListDeletedUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.listDeletedConnectionsService('user-1');

        expect(result).toBe(mockDtos);
        expect(executeMock).toHaveBeenCalledWith('user-1');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/modules/connection/transactional_services/tx_service.connection.create.test.ts tests/modules/connection/transactional_services/tx_service.connection.list_active.test.ts tests/modules/connection/transactional_services/tx_service.connection.list_deleted.test.ts --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Implement all three tx services**

```ts
// src/modules/connection/transactional_services/tx_service.connection.create.ts
import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryConnectionWriter } from '../repository/repository.connection.writer';
import { ConnectionCreateUseCase } from '../usecases/connection.create.usecase';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';
import { ConnectionCredentials } from '../connection.credentials';

export class TxServiceConnectionCreate {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new TxServiceConnectionCreate(txManager, encryption, connectionDtoMapper);
    }

    async createConnectionService(userId: string, name: string, credentials: ConnectionCredentials): Promise<ConnectionDto> {
        return await this.txManager.runInTransaction(async (client) => {
            const writer = RepositoryConnectionWriter.create(client, this.encryption);
            const useCase = ConnectionCreateUseCase.create(writer, this.connectionDtoMapper);
            return await useCase.execute(userId, name, credentials);
        });
    }
}
```

```ts
// src/modules/connection/transactional_services/tx_service.connection.list_active.ts
import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryConnectionReader } from '../repository/repository.connection.reader';
import { ConnectionListActiveUseCase } from '../usecases/connection.list_active.usecase';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';

export class TxServiceConnectionListActive {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new TxServiceConnectionListActive(txManager, encryption, connectionDtoMapper);
    }

    async listActiveConnectionsService(userId: string): Promise<ConnectionDto[]> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryConnectionReader.create(client, this.encryption);
            const useCase = ConnectionListActiveUseCase.create(reader, this.connectionDtoMapper);
            return await useCase.execute(userId);
        });
    }
}
```

```ts
// src/modules/connection/transactional_services/tx_service.connection.list_deleted.ts
import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryConnectionReader } from '../repository/repository.connection.reader';
import { ConnectionListDeletedUseCase } from '../usecases/connection.list_deleted.usecase';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';

export class TxServiceConnectionListDeleted {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new TxServiceConnectionListDeleted(txManager, encryption, connectionDtoMapper);
    }

    async listDeletedConnectionsService(userId: string): Promise<ConnectionDto[]> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryConnectionReader.create(client, this.encryption);
            const useCase = ConnectionListDeletedUseCase.create(reader, this.connectionDtoMapper);
            return await useCase.execute(userId);
        });
    }
}
```

- [ ] **Step 4: Update the tx service tests** — the test mocks `RepositoryConnectionWriter.create` but the real tx service also injects `encryption`. The `jest.mock` on the static factory captures both args. The test verifies the mock was called and `execute` was called with correct args. This is sufficient.

> Note: the test stubs pass `ConnectionDtoMapper.create()` as second arg to `TxServiceConnectionCreate.create`, but the real constructor now takes `(txManager, encryption, dtoMapper)`. Fix the test's `service = TxServiceConnectionCreate.create(txManager, ConnectionDtoMapper.create())` to pass a mock encryption as second arg:

Update `tx_service.connection.create.test.ts` line calling `TxServiceConnectionCreate.create`:
```ts
const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;
service = TxServiceConnectionCreate.create(txManager, mockEncryption, ConnectionDtoMapper.create());
```

Update `tx_service.connection.list_active.test.ts`:
```ts
const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;
service = TxServiceConnectionListActive.create(txManager, mockEncryption, ConnectionDtoMapper.create());
```

Update `tx_service.connection.list_deleted.test.ts`:
```ts
const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;
service = TxServiceConnectionListDeleted.create(txManager, mockEncryption, ConnectionDtoMapper.create());
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest tests/modules/connection/transactional_services/tx_service.connection.create.test.ts tests/modules/connection/transactional_services/tx_service.connection.list_active.test.ts tests/modules/connection/transactional_services/tx_service.connection.list_deleted.test.ts --no-coverage
```

Expected: PASS

---

## Task 12: TxService for Update, SoftDelete, Restore

**Files:**
- Create: `src/modules/connection/transactional_services/tx_service.connection.update.ts`
- Create: `src/modules/connection/transactional_services/tx_service.connection.soft_delete.ts`
- Create: `src/modules/connection/transactional_services/tx_service.connection.restore.ts`
- Create: `tests/modules/connection/transactional_services/tx_service.connection.update.test.ts`
- Create: `tests/modules/connection/transactional_services/tx_service.connection.soft_delete.test.ts`
- Create: `tests/modules/connection/transactional_services/tx_service.connection.restore.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/modules/connection/transactional_services/tx_service.connection.update.test.ts
import { TxServiceConnectionUpdate } from '../../../../src/modules/connection/transactional_services/tx_service.connection.update';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../../../../src/modules/connection/repository/repository.connection.writer';
import { ConnectionUpdateUseCase } from '../../../../src/modules/connection/usecases/connection.update.usecase';

jest.mock('../../../../src/modules/connection/repository/repository.connection.reader');
jest.mock('../../../../src/modules/connection/repository/repository.connection.writer');
jest.mock('../../../../src/modules/connection/usecases/connection.update.usecase');

describe('TxServiceConnectionUpdate', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceConnectionUpdate;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceConnectionUpdate.create(txManager, mockEncryption, ConnectionDtoMapper.create());
    });

    it('runs update inside a transaction', async () => {
        const mockDto = { id: 'conn-1', name: 'New' } as any;
        const executeMock = jest.fn().mockResolvedValue(mockDto);
        (ConnectionUpdateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.updateConnectionService('actor-1', 'conn-1', { name: 'New' });

        expect(result).toBe(mockDto);
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('actor-1', 'conn-1', { name: 'New' });
    });
});
```

```ts
// tests/modules/connection/transactional_services/tx_service.connection.soft_delete.test.ts
import { TxServiceConnectionSoftDelete } from '../../../../src/modules/connection/transactional_services/tx_service.connection.soft_delete';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../../../../src/modules/connection/repository/repository.connection.writer';
import { ConnectionSoftDeleteUseCase } from '../../../../src/modules/connection/usecases/connection.soft_delete.usecase';

jest.mock('../../../../src/modules/connection/repository/repository.connection.reader');
jest.mock('../../../../src/modules/connection/repository/repository.connection.writer');
jest.mock('../../../../src/modules/connection/usecases/connection.soft_delete.usecase');

describe('TxServiceConnectionSoftDelete', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceConnectionSoftDelete;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceConnectionSoftDelete.create(txManager, mockEncryption);
    });

    it('runs soft-delete inside a transaction', async () => {
        const executeMock = jest.fn().mockResolvedValue(undefined);
        (ConnectionSoftDeleteUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        await service.softDeleteConnectionService('actor-1', 'conn-1');

        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('actor-1', 'conn-1');
    });
});
```

```ts
// tests/modules/connection/transactional_services/tx_service.connection.restore.test.ts
import { TxServiceConnectionRestore } from '../../../../src/modules/connection/transactional_services/tx_service.connection.restore';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { ConnectionDtoMapper } from '../../../../src/modules/connection/dto/connection.dto.mapper';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../../../../src/modules/connection/repository/repository.connection.writer';
import { ConnectionRestoreUseCase } from '../../../../src/modules/connection/usecases/connection.restore.usecase';

jest.mock('../../../../src/modules/connection/repository/repository.connection.reader');
jest.mock('../../../../src/modules/connection/repository/repository.connection.writer');
jest.mock('../../../../src/modules/connection/usecases/connection.restore.usecase');

describe('TxServiceConnectionRestore', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceConnectionRestore;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    beforeEach(() => {
        txManager = {
            runInTransaction: jest.fn().mockImplementation(async (cb) => cb({} as any)),
        };
        service = TxServiceConnectionRestore.create(txManager, mockEncryption, ConnectionDtoMapper.create());
    });

    it('runs restore inside a transaction and returns DTO', async () => {
        const mockDto = { id: 'conn-1', is_deleted: false } as any;
        const executeMock = jest.fn().mockResolvedValue(mockDto);
        (ConnectionRestoreUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.restoreConnectionService('actor-1', 'conn-1');

        expect(result).toBe(mockDto);
        expect(executeMock).toHaveBeenCalledWith('actor-1', 'conn-1');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/modules/connection/transactional_services/tx_service.connection.update.test.ts tests/modules/connection/transactional_services/tx_service.connection.soft_delete.test.ts tests/modules/connection/transactional_services/tx_service.connection.restore.test.ts --no-coverage
```

Expected: FAIL

- [ ] **Step 3: Implement all three tx services**

```ts
// src/modules/connection/transactional_services/tx_service.connection.update.ts
import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryConnectionReader } from '../repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../repository/repository.connection.writer';
import { ConnectionUpdateUseCase } from '../usecases/connection.update.usecase';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';
import { ConnectionCredentials } from '../connection.credentials';

export class TxServiceConnectionUpdate {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new TxServiceConnectionUpdate(txManager, encryption, connectionDtoMapper);
    }

    async updateConnectionService(
        actorId: string,
        connectionId: string,
        fields: { name?: string; credentials?: ConnectionCredentials },
    ): Promise<ConnectionDto> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryConnectionReader.create(client, this.encryption);
            const writer = RepositoryConnectionWriter.create(client, this.encryption);
            const useCase = ConnectionUpdateUseCase.create(reader, writer, this.connectionDtoMapper);
            return await useCase.execute(actorId, connectionId, fields);
        });
    }
}
```

```ts
// src/modules/connection/transactional_services/tx_service.connection.soft_delete.ts
import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryConnectionReader } from '../repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../repository/repository.connection.writer';
import { ConnectionSoftDeleteUseCase } from '../usecases/connection.soft_delete.usecase';

export class TxServiceConnectionSoftDelete {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface) {
        return new TxServiceConnectionSoftDelete(txManager, encryption);
    }

    async softDeleteConnectionService(actorId: string, connectionId: string): Promise<void> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryConnectionReader.create(client, this.encryption);
            const writer = RepositoryConnectionWriter.create(client, this.encryption);
            const useCase = ConnectionSoftDeleteUseCase.create(reader, writer);
            return await useCase.execute(actorId, connectionId);
        });
    }
}
```

```ts
// src/modules/connection/transactional_services/tx_service.connection.restore.ts
import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryConnectionReader } from '../repository/repository.connection.reader';
import { RepositoryConnectionWriter } from '../repository/repository.connection.writer';
import { ConnectionRestoreUseCase } from '../usecases/connection.restore.usecase';
import { ConnectionDtoMapper } from '../dto/connection.dto.mapper';
import { ConnectionDto } from '../dto/connection.dto';

export class TxServiceConnectionRestore {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly connectionDtoMapper: ConnectionDtoMapper,
    ) {}

    static create(txManager: TransactionManagerInterface, encryption: InfraEncryptionInterface, connectionDtoMapper: ConnectionDtoMapper) {
        return new TxServiceConnectionRestore(txManager, encryption, connectionDtoMapper);
    }

    async restoreConnectionService(actorId: string, connectionId: string): Promise<ConnectionDto> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryConnectionReader.create(client, this.encryption);
            const writer = RepositoryConnectionWriter.create(client, this.encryption);
            const useCase = ConnectionRestoreUseCase.create(reader, writer, this.connectionDtoMapper);
            return await useCase.execute(actorId, connectionId);
        });
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/modules/connection/transactional_services/tx_service.connection.update.test.ts tests/modules/connection/transactional_services/tx_service.connection.soft_delete.test.ts tests/modules/connection/transactional_services/tx_service.connection.restore.test.ts --no-coverage
```

Expected: PASS

---

## Task 13: Controllers + E2E Test

**Files:**
- Create: all 6 controller files
- Create: `tests/modules/connection/controllers/controller.connection.e2e.test.ts`

- [ ] **Step 1: Write the failing e2e test**

```ts
// tests/modules/connection/controllers/controller.connection.e2e.test.ts
import request from 'supertest';
import { createApp } from '../../../../src/app';
import { DepsContainer } from '../../../../src/container';
import { JwtTokenService } from '../../../../src/modules/authentification/jwt/service/jwt.token_service';
import { UserIdExtractor } from '../../../../src/modules/authentification/extractor.extract_user_id';
import { ControllerConnectionCreate } from '../../../../src/modules/connection/controllers/controller.connection.create';
import { ControllerConnectionListActive } from '../../../../src/modules/connection/controllers/controller.connection.list_active';
import { ControllerConnectionListDeleted } from '../../../../src/modules/connection/controllers/controller.connection.list_deleted';
import { ControllerConnectionUpdate } from '../../../../src/modules/connection/controllers/controller.connection.update';
import { ControllerConnectionSoftDelete } from '../../../../src/modules/connection/controllers/controller.connection.soft_delete';
import { ControllerConnectionRestore } from '../../../../src/modules/connection/controllers/controller.connection.restore';
import { AppError } from '../../../../src/modules/errors/errors.global';
import { ConnectionDto } from '../../../../src/modules/connection/dto/connection.dto';

const jwtService = JwtTokenService.create();
const extractor = UserIdExtractor.create();

function bearerFor(userId: string) {
    return `Bearer ${jwtService.generateAccessToken(userId)}`;
}

const ACTOR_AUTH = bearerFor('actor-uuid');

const NOW = new Date().toISOString();

const CONN_DTO: ConnectionDto = {
    id: 'conn-uuid-1',
    user_id: 'actor-uuid',
    provider: 'telegram',
    name: 'My Bot',
    credentials: { provider: 'telegram', bot_token: 'tok', chat_id: 'chat' },
    created_at: NOW,
    updated_at: NOW,
    is_deleted: false,
};

function mockCreateSvc(overrides: Partial<{ createConnectionService: jest.Mock }> = {}) {
    return { createConnectionService: jest.fn().mockResolvedValue(CONN_DTO), ...overrides } as any;
}
function mockListActiveSvc(overrides: Partial<{ listActiveConnectionsService: jest.Mock }> = {}) {
    return { listActiveConnectionsService: jest.fn().mockResolvedValue([CONN_DTO]), ...overrides } as any;
}
function mockListDeletedSvc(overrides: Partial<{ listDeletedConnectionsService: jest.Mock }> = {}) {
    return { listDeletedConnectionsService: jest.fn().mockResolvedValue([{ ...CONN_DTO, is_deleted: true }]), ...overrides } as any;
}
function mockUpdateSvc(overrides: Partial<{ updateConnectionService: jest.Mock }> = {}) {
    return { updateConnectionService: jest.fn().mockResolvedValue(CONN_DTO), ...overrides } as any;
}
function mockSoftDeleteSvc(overrides: Partial<{ softDeleteConnectionService: jest.Mock }> = {}) {
    return { softDeleteConnectionService: jest.fn().mockResolvedValue(undefined), ...overrides } as any;
}
function mockRestoreSvc(overrides: Partial<{ restoreConnectionService: jest.Mock }> = {}) {
    return { restoreConnectionService: jest.fn().mockResolvedValue({ ...CONN_DTO, is_deleted: false }), ...overrides } as any;
}

function buildContainer(overrides: Partial<DepsContainer> = {}): DepsContainer {
    const noopAuth = { registerRequestCont: jest.fn(), registerConfirmCont: jest.fn() } as any;

    return {
        jwtTokenService: jwtService,
        controllerRegisterRequest: noopAuth,
        controllerRegisterConfirm: noopAuth,
        controllerLoginEmail: { loginEmailCont: jest.fn() } as any,
        controllerRefresh: { refreshCont: jest.fn() } as any,
        controllerLogout: { logoutCont: jest.fn() } as any,
        controllerChangePassword: { changePasswordCont: jest.fn() } as any,
        controllerUpdateName: { updateNameCont: jest.fn() } as any,
        controllerRequestEmailChange: { requestEmailChangeCont: jest.fn() } as any,
        controllerConfirmEmailChange: { confirmEmailChangeCont: jest.fn() } as any,
        controllerRequestPasswordReset: { requestPasswordResetCont: jest.fn() } as any,
        controllerConfirmPasswordReset: { confirmPasswordResetCont: jest.fn() } as any,
        controllerRequestAccountDeletion: { requestAccountDeletionCont: jest.fn() } as any,
        controllerConfirmAccountDeletion: { confirmAccountDeletionCont: jest.fn() } as any,
        controllerGetSelfProfile: { getSelfProfileCont: jest.fn() } as any,
        controllerGetOtherProfile: { getOtherProfileCont: jest.fn() } as any,
        controllerConnectionCreate: ControllerConnectionCreate.create(mockCreateSvc(), extractor),
        controllerConnectionListActive: ControllerConnectionListActive.create(mockListActiveSvc(), extractor),
        controllerConnectionListDeleted: ControllerConnectionListDeleted.create(mockListDeletedSvc(), extractor),
        controllerConnectionUpdate: ControllerConnectionUpdate.create(mockUpdateSvc(), extractor),
        controllerConnectionSoftDelete: ControllerConnectionSoftDelete.create(mockSoftDeleteSvc(), extractor),
        controllerConnectionRestore: ControllerConnectionRestore.create(mockRestoreSvc(), extractor),
        ...overrides,
    } as DepsContainer;
}

describe('Connection controllers e2e', () => {

    describe('POST /protected/connections', () => {
        it('returns 201 with connection DTO on success', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/connections')
                .set('Authorization', ACTOR_AUTH)
                .send({ name: 'My Bot', credentials: { provider: 'telegram', bot_token: 'tok', chat_id: 'c' } });
            expect(res.status).toBe(201);
            expect(res.body.connection.id).toBe('conn-uuid-1');
        });

        it('returns 401 without auth', async () => {
            const app = createApp(buildContainer());
            const res = await request(app).post('/protected/connections').send({ name: 'x', credentials: {} });
            expect(res.status).toBe(401);
        });

        it('returns 400 when body is missing name', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/connections')
                .set('Authorization', ACTOR_AUTH)
                .send({ credentials: { provider: 'telegram', bot_token: 't', chat_id: 'c' } });
            expect(res.status).toBe(400);
        });

        it('propagates AppError from service', async () => {
            const app = createApp(buildContainer({
                controllerConnectionCreate: ControllerConnectionCreate.create(
                    mockCreateSvc({ createConnectionService: jest.fn().mockRejectedValue(new AppError('Bad creds', 400, 'test')) }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .post('/protected/connections')
                .set('Authorization', ACTOR_AUTH)
                .send({ name: 'Bot', credentials: { provider: 'telegram', bot_token: 't', chat_id: 'c' } });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /protected/connections', () => {
        it('returns 200 with list of active connections', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .get('/protected/connections')
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(200);
            expect(res.body.connections).toHaveLength(1);
        });

        it('returns 401 without auth', async () => {
            const app = createApp(buildContainer());
            expect((await request(app).get('/protected/connections')).status).toBe(401);
        });
    });

    describe('GET /protected/connections/deleted', () => {
        it('returns 200 with list of deleted connections', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .get('/protected/connections/deleted')
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(200);
            expect(res.body.connections[0].is_deleted).toBe(true);
        });
    });

    describe('PATCH /protected/connections/:id', () => {
        it('returns 200 with updated connection', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .patch('/protected/connections/conn-uuid-1')
                .set('Authorization', ACTOR_AUTH)
                .send({ name: 'New Name' });
            expect(res.status).toBe(200);
            expect(res.body.connection).toBeDefined();
        });

        it('returns 401 without auth', async () => {
            const app = createApp(buildContainer());
            expect((await request(app).patch('/protected/connections/x').send({ name: 'x' })).status).toBe(401);
        });

        it('returns 403 when service throws 403 AppError', async () => {
            const app = createApp(buildContainer({
                controllerConnectionUpdate: ControllerConnectionUpdate.create(
                    mockUpdateSvc({ updateConnectionService: jest.fn().mockRejectedValue(new AppError('Forbidden.', 403, 'test')) }),
                    extractor,
                ),
            }));
            const res = await request(app)
                .patch('/protected/connections/conn-uuid-1')
                .set('Authorization', ACTOR_AUTH)
                .send({ name: 'x' });
            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /protected/connections/:id', () => {
        it('returns 204 on success', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .delete('/protected/connections/conn-uuid-1')
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(204);
        });

        it('returns 401 without auth', async () => {
            expect((await request(createApp(buildContainer())).delete('/protected/connections/x')).status).toBe(401);
        });
    });

    describe('POST /protected/connections/:id/restore', () => {
        it('returns 200 with restored connection', async () => {
            const app = createApp(buildContainer());
            const res = await request(app)
                .post('/protected/connections/conn-uuid-1/restore')
                .set('Authorization', ACTOR_AUTH);
            expect(res.status).toBe(200);
            expect(res.body.connection.is_deleted).toBe(false);
        });

        it('returns 401 without auth', async () => {
            expect((await request(createApp(buildContainer())).post('/protected/connections/x/restore')).status).toBe(401);
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/modules/connection/controllers/controller.connection.e2e.test.ts --no-coverage
```

Expected: FAIL — modules not found

- [ ] **Step 3: Create all 6 controllers**

```ts
// src/modules/connection/controllers/controller.connection.create.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { TxServiceConnectionCreate } from '../transactional_services/tx_service.connection.create';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

const CredentialsSchema = z.discriminatedUnion('provider', [
    z.object({ provider: z.literal('telegram'), bot_token: z.string().min(1), chat_id: z.string().min(1) }),
    z.object({ provider: z.literal('slack'), webhook_url: z.string().url() }),
    z.object({ provider: z.literal('email'), address: z.string().email() }),
]);

export const CreateConnectionBodySchema = z.object({
    name: z.string().min(1).max(100),
    credentials: CredentialsSchema,
});

type CreateConnectionBodyType = z.infer<typeof CreateConnectionBodySchema>;

export class ControllerConnectionCreate {
    private moduleName = 'ControllerConnectionCreate';

    constructor(
        private readonly txService: TxServiceConnectionCreate,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceConnectionCreate, extractor: UserIdExtractor) {
        return new ControllerConnectionCreate(txService, extractor);
    }

    createConnectionCont = async (req: Request<{}, {}, CreateConnectionBodyType>, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const { name, credentials } = req.body;
        const connection = await this.txService.createConnectionService(userId, name, credentials);
        return res.status(201).json({ connection });
    };
}
```

```ts
// src/modules/connection/controllers/controller.connection.list_active.ts
import { Request, Response } from 'express';
import { TxServiceConnectionListActive } from '../transactional_services/tx_service.connection.list_active';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export class ControllerConnectionListActive {
    private moduleName = 'ControllerConnectionListActive';

    constructor(
        private readonly txService: TxServiceConnectionListActive,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceConnectionListActive, extractor: UserIdExtractor) {
        return new ControllerConnectionListActive(txService, extractor);
    }

    listActiveConnectionsCont = async (req: Request, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const connections = await this.txService.listActiveConnectionsService(userId);
        return res.status(200).json({ connections });
    };
}
```

```ts
// src/modules/connection/controllers/controller.connection.list_deleted.ts
import { Request, Response } from 'express';
import { TxServiceConnectionListDeleted } from '../transactional_services/tx_service.connection.list_deleted';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export class ControllerConnectionListDeleted {
    private moduleName = 'ControllerConnectionListDeleted';

    constructor(
        private readonly txService: TxServiceConnectionListDeleted,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceConnectionListDeleted, extractor: UserIdExtractor) {
        return new ControllerConnectionListDeleted(txService, extractor);
    }

    listDeletedConnectionsCont = async (req: Request, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const connections = await this.txService.listDeletedConnectionsService(userId);
        return res.status(200).json({ connections });
    };
}
```

```ts
// src/modules/connection/controllers/controller.connection.update.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { TxServiceConnectionUpdate } from '../transactional_services/tx_service.connection.update';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

const CredentialsSchema = z.discriminatedUnion('provider', [
    z.object({ provider: z.literal('telegram'), bot_token: z.string().min(1), chat_id: z.string().min(1) }),
    z.object({ provider: z.literal('slack'), webhook_url: z.string().url() }),
    z.object({ provider: z.literal('email'), address: z.string().email() }),
]);

export const UpdateConnectionBodySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    credentials: CredentialsSchema.optional(),
});

type UpdateConnectionBodyType = z.infer<typeof UpdateConnectionBodySchema>;

export class ControllerConnectionUpdate {
    private moduleName = 'ControllerConnectionUpdate';

    constructor(
        private readonly txService: TxServiceConnectionUpdate,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceConnectionUpdate, extractor: UserIdExtractor) {
        return new ControllerConnectionUpdate(txService, extractor);
    }

    updateConnectionCont = async (req: Request<{ id: string }, {}, UpdateConnectionBodyType>, res: Response) => {
        const actorId = this.extractor.extractUserId(req, this.moduleName);
        const { id } = req.params;
        const { name, credentials } = req.body;
        const connection = await this.txService.updateConnectionService(actorId, id, { name, credentials });
        return res.status(200).json({ connection });
    };
}
```

```ts
// src/modules/connection/controllers/controller.connection.soft_delete.ts
import { Request, Response } from 'express';
import { TxServiceConnectionSoftDelete } from '../transactional_services/tx_service.connection.soft_delete';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export class ControllerConnectionSoftDelete {
    private moduleName = 'ControllerConnectionSoftDelete';

    constructor(
        private readonly txService: TxServiceConnectionSoftDelete,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceConnectionSoftDelete, extractor: UserIdExtractor) {
        return new ControllerConnectionSoftDelete(txService, extractor);
    }

    softDeleteConnectionCont = async (req: Request<{ id: string }>, res: Response) => {
        const actorId = this.extractor.extractUserId(req, this.moduleName);
        const { id } = req.params;
        await this.txService.softDeleteConnectionService(actorId, id);
        return res.status(204).send();
    };
}
```

```ts
// src/modules/connection/controllers/controller.connection.restore.ts
import { Request, Response } from 'express';
import { TxServiceConnectionRestore } from '../transactional_services/tx_service.connection.restore';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export class ControllerConnectionRestore {
    private moduleName = 'ControllerConnectionRestore';

    constructor(
        private readonly txService: TxServiceConnectionRestore,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceConnectionRestore, extractor: UserIdExtractor) {
        return new ControllerConnectionRestore(txService, extractor);
    }

    restoreConnectionCont = async (req: Request<{ id: string }>, res: Response) => {
        const actorId = this.extractor.extractUserId(req, this.moduleName);
        const { id } = req.params;
        const connection = await this.txService.restoreConnectionService(actorId, id);
        return res.status(200).json({ connection });
    };
}
```

- [ ] **Step 4: Run test to verify it passes** (after Task 14 wires everything up — come back to this step)

---

## Task 14: Wire Container + App + Update User E2E Test

**Files:**
- Modify: `src/container.ts`
- Modify: `src/app.ts`
- Modify: `tests/modules/user/controllers/user.controllers.e2e.test.ts`
- Modify: `.env` (already done in Task 1 Step 6)

- [ ] **Step 1: Update `src/container.ts`**

Add these imports at the top (after existing imports):

```ts
import { InfraCryptoAesImplementation } from './modules/infra/encryption/infra.encryption_aes.implementation';
import { ConnectionDtoMapper } from './modules/connection/dto/connection.dto.mapper';
import { TxServiceConnectionCreate } from './modules/connection/transactional_services/tx_service.connection.create';
import { TxServiceConnectionListActive } from './modules/connection/transactional_services/tx_service.connection.list_active';
import { TxServiceConnectionListDeleted } from './modules/connection/transactional_services/tx_service.connection.list_deleted';
import { TxServiceConnectionUpdate } from './modules/connection/transactional_services/tx_service.connection.update';
import { TxServiceConnectionSoftDelete } from './modules/connection/transactional_services/tx_service.connection.soft_delete';
import { TxServiceConnectionRestore } from './modules/connection/transactional_services/tx_service.connection.restore';
import { ControllerConnectionCreate } from './modules/connection/controllers/controller.connection.create';
import { ControllerConnectionListActive } from './modules/connection/controllers/controller.connection.list_active';
import { ControllerConnectionListDeleted } from './modules/connection/controllers/controller.connection.list_deleted';
import { ControllerConnectionUpdate } from './modules/connection/controllers/controller.connection.update';
import { ControllerConnectionSoftDelete } from './modules/connection/controllers/controller.connection.soft_delete';
import { ControllerConnectionRestore } from './modules/connection/controllers/controller.connection.restore';
```

Inside `createDepsContainer()`, add after `const txManager = TransactionManager.create(pool);`:

```ts
const encryption = InfraCryptoAesImplementation.create(process.env.ENCRYPTION_KEY!);
const connectionDtoMapper = ConnectionDtoMapper.create();

const txConnectionCreate = TxServiceConnectionCreate.create(txManager, encryption, connectionDtoMapper);
const txConnectionListActive = TxServiceConnectionListActive.create(txManager, encryption, connectionDtoMapper);
const txConnectionListDeleted = TxServiceConnectionListDeleted.create(txManager, encryption, connectionDtoMapper);
const txConnectionUpdate = TxServiceConnectionUpdate.create(txManager, encryption, connectionDtoMapper);
const txConnectionSoftDelete = TxServiceConnectionSoftDelete.create(txManager, encryption);
const txConnectionRestore = TxServiceConnectionRestore.create(txManager, encryption, connectionDtoMapper);

const controllerConnectionCreate = ControllerConnectionCreate.create(txConnectionCreate, userIdExtractor);
const controllerConnectionListActive = ControllerConnectionListActive.create(txConnectionListActive, userIdExtractor);
const controllerConnectionListDeleted = ControllerConnectionListDeleted.create(txConnectionListDeleted, userIdExtractor);
const controllerConnectionUpdate = ControllerConnectionUpdate.create(txConnectionUpdate, userIdExtractor);
const controllerConnectionSoftDelete = ControllerConnectionSoftDelete.create(txConnectionSoftDelete, userIdExtractor);
const controllerConnectionRestore = ControllerConnectionRestore.create(txConnectionRestore, userIdExtractor);
```

Add to the `return` object at the end of `createDepsContainer()`:

```ts
controllerConnectionCreate,
controllerConnectionListActive,
controllerConnectionListDeleted,
controllerConnectionUpdate,
controllerConnectionSoftDelete,
controllerConnectionRestore,
```

- [ ] **Step 2: Update `src/app.ts`**

Add these imports (after existing user controller imports):

```ts
import { CreateConnectionBodySchema } from './modules/connection/controllers/controller.connection.create';
import { UpdateConnectionBodySchema } from './modules/connection/controllers/controller.connection.update';
```

Add these routes inside `createApp`, after the user routes and before `app.use(errorsMiddleware())`:

```ts
// connection routes
privateRouter.post('/connections', validateBody(CreateConnectionBodySchema), dependencies.controllerConnectionCreate.createConnectionCont);
privateRouter.get('/connections', dependencies.controllerConnectionListActive.listActiveConnectionsCont);
privateRouter.get('/connections/deleted', dependencies.controllerConnectionListDeleted.listDeletedConnectionsCont);
privateRouter.patch('/connections/:id', validateBody(UpdateConnectionBodySchema), dependencies.controllerConnectionUpdate.updateConnectionCont);
privateRouter.delete('/connections/:id', dependencies.controllerConnectionSoftDelete.softDeleteConnectionCont);
privateRouter.post('/connections/:id/restore', dependencies.controllerConnectionRestore.restoreConnectionCont);
```

- [ ] **Step 3: Update user e2e test to add connection controller noops**

In `tests/modules/user/controllers/user.controllers.e2e.test.ts`, inside the `buildContainer` function return object, add before `...overrides`:

```ts
controllerConnectionCreate: { createConnectionCont: jest.fn() } as any,
controllerConnectionListActive: { listActiveConnectionsCont: jest.fn() } as any,
controllerConnectionListDeleted: { listDeletedConnectionsCont: jest.fn() } as any,
controllerConnectionUpdate: { updateConnectionCont: jest.fn() } as any,
controllerConnectionSoftDelete: { softDeleteConnectionCont: jest.fn() } as any,
controllerConnectionRestore: { restoreConnectionCont: jest.fn() } as any,
```

- [ ] **Step 4: Run the connection e2e test**

```bash
npx jest tests/modules/connection/controllers/controller.connection.e2e.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Run the full test suite**

```bash
npm test -- --no-coverage
```

Expected: All tests pass (existing tests unbroken, new tests green)

- [ ] **Step 6: Run with coverage to verify 90% threshold**

```bash
npm test
```

Expected: Coverage ≥ 90% globally. If below threshold, add missing test cases to the nearest test file for the uncovered branch.

---

## Final Checklist

- [ ] All 6 connection routes registered on `privateRouter` in `app.ts`
- [ ] `ENCRYPTION_KEY` in `.env` is a valid 64-char hex string
- [ ] `createDepsContainer()` returns all 6 connection controllers
- [ ] `DepsContainer` type inferred correctly (no manual type needed — it's `ReturnType<typeof createDepsContainer>`)
- [ ] All existing tests still pass
- [ ] Coverage ≥ 90%
- [ ] Do NOT commit — hand off to user for review
