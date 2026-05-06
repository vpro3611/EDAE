# Weekly Reports (PDF) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automated and manual PDF reports summarizing GitHub activity (commits, PRs) delivered via Telegram, Slack (Bot Token), and Email.

**Architecture:** A new `report` module with a `ReportConfig` entity (per-user scheduling config), a `PdfService` using Puppeteer+Handlebars, a `GenerateReportService` orchestrating fetch→PDF→dispatch→DB update, and a BullMQ worker running hourly. Notification dispatcher gains a `dispatchFile` method; Slack credentials are extended to support Bot Tokens.

**Tech Stack:** Node.js, TypeScript, Puppeteer, Handlebars, @octokit/rest, Postgres, BullMQ.

---

### Task 1: Database Migration & ReportConfig Entity

**Files:**
- Create: `migrations/1778500000000_create-report-configurations-table.ts`
- Create: `src/modules/report/entity/report_config.ts`
- Create: `src/modules/report/entity/report_config.validator.ts`
- Create: `tests/modules/report/entity/report_config.test.ts`

- [ ] **Step 1: Write the failing entity tests**

```typescript
// tests/modules/report/entity/report_config.test.ts
import { ReportConfig } from '../../../../src/modules/report/entity/report_config';
import { AppError } from '../../../../src/modules/errors/errors.global';

function makeConfig(overrides: Partial<{
    id: string; user_id: string; connection_id: string;
    frequency: any; schedule_day: number; is_active: boolean;
    last_sent_at: Date | null;
}> = {}): ReportConfig {
    return ReportConfig.restore(
        overrides.id ?? 'cfg-id',
        overrides.user_id ?? 'user-id',
        overrides.connection_id ?? 'conn-id',
        overrides.frequency ?? 'weekly',
        overrides.schedule_day ?? 3,
        overrides.is_active ?? true,
        overrides.last_sent_at !== undefined ? overrides.last_sent_at : null,
        new Date('2026-01-01'),
        new Date('2026-01-01'),
    );
}

describe('ReportConfig entity', () => {
    describe('createForDatabase', () => {
        it('returns insert-ready object', () => {
            const data = ReportConfig.createForDatabase('uid', 'cid', 'weekly', 3);
            expect(data).toEqual({ user_id: 'uid', connection_id: 'cid', frequency: 'weekly', schedule_day: 3 });
        });
        it('throws 400 on invalid frequency', () => {
            expect(() => ReportConfig.createForDatabase('uid', 'cid', 'hourly' as any, 0)).toThrow(AppError);
        });
        it('throws 400 when schedule_day is out of range', () => {
            expect(() => ReportConfig.createForDatabase('uid', 'cid', 'weekly', 7)).toThrow(AppError);
        });
    });

    describe('ensureOwnership', () => {
        it('does not throw when actor matches', () => {
            expect(() => makeConfig({ user_id: 'actor' }).ensureOwnership('actor', 'op')).not.toThrow();
        });
        it('throws 403 when actor does not match', () => {
            expect(() => makeConfig({ user_id: 'owner' }).ensureOwnership('other', 'op')).toThrow(AppError);
        });
    });

    describe('isDue', () => {
        const NOW = new Date('2026-05-06T10:00:00Z'); // Wednesday, getDay() === 3

        it('returns true when last_sent_at is null', () => {
            expect(makeConfig({ last_sent_at: null }).isDue(NOW)).toBe(true);
        });
        it('returns true for daily config not sent in 25h', () => {
            const cfg = makeConfig({ frequency: 'daily', last_sent_at: new Date(NOW.getTime() - 25 * 3600 * 1000) });
            expect(cfg.isDue(NOW)).toBe(true);
        });
        it('returns false for daily config sent 23h ago', () => {
            const cfg = makeConfig({ frequency: 'daily', last_sent_at: new Date(NOW.getTime() - 23 * 3600 * 1000) });
            expect(cfg.isDue(NOW)).toBe(false);
        });
        it('returns true for weekly config sent 8 days ago on correct weekday', () => {
            const cfg = makeConfig({ frequency: 'weekly', schedule_day: 3, last_sent_at: new Date(NOW.getTime() - 8 * 86400 * 1000) });
            expect(cfg.isDue(NOW)).toBe(true);
        });
        it('returns false for weekly config on wrong weekday', () => {
            const MONDAY = new Date('2026-05-04T10:00:00Z');
            const cfg = makeConfig({ frequency: 'weekly', schedule_day: 3, last_sent_at: new Date(MONDAY.getTime() - 8 * 86400 * 1000) });
            expect(cfg.isDue(MONDAY)).toBe(false);
        });
        it('returns true for monthly config sent 31 days ago', () => {
            const cfg = makeConfig({ frequency: 'monthly', last_sent_at: new Date(NOW.getTime() - 31 * 86400 * 1000) });
            expect(cfg.isDue(NOW)).toBe(true);
        });
    });
});
```

- [ ] **Step 2: Run to verify tests fail**

Run: `npx jest tests/modules/report/entity/report_config.test.ts --no-coverage`
Expected: FAIL — `Cannot find module '../../../../src/modules/report/entity/report_config'`

- [ ] **Step 3: Create migration**

```typescript
// migrations/1778500000000_create-report-configurations-table.ts
import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('report_configurations', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
        connection_id: { type: 'uuid', notNull: true, references: 'connections(id)', onDelete: 'CASCADE' },
        frequency: { type: 'varchar(10)', notNull: true },
        schedule_day: { type: 'smallint', notNull: true, default: 0 },
        is_active: { type: 'boolean', notNull: true, default: true },
        last_sent_at: { type: 'timestamptz' },
        created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    });
    pgm.sql('CREATE INDEX idx_report_configs_user_id ON report_configurations (user_id);');
    pgm.sql('CREATE INDEX idx_report_configs_active ON report_configurations (is_active) WHERE is_active = true;');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropIndex('report_configurations', 'idx_report_configs_user_id');
    pgm.dropIndex('report_configurations', 'idx_report_configs_active');
    pgm.dropTable('report_configurations');
}
```

- [ ] **Step 4: Run migration**

Run: `npm run migrate up`
Expected: migration applied successfully

- [ ] **Step 5: Implement entity and validator**

`src/modules/report/entity/report_config.validator.ts` — validates `frequency` is one of `['daily','weekly','monthly']` and `schedule_day` is `0–6`; throws `AppError` 400 on violation.

`src/modules/report/entity/report_config.ts` — follows the `Connection` entity pattern:
- Export type `ReportFrequency = 'daily' | 'weekly' | 'monthly'`
- `static createForDatabase(userId, connectionId, frequency, scheduleDay)` — calls validator, returns plain object
- `static restore(id, user_id, connection_id, frequency, schedule_day, is_active, last_sent_at, created_at, updated_at)` — calls validator, returns instance
- `ensureOwnership(actorId, op)` — throws 403 if mismatch
- `ensureActive(op)` — throws 400 if `!is_active`
- `isDue(now: Date): boolean` — returns `true` when `last_sent_at` is null; for `daily` checks ≥ 24 h elapsed; for `weekly` checks ≥ 7 days AND `now.getDay() === schedule_day`; for `monthly` checks ≥ 30 days

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest tests/modules/report/entity/report_config.test.ts --no-coverage`
Expected: PASS

---

### Task 2: Repository, DTO & Mapper

**Files:**
- Create: `src/modules/report/interfaces/interface.repository.ts`
- Create: `src/modules/report/repository/repository.report_config.reader.ts`
- Create: `src/modules/report/repository/repository.report_config.writer.ts`
- Create: `src/modules/report/dto/report_config.dto.ts`
- Create: `src/modules/report/dto/report_config.dto.mapper.ts`
- Create: `tests/modules/report/repository/repository.report_config.test.ts`
- Create: `tests/modules/report/dto/report_config.dto.mapper.test.ts`

- [ ] **Step 1: Write failing DTO mapper tests**

```typescript
// tests/modules/report/dto/report_config.dto.mapper.test.ts
import { ReportConfig } from '../../../../src/modules/report/entity/report_config';
import { ReportConfigDtoMapper } from '../../../../src/modules/report/dto/report_config.dto.mapper';

describe('ReportConfigDtoMapper', () => {
    const mapper = ReportConfigDtoMapper.create();
    const NOW = new Date('2026-05-06T10:00:00Z');

    it('maps a config with last_sent_at to DTO', () => {
        const sent = new Date('2026-04-29T10:00:00Z');
        const config = ReportConfig.restore('id', 'uid', 'cid', 'weekly', 3, true, sent, NOW, NOW);
        const dto = mapper.mapToDto(config);
        expect(dto.id).toBe('id');
        expect(dto.last_sent_at).toBe(sent.toISOString());
    });

    it('maps null last_sent_at correctly', () => {
        const config = ReportConfig.restore('id', 'uid', 'cid', 'daily', 0, true, null, NOW, NOW);
        expect(mapper.mapToDto(config).last_sent_at).toBeNull();
    });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx jest tests/modules/report/dto/report_config.dto.mapper.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Define repository interfaces**

```typescript
// src/modules/report/interfaces/interface.repository.ts
import { ReportConfig, ReportFrequency } from '../entity/report_config';

export interface ReportConfigRepoReaderInterface {
    getConfigById(id: string): Promise<ReportConfig | null>;
    getActiveConfigsByUserId(userId: string): Promise<ReportConfig[]>;
    getAllActiveConfigs(): Promise<ReportConfig[]>;
}

export interface ReportConfigRepoWriterInterface {
    createConfig(data: {
        user_id: string;
        connection_id: string;
        frequency: ReportFrequency;
        schedule_day: number;
    }): Promise<ReportConfig>;
    deleteConfig(id: string): Promise<void>;
    updateLastSentAt(id: string, sentAt: Date): Promise<void>;
}
```

- [ ] **Step 4: Implement reader, writer, DTO type and mapper**

`repository.report_config.reader.ts` — follows `RepositoryConnectionReader` pattern; does NOT need encryption; implements `getConfigById`, `getActiveConfigsByUserId` (`WHERE user_id=$1 AND is_active=true`), `getAllActiveConfigs` (`WHERE is_active=true`).

`repository.report_config.writer.ts` — implements `createConfig` (INSERT RETURNING *), `deleteConfig` (DELETE), `updateLastSentAt` (UPDATE … SET last_sent_at=$1, updated_at=now()).

`report_config.dto.ts` — plain type with string ISO dates; `last_sent_at: string | null`.

`report_config.dto.mapper.ts` — `static create()` + `mapToDto(config): ReportConfigDto`.

- [ ] **Step 5: Run DTO mapper tests to verify pass**

Run: `npx jest tests/modules/report/dto/report_config.dto.mapper.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Write and run repository integration tests**

```typescript
// tests/modules/report/repository/repository.report_config.test.ts
import { pool } from '../../../../src/database';
import { RepositoryReportConfigReader } from '../../../../src/modules/report/repository/repository.report_config.reader';
import { RepositoryReportConfigWriter } from '../../../../src/modules/report/repository/repository.report_config.writer';

describe('RepositoryReportConfig integration', () => {
    let USER_ID: string;
    let CONN_ID: string;
    let configId: string;

    beforeAll(async () => {
        const u = await pool.query(
            `INSERT INTO users (name,email,password_hashed,last_password)
             VALUES ('R','rrepo@test.com','h','h') RETURNING id`,
        );
        USER_ID = u.rows[0].id;
        const c = await pool.query(
            `INSERT INTO connections (user_id,provider,name,credentials)
             VALUES ($1,'email','E','{"e":"x"}') RETURNING id`,
            [USER_ID],
        );
        CONN_ID = c.rows[0].id;
    });

    afterAll(async () => {
        await pool.query('DELETE FROM report_configurations WHERE user_id=$1', [USER_ID]);
        await pool.query('DELETE FROM connections WHERE id=$1', [CONN_ID]);
        await pool.query('DELETE FROM users WHERE id=$1', [USER_ID]);
        await pool.end();
    });

    it('creates and reads a config', async () => {
        const writer = RepositoryReportConfigWriter.create(pool);
        const cfg = await writer.createConfig({ user_id: USER_ID, connection_id: CONN_ID, frequency: 'weekly', schedule_day: 3 });
        configId = cfg.id;
        expect(cfg.frequency).toBe('weekly');
        expect(cfg.is_active).toBe(true);
        expect(cfg.last_sent_at).toBeNull();
    });

    it('reads by id', async () => {
        const reader = RepositoryReportConfigReader.create(pool);
        const found = await reader.getConfigById(configId);
        expect(found?.id).toBe(configId);
    });

    it('reads active configs by userId', async () => {
        const reader = RepositoryReportConfigReader.create(pool);
        const list = await reader.getActiveConfigsByUserId(USER_ID);
        expect(list.some(c => c.id === configId)).toBe(true);
    });

    it('updates last_sent_at', async () => {
        const sentAt = new Date();
        await RepositoryReportConfigWriter.create(pool).updateLastSentAt(configId, sentAt);
        const cfg = await RepositoryReportConfigReader.create(pool).getConfigById(configId);
        expect(cfg?.last_sent_at?.getTime()).toBeCloseTo(sentAt.getTime(), -3);
    });

    it('deletes a config', async () => {
        await RepositoryReportConfigWriter.create(pool).deleteConfig(configId);
        const cfg = await RepositoryReportConfigReader.create(pool).getConfigById(configId);
        expect(cfg).toBeNull();
    });
});
```

Run: `npx jest tests/modules/report/repository/repository.report_config.test.ts --no-coverage`
Expected: PASS (requires live TEST_DATABASE_URL)

---

### Task 3: ReportConfig CRUD Use Cases & Transactional Services

**Files:**
- Create: `src/modules/report/usecases/report_config.create.usecase.ts`
- Create: `src/modules/report/usecases/report_config.list.usecase.ts`
- Create: `src/modules/report/usecases/report_config.delete.usecase.ts`
- Create: `src/modules/report/transactional_services/tx_service.report_config.create.ts`
- Create: `src/modules/report/transactional_services/tx_service.report_config.list.ts`
- Create: `src/modules/report/transactional_services/tx_service.report_config.delete.ts`
- Create: `tests/modules/report/usecases/report_config.create.usecase.test.ts`
- Create: `tests/modules/report/usecases/report_config.list.usecase.test.ts`
- Create: `tests/modules/report/usecases/report_config.delete.usecase.test.ts`
- Create: `tests/modules/report/transactional_services/tx_service.report_config.create.test.ts`

- [ ] **Step 1: Write failing use case tests**

```typescript
// tests/modules/report/usecases/report_config.create.usecase.test.ts
import { ReportConfigCreateUseCase } from '../../../../src/modules/report/usecases/report_config.create.usecase';
import { ReportConfigRepoWriterInterface } from '../../../../src/modules/report/interfaces/interface.repository';
import { ConnectionRepoReaderInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { ReportConfigDtoMapper } from '../../../../src/modules/report/dto/report_config.dto.mapper';
import { ReportConfig } from '../../../../src/modules/report/entity/report_config';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { AppError } from '../../../../src/modules/errors/errors.global';

function makeConfig() {
    return ReportConfig.restore('cfg-id','user-id','conn-id','weekly',3,true,null,new Date(),new Date());
}
function makeConn(userId = 'user-id', isDeleted = false) {
    return Connection.restore('conn-id',userId,'email','E',{provider:'email',address:'a@b.com'},new Date(),new Date(),isDeleted);
}

describe('ReportConfigCreateUseCase', () => {
    let writer: jest.Mocked<ReportConfigRepoWriterInterface>;
    let connReader: jest.Mocked<ConnectionRepoReaderInterface>;
    let useCase: ReportConfigCreateUseCase;

    beforeEach(() => {
        writer = { createConfig: jest.fn(), deleteConfig: jest.fn(), updateLastSentAt: jest.fn() };
        connReader = { getConnectionById: jest.fn(), getActiveConnectionsByUserId: jest.fn(), getDeletedConnectionsByUserId: jest.fn() };
        useCase = ReportConfigCreateUseCase.create(writer, connReader, ReportConfigDtoMapper.create());
    });

    it('creates and returns DTO', async () => {
        connReader.getConnectionById.mockResolvedValue(makeConn());
        writer.createConfig.mockResolvedValue(makeConfig());
        const dto = await useCase.execute('user-id','conn-id','weekly',3);
        expect(dto.id).toBe('cfg-id');
        expect(writer.createConfig).toHaveBeenCalledWith({ user_id:'user-id', connection_id:'conn-id', frequency:'weekly', schedule_day:3 });
    });

    it('throws 404 when connection not found', async () => {
        connReader.getConnectionById.mockResolvedValue(null);
        await expect(useCase.execute('user-id','conn-id','daily',0)).rejects.toThrow(AppError);
    });

    it('throws 403 when connection owned by different user', async () => {
        connReader.getConnectionById.mockResolvedValue(makeConn('other'));
        await expect(useCase.execute('user-id','conn-id','daily',0)).rejects.toThrow(AppError);
    });

    it('throws 400 when connection is deleted', async () => {
        connReader.getConnectionById.mockResolvedValue(makeConn('user-id', true));
        await expect(useCase.execute('user-id','conn-id','daily',0)).rejects.toThrow(AppError);
    });
});
```

```typescript
// tests/modules/report/usecases/report_config.list.usecase.test.ts
import { ReportConfigListUseCase } from '../../../../src/modules/report/usecases/report_config.list.usecase';
import { ReportConfigRepoReaderInterface } from '../../../../src/modules/report/interfaces/interface.repository';
import { ReportConfigDtoMapper } from '../../../../src/modules/report/dto/report_config.dto.mapper';
import { ReportConfig } from '../../../../src/modules/report/entity/report_config';

describe('ReportConfigListUseCase', () => {
    let reader: jest.Mocked<ReportConfigRepoReaderInterface>;
    let useCase: ReportConfigListUseCase;

    beforeEach(() => {
        reader = { getConfigById: jest.fn(), getActiveConfigsByUserId: jest.fn(), getAllActiveConfigs: jest.fn() };
        useCase = ReportConfigListUseCase.create(reader, ReportConfigDtoMapper.create());
    });

    it('returns mapped DTOs', async () => {
        reader.getActiveConfigsByUserId.mockResolvedValue([
            ReportConfig.restore('id','uid','cid','weekly',3,true,null,new Date(),new Date()),
        ]);
        const dtos = await useCase.execute('uid');
        expect(dtos).toHaveLength(1);
        expect(dtos[0].id).toBe('id');
    });

    it('returns empty array when none exist', async () => {
        reader.getActiveConfigsByUserId.mockResolvedValue([]);
        expect(await useCase.execute('uid')).toEqual([]);
    });
});
```

```typescript
// tests/modules/report/usecases/report_config.delete.usecase.test.ts
import { ReportConfigDeleteUseCase } from '../../../../src/modules/report/usecases/report_config.delete.usecase';
import { ReportConfigRepoReaderInterface, ReportConfigRepoWriterInterface } from '../../../../src/modules/report/interfaces/interface.repository';
import { ReportConfig } from '../../../../src/modules/report/entity/report_config';
import { AppError } from '../../../../src/modules/errors/errors.global';

describe('ReportConfigDeleteUseCase', () => {
    let reader: jest.Mocked<ReportConfigRepoReaderInterface>;
    let writer: jest.Mocked<ReportConfigRepoWriterInterface>;
    let useCase: ReportConfigDeleteUseCase;

    beforeEach(() => {
        reader = { getConfigById: jest.fn(), getActiveConfigsByUserId: jest.fn(), getAllActiveConfigs: jest.fn() };
        writer = { createConfig: jest.fn(), deleteConfig: jest.fn(), updateLastSentAt: jest.fn() };
        useCase = ReportConfigDeleteUseCase.create(reader, writer);
    });

    it('deletes when actor owns config', async () => {
        reader.getConfigById.mockResolvedValue(
            ReportConfig.restore('cfg','user','conn','weekly',3,true,null,new Date(),new Date()),
        );
        await useCase.execute('user','cfg');
        expect(writer.deleteConfig).toHaveBeenCalledWith('cfg');
    });

    it('throws 404 when not found', async () => {
        reader.getConfigById.mockResolvedValue(null);
        await expect(useCase.execute('user','cfg')).rejects.toThrow(AppError);
    });

    it('throws 403 when actor does not own config', async () => {
        reader.getConfigById.mockResolvedValue(
            ReportConfig.restore('cfg','owner','conn','weekly',3,true,null,new Date(),new Date()),
        );
        await expect(useCase.execute('other','cfg')).rejects.toThrow(AppError);
    });
});
```

- [ ] **Step 2: Run to verify tests fail**

Run: `npx jest tests/modules/report/usecases --no-coverage`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement use cases**

`report_config.create.usecase.ts` — validates connection exists, owned by actor, not deleted via `ConnectionRepoReaderInterface`; calls `ReportConfig.createForDatabase`; persists via writer; returns DTO via mapper.

`report_config.list.usecase.ts` — calls `getActiveConfigsByUserId`; maps to DTOs.

`report_config.delete.usecase.ts` — reads config, calls `ensureOwnership`, then `deleteConfig`.

- [ ] **Step 4: Run use case tests to verify pass**

Run: `npx jest tests/modules/report/usecases --no-coverage`
Expected: PASS

- [ ] **Step 5: Write failing TxService test**

```typescript
// tests/modules/report/transactional_services/tx_service.report_config.create.test.ts
import { TxServiceReportConfigCreate } from '../../../../src/modules/report/transactional_services/tx_service.report_config.create';
import { TransactionManagerInterface } from '../../../../src/modules/infra/transaction_manager/transaction_manager.interface';
import { ReportConfigDtoMapper } from '../../../../src/modules/report/dto/report_config.dto.mapper';
import { RepositoryReportConfigWriter } from '../../../../src/modules/report/repository/repository.report_config.writer';
import { RepositoryConnectionReader } from '../../../../src/modules/connection/repository/repository.connection.reader';
import { ReportConfigCreateUseCase } from '../../../../src/modules/report/usecases/report_config.create.usecase';

jest.mock('../../../../src/modules/report/repository/repository.report_config.writer');
jest.mock('../../../../src/modules/connection/repository/repository.connection.reader');
jest.mock('../../../../src/modules/report/usecases/report_config.create.usecase');

describe('TxServiceReportConfigCreate', () => {
    let txManager: jest.Mocked<TransactionManagerInterface>;
    let service: TxServiceReportConfigCreate;
    const mockEncryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any;

    beforeEach(() => {
        txManager = { runInTransaction: jest.fn().mockImplementation(async cb => cb({} as any)) };
        service = TxServiceReportConfigCreate.create(txManager, mockEncryption, ReportConfigDtoMapper.create());
    });

    it('runs inside a transaction and returns DTO', async () => {
        const mockDto = { id: 'cfg-id' } as any;
        const executeMock = jest.fn().mockResolvedValue(mockDto);
        (ReportConfigCreateUseCase.create as jest.Mock).mockReturnValue({ execute: executeMock });

        const result = await service.createReportConfigService('user-id','conn-id','weekly',3);

        expect(result).toBe(mockDto);
        expect(txManager.runInTransaction).toHaveBeenCalled();
        expect(executeMock).toHaveBeenCalledWith('user-id','conn-id','weekly',3);
    });
});
```

- [ ] **Step 6: Run to verify fail**

Run: `npx jest tests/modules/report/transactional_services --no-coverage`
Expected: FAIL

- [ ] **Step 7: Implement transactional services**

`tx_service.report_config.create.ts` — constructor takes `(txManager, encryption, mapper)`; `createReportConfigService(userId, connectionId, frequency, scheduleDay)` runs in transaction, creates `RepositoryReportConfigWriter.create(client)` and `RepositoryConnectionReader.create(client, encryption)`, delegates to `ReportConfigCreateUseCase`.

`tx_service.report_config.list.ts` — constructor takes `(txManager, mapper)`; `listReportConfigsService(userId)` creates reader, delegates to `ReportConfigListUseCase`.

`tx_service.report_config.delete.ts` — constructor takes `(txManager)`; `deleteReportConfigService(userId, configId)` creates reader+writer, delegates to `ReportConfigDeleteUseCase`.

- [ ] **Step 8: Run TxService tests to verify pass**

Run: `npx jest tests/modules/report/transactional_services --no-coverage`
Expected: PASS

---

### Task 4: PDF Service (Puppeteer & Handlebars)

**Files:**
- Create: `src/modules/report/pdf/pdf.service.ts`
- Create: `src/modules/report/pdf/templates/report.hbs`
- Create: `tests/modules/report/pdf/pdf.service.test.ts`

- [ ] **Step 1: Install Puppeteer and Handlebars**

Run: `npm install puppeteer handlebars`

- [ ] **Step 2: Write failing test for PDF generation**

```typescript
// tests/modules/report/pdf/pdf.service.test.ts
import { PdfService, ReportTemplateData } from '../../../../src/modules/report/pdf/pdf.service';

jest.mock('puppeteer', () => ({
    launch: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
            setContent: jest.fn().mockResolvedValue(undefined),
            pdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-mock')),
        }),
        close: jest.fn().mockResolvedValue(undefined),
    }),
}));

const SAMPLE: ReportTemplateData = {
    periodStart: '2026-04-29',
    periodEnd: '2026-05-06',
    totalCommits: 3,
    totalPRs: 1,
    repoCount: 1,
    repos: [{
        owner: 'alice',
        name: 'app',
        commits: [{ sha: 'abc1234', message: 'feat: add login', author: 'Alice', date: '2026-05-01' }],
        pullRequests: [{ number: 7, title: 'Add auth', state: 'open', created_at: '2026-04-30' }],
    }],
};

describe('PdfService', () => {
    it('returns a Buffer', async () => {
        const result = await PdfService.create().generatePdf(SAMPLE);
        expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('launches puppeteer with --no-sandbox', async () => {
        const puppeteer = require('puppeteer');
        await PdfService.create().generatePdf(SAMPLE);
        expect(puppeteer.launch).toHaveBeenCalledWith(
            expect.objectContaining({ args: expect.arrayContaining(['--no-sandbox']) }),
        );
    });

    it('closes the browser after generation', async () => {
        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch();
        await PdfService.create().generatePdf(SAMPLE);
        expect(browser.close).toHaveBeenCalled();
    });
});
```

- [ ] **Step 3: Run to verify fail**

Run: `npx jest tests/modules/report/pdf/pdf.service.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 4: Create Handlebars template**

`src/modules/report/pdf/templates/report.hbs` — HTML with inline CSS; renders `periodStart`, `periodEnd`, `totalCommits`, `totalPRs`, `repoCount`; then `{{#each repos}}` block showing repo owner/name, commits list (sha, message, author, date), PRs list (number, title, state, created_at); uses `{{#if this.commits.length}}` guards to show "No items" message when empty.

- [ ] **Step 5: Implement PdfService**

`src/modules/report/pdf/pdf.service.ts`:
- Export `ReportTemplateData` type (periodStart, periodEnd, totalCommits, totalPRs, repoCount, repos array with commits + pullRequests arrays)
- `static create()` factory
- `generatePdf(data: ReportTemplateData): Promise<Buffer>` — reads `.hbs` file with `fs.readFileSync`, compiles with `Handlebars.compile`, passes `data` to template, launches puppeteer with `{ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] }`, calls `page.setContent(html, { waitUntil: 'networkidle0' })`, calls `page.pdf({ format: 'A4', printBackground: true })`, returns `Buffer.from(pdf)`, closes browser in `finally`

- [ ] **Step 6: Run tests to verify pass**

Run: `npx jest tests/modules/report/pdf/pdf.service.test.ts --no-coverage`
Expected: PASS

---

### Task 5: GitHub Activity Data Retrieval

**Files:**
- Create: `src/modules/report/usecases/fetch_github_activity.usecase.ts`
- Create: `tests/modules/report/usecases/fetch_github_activity.usecase.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/modules/report/usecases/fetch_github_activity.usecase.test.ts
import { FetchGithubActivityUseCase } from '../../../../src/modules/report/usecases/fetch_github_activity.usecase';
import { GithubSourceRepoReaderInterface } from '../../../../src/modules/github_source/interfaces/interface.repository';
import { GithubSource } from '../../../../src/modules/github_source/entity/github_source';

jest.mock('@octokit/rest', () => ({
    Octokit: jest.fn().mockImplementation(() => ({
        repos: {
            listCommits: jest.fn().mockResolvedValue({
                data: [{ sha: 'abc1234567', commit: { message: 'feat: add feature\nbody', author: { name: 'Alice', date: '2026-05-01T10:00:00Z' } } }],
            }),
        },
        pulls: {
            list: jest.fn().mockResolvedValue({
                data: [{ number: 42, title: 'Add auth', state: 'open', created_at: '2026-05-02T10:00:00Z' }],
            }),
        },
    })),
}));

function makeSource() {
    return GithubSource.restore('src-id','user-id','alice','my-app','token123',new Date(),new Date());
}

describe('FetchGithubActivityUseCase', () => {
    let sourceReader: jest.Mocked<GithubSourceRepoReaderInterface>;
    let useCase: FetchGithubActivityUseCase;

    beforeEach(() => {
        sourceReader = { getSourceById: jest.fn(), getSourcesByUserId: jest.fn() };
        useCase = FetchGithubActivityUseCase.create(sourceReader);
    });

    it('fetches commits and PRs for all user sources', async () => {
        sourceReader.getSourcesByUserId.mockResolvedValue([makeSource()]);
        const results = await useCase.execute('user-id', new Date('2026-04-29'));
        expect(results).toHaveLength(1);
        expect(results[0].commits[0].sha).toBe('abc1234');
        expect(results[0].commits[0].message).toBe('feat: add feature');
        expect(results[0].pullRequests[0].number).toBe(42);
    });

    it('returns empty array when user has no sources', async () => {
        sourceReader.getSourcesByUserId.mockResolvedValue([]);
        expect(await useCase.execute('user-id', new Date())).toEqual([]);
    });

    it('filters out PRs created before since date', async () => {
        sourceReader.getSourcesByUserId.mockResolvedValue([makeSource()]);
        const futureDate = new Date('2026-05-03T00:00:00Z'); // after PR created_at
        const results = await useCase.execute('user-id', futureDate);
        expect(results[0].pullRequests).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx jest tests/modules/report/usecases/fetch_github_activity.usecase.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement FetchGithubActivityUseCase**

`src/modules/report/usecases/fetch_github_activity.usecase.ts`:

Export types:
```typescript
export type CommitActivity = { sha: string; message: string; author: string; date: string };
export type PullRequestActivity = { number: number; title: string; state: string; created_at: string };
export type RepoActivity = { source: GithubSource; commits: CommitActivity[]; pullRequests: PullRequestActivity[] };
```

`static create(sourceReader)` factory.

`execute(userId, since)`:
1. `const sources = await this.sourceReader.getSourcesByUserId(userId)`
2. `return Promise.all(sources.map(s => this.fetchSource(s, since)))`

`private fetchSource(source, since)`:
- Creates `new Octokit({ auth: source.access_token ?? undefined })`
- Calls `octokit.repos.listCommits({ owner, repo, since: since.toISOString(), per_page: 100 })` and `octokit.pulls.list({ owner, repo, state: 'all', sort: 'created', direction: 'desc', per_page: 50 })` in `Promise.allSettled`
- Maps commits: sha sliced to 7 chars, first line of message, author name, date
- Filters PRs by `created_at >= since`, maps to `PullRequestActivity`
- Returns `{ source, commits, pullRequests }`

- [ ] **Step 4: Run tests to verify pass**

Run: `npx jest tests/modules/report/usecases/fetch_github_activity.usecase.test.ts --no-coverage`
Expected: PASS

---

### Task 6: Notification Upgrades (Slack Bot Token & File Dispatch)

**Files:**
- Modify: `src/modules/connection/connection.credentials.ts`
- Modify: `src/modules/connection/entity/connection.validator.ts`
- Modify: `src/modules/connection/controllers/controller.connection.create.ts`
- Modify: `src/modules/connection/controllers/controller.connection.update.ts`
- Modify: `src/modules/infra/email/infra.email_sender.interface.ts`
- Modify: `src/modules/infra/email/infra.email_nodemailer.implementation.ts`
- Modify: `src/modules/notification/notification.dispatcher.ts`
- Create: `tests/modules/notification/notification.dispatcher.test.ts`

- [ ] **Step 1: Update SlackCredentials type**

In `connection.credentials.ts`, change `SlackCredentials` to make `webhook_url` optional and add optional `bot_token` and `channel_id`:

```typescript
export type SlackCredentials = {
    provider: 'slack';
    webhook_url?: string;
    bot_token?: string;
    channel_id?: string;
};
```

- [ ] **Step 2: Update ConnectionValidator for new Slack fields**

In `connection.validator.ts`, replace the `'slack'` case so it validates that at least one of (a valid `webhook_url`) or (`bot_token` + `channel_id`) is present:

```typescript
case 'slack': {
    const hasWebhook = !!creds.webhook_url?.trim() && this.urlPattern.test(creds.webhook_url!);
    const hasBotToken = !!creds.bot_token?.trim() && !!creds.channel_id?.trim();
    if (!hasWebhook && !hasBotToken) {
        throwAppError(
            'Slack credentials must include a valid webhook_url or both bot_token and channel_id.',
            400,
            `${this.moduleName}.validateCredentials`,
        );
    }
    break;
}
```

- [ ] **Step 3: Update Slack Zod schemas in connection controllers**

In both `controller.connection.create.ts` and `controller.connection.update.ts`, replace the Slack discriminated union member:

```typescript
z.object({
    provider: z.literal('slack'),
    webhook_url: z.string().url().optional(),
    bot_token: z.string().min(1).optional(),
    channel_id: z.string().min(1).optional(),
}).refine(
    d => d.webhook_url || (d.bot_token && d.channel_id),
    { message: 'Must provide webhook_url or both bot_token and channel_id.' },
),
```

- [ ] **Step 4: Run existing connection tests to verify they still pass**

Run: `npx jest tests/modules/connection --no-coverage`
Expected: PASS (existing tests unaffected by optional fields)

- [ ] **Step 5: Add sendNotificationWithAttachment to email interface and implementation**

In `infra.email_sender.interface.ts`, add:
```typescript
sendNotificationWithAttachment(to: string, subject: string, body: string, attachment: Buffer, filename: string): Promise<void>;
```

In `infra.email_nodemailer.implementation.ts`, implement it:
```typescript
async sendNotificationWithAttachment(to, subject, body, attachment, filename): Promise<void> {
    await this.transporter.sendMail({
        from: this.user, to, subject, text: body,
        attachments: [{ filename, content: attachment }],
    });
}
```

- [ ] **Step 6: Write failing dispatcher test**

```typescript
// tests/modules/notification/notification.dispatcher.test.ts
import { NotificationDispatcher } from '../../../../src/modules/notification/notification.dispatcher';
import { InfraEmailSenderInterface } from '../../../../src/modules/infra/email/infra.email_sender.interface';
import { ConnectionCredentials } from '../../../../src/modules/connection/connection.credentials';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('NotificationDispatcher.dispatchFile', () => {
    let emailSender: jest.Mocked<InfraEmailSenderInterface>;
    let dispatcher: NotificationDispatcher;
    const PDF = Buffer.from('%PDF-mock');

    beforeEach(() => {
        mockFetch.mockReset();
        emailSender = {
            sendRegistrationOtp: jest.fn(),
            sendPasswordResetOtp: jest.fn(),
            sendEmailChangeOtp: jest.fn(),
            sendAccountDeletionOtp: jest.fn(),
            sendNotification: jest.fn(),
            sendNotificationWithAttachment: jest.fn(),
        };
        dispatcher = NotificationDispatcher.create(emailSender);
    });

    it('sends email attachment', async () => {
        const creds: ConnectionCredentials = { provider: 'email', address: 'user@test.com' };
        await dispatcher.dispatchFile(creds, PDF, 'report.pdf', 'Weekly report');
        expect(emailSender.sendNotificationWithAttachment).toHaveBeenCalledWith(
            'user@test.com', 'EDAE Report', 'Weekly report', PDF, 'report.pdf',
        );
    });

    it('sends telegram document', async () => {
        mockFetch.mockResolvedValue({ ok: true });
        const creds: ConnectionCredentials = { provider: 'telegram', bot_token: 'tok', chat_id: '123' };
        await dispatcher.dispatchFile(creds, PDF, 'report.pdf', 'caption');
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/sendDocument'),
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('throws when Slack has no bot_token for file dispatch', async () => {
        const creds: ConnectionCredentials = { provider: 'slack', webhook_url: 'https://hooks.slack.com/x' };
        await expect(dispatcher.dispatchFile(creds, PDF, 'report.pdf', 'caption')).rejects.toThrow(
            'Slack Bot Token not configured',
        );
    });

    it('sends slack file via files.uploadV2 flow', async () => {
        mockFetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, upload_url: 'https://upload.slack.com/x', file_id: 'F1' }) })
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
        const creds: ConnectionCredentials = { provider: 'slack', bot_token: 'xoxb-tok', channel_id: 'C123' };
        await dispatcher.dispatchFile(creds, PDF, 'report.pdf', 'caption');
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://slack.com/api/files.getUploadURLExternal', expect.anything());
        expect(mockFetch).toHaveBeenNthCalledWith(3, 'https://slack.com/api/files.completeUploadExternal', expect.anything());
    });
});
```

- [ ] **Step 7: Run to verify fail**

Run: `npx jest tests/modules/notification/notification.dispatcher.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 8: Implement dispatchFile in NotificationDispatcher**

Add `dispatchFile(credentials, buffer, filename, caption): Promise<void>` method:

- `'telegram'` — `POST https://api.telegram.org/bot{bot_token}/sendDocument` with `FormData` (chat_id, caption, document as Blob with filename); throw on `!res.ok`
- `'slack'` — throw `'Slack Bot Token not configured for file dispatch'` if no `bot_token`/`channel_id`; otherwise implement the three-step `files.uploadV2` flow:
  1. `POST files.getUploadURLExternal` with JSON `{ filename, length: buffer.length }`; parse `{ upload_url, file_id }`
  2. `POST upload_url` with `application/octet-stream` body
  3. `POST files.completeUploadExternal` with JSON `{ files: [{ id: file_id }], channel_id }`; all requests use `Authorization: Bearer {bot_token}`
- `'email'` — calls `this.emailSender.sendNotificationWithAttachment(address, 'EDAE Report', caption, buffer, filename)`

Also update `sendSlack` (text dispatch) to support both `webhook_url` (existing) and `bot_token`+`channel_id` via `chat.postMessage`.

- [ ] **Step 9: Run dispatcher tests to verify pass**

Run: `npx jest tests/modules/notification/notification.dispatcher.test.ts --no-coverage`
Expected: PASS

---

### Task 7: Report Orchestration, Worker & API Endpoint

**Files:**
- Create: `src/modules/report/generate_report.service.ts`
- Create: `src/workers/report.worker.ts`
- Create: `src/modules/report/controllers/controller.report_config.create.ts`
- Create: `src/modules/report/controllers/controller.report_config.list.ts`
- Create: `src/modules/report/controllers/controller.report_config.delete.ts`
- Create: `src/modules/report/controllers/controller.report.generate.ts`
- Create: `tests/modules/report/generate_report.service.test.ts`
- Create: `tests/modules/report/controllers/controller.report.e2e.test.ts`
- Modify: `src/workers/worker.bootstrap.ts`
- Modify: `src/container.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Write failing GenerateReportService tests**

```typescript
// tests/modules/report/generate_report.service.test.ts
import { GenerateReportService } from '../../../../src/modules/report/generate_report.service';
import { ReportConfigRepoReaderInterface, ReportConfigRepoWriterInterface } from '../../../../src/modules/report/interfaces/interface.repository';
import { ConnectionRepoReaderInterface } from '../../../../src/modules/connection/interfaces/interface.repository';
import { FetchGithubActivityUseCase } from '../../../../src/modules/report/usecases/fetch_github_activity.usecase';
import { PdfService } from '../../../../src/modules/report/pdf/pdf.service';
import { NotificationDispatcher } from '../../../../src/modules/notification/notification.dispatcher';
import { ReportConfig } from '../../../../src/modules/report/entity/report_config';
import { Connection } from '../../../../src/modules/connection/entity/connection';
import { AppError } from '../../../../src/modules/errors/errors.global';

function makeCfg(userId = 'user-id', active = true) {
    return ReportConfig.restore('cfg-id',userId,'conn-id','weekly',3,active,null,new Date(),new Date());
}
function makeConn() {
    return Connection.restore('conn-id','user-id','email','E',{provider:'email',address:'u@t.com'},new Date(),new Date(),false);
}

describe('GenerateReportService', () => {
    let configReader: jest.Mocked<ReportConfigRepoReaderInterface>;
    let configWriter: jest.Mocked<ReportConfigRepoWriterInterface>;
    let connReader: jest.Mocked<ConnectionRepoReaderInterface>;
    let fetchActivity: jest.Mocked<FetchGithubActivityUseCase>;
    let pdfService: jest.Mocked<PdfService>;
    let dispatcher: jest.Mocked<NotificationDispatcher>;
    let service: GenerateReportService;

    beforeEach(() => {
        configReader = { getConfigById: jest.fn(), getActiveConfigsByUserId: jest.fn(), getAllActiveConfigs: jest.fn() };
        configWriter = { createConfig: jest.fn(), deleteConfig: jest.fn(), updateLastSentAt: jest.fn() };
        connReader = { getConnectionById: jest.fn(), getActiveConnectionsByUserId: jest.fn(), getDeletedConnectionsByUserId: jest.fn() };
        fetchActivity = { execute: jest.fn() } as any;
        pdfService = { generatePdf: jest.fn() } as any;
        dispatcher = { dispatch: jest.fn(), dispatchFile: jest.fn() } as any;
        service = GenerateReportService.create(configReader, configWriter, connReader, fetchActivity, pdfService, dispatcher);
    });

    it('generates and dispatches a report then updates last_sent_at', async () => {
        configReader.getConfigById.mockResolvedValue(makeCfg());
        connReader.getConnectionById.mockResolvedValue(makeConn());
        fetchActivity.execute.mockResolvedValue([]);
        pdfService.generatePdf.mockResolvedValue(Buffer.from('pdf'));
        dispatcher.dispatchFile.mockResolvedValue(undefined);
        configWriter.updateLastSentAt.mockResolvedValue(undefined);

        await service.generateForConfig('cfg-id','user-id');

        expect(pdfService.generatePdf).toHaveBeenCalled();
        expect(dispatcher.dispatchFile).toHaveBeenCalledWith(
            expect.objectContaining({ provider: 'email' }),
            expect.any(Buffer),
            expect.stringMatching(/^report-weekly-/),
            expect.any(String),
        );
        expect(configWriter.updateLastSentAt).toHaveBeenCalledWith('cfg-id', expect.any(Date));
    });

    it('throws 404 when config not found', async () => {
        configReader.getConfigById.mockResolvedValue(null);
        await expect(service.generateForConfig('cfg-id','user-id')).rejects.toThrow(AppError);
    });

    it('throws 403 when actor does not own config', async () => {
        configReader.getConfigById.mockResolvedValue(makeCfg('other'));
        await expect(service.generateForConfig('cfg-id','user-id')).rejects.toThrow(AppError);
    });

    it('throws 400 when config is not active', async () => {
        configReader.getConfigById.mockResolvedValue(makeCfg('user-id', false));
        await expect(service.generateForConfig('cfg-id','user-id')).rejects.toThrow(AppError);
    });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx jest tests/modules/report/generate_report.service.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Implement GenerateReportService**

`src/modules/report/generate_report.service.ts` — constructor takes `(configReader, configWriter, connectionReader, fetchActivityUseCase, pdfService, dispatcher)` all as interfaces; `static create(...)` factory.

`generateForConfig(configId, actorId)`:
1. Load config via reader; throw 404 if null
2. `config.ensureOwnership(actorId, ...)` and `config.ensureActive(...)`
3. Load connection via connectionReader; throw 404 if null
4. Compute `since` via private `sinceDate(frequency)` (daily: −24h, weekly: −7d, monthly: −30d)
5. `activities = await fetchActivityUseCase.execute(config.user_id, since)`
6. `pdfData = buildTemplateData(activities, since, new Date())`
7. `pdfBuffer = await pdfService.generatePdf(pdfData)`
8. `filename = 'report-{frequency}-{YYYY-MM-DD}.pdf'`, `caption = '{Frequency} Report — {dateString}'`
9. `await dispatcher.dispatchFile(connection.credentials, pdfBuffer, filename, caption)`
10. `await configWriter.updateLastSentAt(config.id, new Date())`

Private `buildTemplateData(activities, since, until)` — sums `totalCommits`, `totalPRs`, maps to `ReportTemplateData` shape.

- [ ] **Step 4: Run GenerateReportService tests to verify pass**

Run: `npx jest tests/modules/report/generate_report.service.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Implement ReportWorker**

`src/workers/report.worker.ts`:
- Export `bootstrapReportWorker(db, encryption, emailSender)`
- Queue name: `'report-worker'`, job key: `'report-tick'`
- Reads `process.env.REPORT_WORKER_INTERVAL_MS` (default: `3600000` = 1 hour)
- On each tick: loads `getAllActiveConfigs()` from `RepositoryReportConfigReader.create(db)`, filters by `config.isDue(new Date())`, creates a fresh `GenerateReportService` from all the readers/services, calls `generateForConfig(c.id, c.user_id)` for each due config via `Promise.allSettled`, logs failures
- Follows the same BullMQ pattern as `worker.bootstrap.ts`

- [ ] **Step 6: Update worker.bootstrap.ts to start report worker**

In `worker.bootstrap.ts`, import and call `bootstrapReportWorker(db, encryption, emailSender)` after the existing `bootstrapWorkers` setup.

- [ ] **Step 7: Write e2e controller tests**

```typescript
// tests/modules/report/controllers/controller.report.e2e.test.ts
import request from 'supertest';

jest.mock('../../../../src/redis', () => ({ REDIS: {} }));
jest.mock('../../../../src/api_limiter', () => ({
    preDefinedPublicLimiters: () => ({}),
    constructMiddlewareWrapper: () => (_req: any, _res: any, next: any) => next(),
}));

import { createApp } from '../../../../src/app';
import { DepsContainer } from '../../../../src/container';
import { JwtTokenService } from '../../../../src/modules/authentification/jwt/service/jwt.token_service';
import { UserIdExtractor } from '../../../../src/modules/authentification/extractor.extract_user_id';
import { ControllerReportConfigCreate } from '../../../../src/modules/report/controllers/controller.report_config.create';
import { ControllerReportConfigList } from '../../../../src/modules/report/controllers/controller.report_config.list';
import { ControllerReportConfigDelete } from '../../../../src/modules/report/controllers/controller.report_config.delete';
import { ControllerReportGenerate } from '../../../../src/modules/report/controllers/controller.report.generate';
import { AppError } from '../../../../src/modules/errors/errors.global';

const jwtService = JwtTokenService.create();
const extractor = UserIdExtractor.create();
const ACTOR_ID = 'actor-uuid';
const AUTH = `Bearer ${jwtService.generateAccessToken(ACTOR_ID)}`;
const NOW = new Date().toISOString();
const CFG_DTO = { id: 'cfg-uuid', user_id: ACTOR_ID, connection_id: 'conn-uuid', frequency: 'weekly', schedule_day: 3, is_active: true, last_sent_at: null, created_at: NOW, updated_at: NOW };

function buildContainer(overrides: Partial<DepsContainer> = {}): DepsContainer {
    const mockCreate = { createReportConfigService: jest.fn().mockResolvedValue(CFG_DTO) };
    const mockList = { listReportConfigsService: jest.fn().mockResolvedValue([CFG_DTO]) };
    const mockDelete = { deleteReportConfigService: jest.fn().mockResolvedValue(undefined) };
    const mockGenerate = { generateForConfig: jest.fn().mockResolvedValue(undefined) };
    return {
        ...({} as DepsContainer),
        jwtTokenService: jwtService,
        controllerReportConfigCreate: ControllerReportConfigCreate.create(mockCreate as any, extractor),
        controllerReportConfigList: ControllerReportConfigList.create(mockList as any, extractor),
        controllerReportConfigDelete: ControllerReportConfigDelete.create(mockDelete as any, extractor),
        controllerReportGenerate: ControllerReportGenerate.create(mockGenerate as any, extractor),
        ...overrides,
    };
}

describe('Report controllers e2e', () => {
    describe('POST /protected/report-configs', () => {
        it('returns 201 with created config', async () => {
            const res = await request(createApp(buildContainer()))
                .post('/protected/report-configs')
                .set('Authorization', AUTH)
                .send({ connection_id: 'a0000000-0000-0000-0000-000000000000', frequency: 'weekly', schedule_day: 3 });
            expect(res.status).toBe(201);
            expect(res.body.report_config.id).toBe('cfg-uuid');
        });
        it('returns 400 on invalid body', async () => {
            const res = await request(createApp(buildContainer()))
                .post('/protected/report-configs')
                .set('Authorization', AUTH)
                .send({ connection_id: 'not-a-uuid', frequency: 'hourly' });
            expect(res.status).toBe(400);
        });
        it('returns 401 without auth', async () => {
            const res = await request(createApp(buildContainer())).post('/protected/report-configs').send({});
            expect(res.status).toBe(401);
        });
    });

    describe('GET /protected/report-configs', () => {
        it('returns 200 with list', async () => {
            const res = await request(createApp(buildContainer()))
                .get('/protected/report-configs')
                .set('Authorization', AUTH);
            expect(res.status).toBe(200);
            expect(res.body.report_configs).toHaveLength(1);
        });
    });

    describe('DELETE /protected/report-configs/:id', () => {
        it('returns 204 on success', async () => {
            const res = await request(createApp(buildContainer()))
                .delete('/protected/report-configs/cfg-uuid')
                .set('Authorization', AUTH);
            expect(res.status).toBe(204);
        });
        it('propagates AppError from service', async () => {
            const mockDelete = { deleteReportConfigService: jest.fn().mockRejectedValue(new AppError('Not found', 404, 'test')) };
            const res = await request(createApp(buildContainer({
                controllerReportConfigDelete: ControllerReportConfigDelete.create(mockDelete as any, extractor),
            })))
                .delete('/protected/report-configs/cfg-uuid')
                .set('Authorization', AUTH);
            expect(res.status).toBe(404);
        });
    });

    describe('POST /protected/reports/generate', () => {
        it('returns 202 on success', async () => {
            const res = await request(createApp(buildContainer()))
                .post('/protected/reports/generate')
                .set('Authorization', AUTH)
                .send({ report_config_id: 'a0000000-0000-0000-0000-000000000000' });
            expect(res.status).toBe(202);
        });
        it('returns 400 on invalid body', async () => {
            const res = await request(createApp(buildContainer()))
                .post('/protected/reports/generate')
                .set('Authorization', AUTH)
                .send({ report_config_id: 'not-a-uuid' });
            expect(res.status).toBe(400);
        });
    });
});
```

- [ ] **Step 8: Run to verify fail**

Run: `npx jest tests/modules/report/controllers/controller.report.e2e.test.ts --no-coverage`
Expected: FAIL — controllers + routes not yet wired

- [ ] **Step 9: Implement controllers**

`controller.report_config.create.ts` — `CreateReportConfigBodySchema` = `z.object({ connection_id: z.string().uuid(), frequency: z.enum(['daily','weekly','monthly']), schedule_day: z.number().int().min(0).max(6) })`; handler extracts userId, calls `txService.createReportConfigService(...)`, returns `201 { report_config }`.

`controller.report_config.list.ts` — handler extracts userId, calls `txService.listReportConfigsService(userId)`, returns `200 { report_configs }`.

`controller.report_config.delete.ts` — handler extracts userId + `req.params.id`, calls `txService.deleteReportConfigService(...)`, returns `204`.

`controller.report.generate.ts` — `GenerateReportBodySchema` = `z.object({ report_config_id: z.string().uuid() })`; handler extracts userId, calls `generateService.generateForConfig(report_config_id, userId)`, returns `202 { message: 'Report generation started.' }`.

- [ ] **Step 10: Wire container.ts**

Add to `createDepsContainer()` in `container.ts`:
```typescript
// report module
const reportConfigDtoMapper = ReportConfigDtoMapper.create();
const txReportConfigCreate = TxServiceReportConfigCreate.create(txManager, encryption, reportConfigDtoMapper);
const txReportConfigList = TxServiceReportConfigList.create(txManager, reportConfigDtoMapper);
const txReportConfigDelete = TxServiceReportConfigDelete.create(txManager);

const reportConfigReader = RepositoryReportConfigReader.create(pool);
const reportConfigWriter = RepositoryReportConfigWriter.create(pool);
const githubSourceReader = RepositoryGithubSourceReader.create(pool, encryption);
const connectionReaderDirect = RepositoryConnectionReader.create(pool, encryption);
const fetchActivityUseCase = FetchGithubActivityUseCase.create(githubSourceReader);
const pdfService = PdfService.create();
const notificationDispatcher = NotificationDispatcher.create(emailSender);
const generateReportService = GenerateReportService.create(
    reportConfigReader, reportConfigWriter, connectionReaderDirect,
    fetchActivityUseCase, pdfService, notificationDispatcher,
);

const controllerReportConfigCreate = ControllerReportConfigCreate.create(txReportConfigCreate, userIdExtractor);
const controllerReportConfigList = ControllerReportConfigList.create(txReportConfigList, userIdExtractor);
const controllerReportConfigDelete = ControllerReportConfigDelete.create(txReportConfigDelete, userIdExtractor);
const controllerReportGenerate = ControllerReportGenerate.create(generateReportService, userIdExtractor);
```

Add all four controllers to the returned container object.

- [ ] **Step 11: Wire app.ts**

Import schemas and controllers; add to `privateRouter`:
```typescript
import { CreateReportConfigBodySchema } from './modules/report/controllers/controller.report_config.create';
import { GenerateReportBodySchema } from './modules/report/controllers/controller.report.generate';

privateRouter.post('/report-configs', validateBody(CreateReportConfigBodySchema), dependencies.controllerReportConfigCreate.createReportConfigCont);
privateRouter.get('/report-configs', dependencies.controllerReportConfigList.listReportConfigsCont);
privateRouter.delete('/report-configs/:id', dependencies.controllerReportConfigDelete.deleteReportConfigCont);
privateRouter.post('/reports/generate', validateBody(GenerateReportBodySchema), dependencies.controllerReportGenerate.generateReportCont);
```

- [ ] **Step 12: Run e2e tests to verify pass**

Run: `npx jest tests/modules/report/controllers/controller.report.e2e.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 13: Run full test suite**

Run: `npm test`
Expected: all tests pass, coverage ≥ 90%
