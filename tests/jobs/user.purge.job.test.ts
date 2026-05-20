import { UserPurgeJob } from '../../src/jobs/user.purge.job';
import { UserRepoWriterInterface } from '../../src/modules/user/interfaces/interface.repository';

jest.mock('node-cron', () => ({
    validate: jest.fn(() => true),
    schedule: jest.fn(),
}));

import cron from 'node-cron';

function makeMockWriter(purgeResult = 0): jest.Mocked<UserRepoWriterInterface> {
    return {
        createUser: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
        markUserAsVerified: jest.fn(),
        purgeDeletedUsers: jest.fn().mockResolvedValue(purgeResult),
    };
}

describe('UserPurgeJob', () => {
    let consoleSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        (cron.validate as jest.Mock).mockReturnValue(true);
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        delete process.env.USER_PURGE_CRON;
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('run()', () => {
        it('calls purgeDeletedUsers and logs the count', async () => {
            const writer = makeMockWriter(3);
            const job = new UserPurgeJob(writer);

            await job.run();

            expect(writer.purgeDeletedUsers).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Purged 3'));
        });

        it('logs zero when no users are purged', async () => {
            const writer = makeMockWriter(0);
            const job = new UserPurgeJob(writer);

            await job.run();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Purged 0'));
        });

        it('propagates errors thrown by purgeDeletedUsers', async () => {
            const writer = makeMockWriter();
            writer.purgeDeletedUsers.mockRejectedValue(new Error('db error'));
            const job = new UserPurgeJob(writer);

            await expect(job.run()).rejects.toThrow('db error');
        });
    });

    describe('start()', () => {
        it('runs immediately on startup', async () => {
            const writer = makeMockWriter(1);
            const job = new UserPurgeJob(writer);

            job.start();
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(writer.purgeDeletedUsers).toHaveBeenCalledTimes(1);
        });

        it('schedules a recurring cron with the default expression', () => {
            const writer = makeMockWriter();
            const job = new UserPurgeJob(writer);

            job.start();

            expect(cron.validate).toHaveBeenCalledWith('0 3 * * *');
            expect(cron.schedule).toHaveBeenCalledWith('0 3 * * *', expect.any(Function));
        });

        it('uses USER_PURGE_CRON env var when set', () => {
            process.env.USER_PURGE_CRON = '0 4 * * 0';
            const writer = makeMockWriter();
            const job = new UserPurgeJob(writer);

            job.start();

            expect(cron.validate).toHaveBeenCalledWith('0 4 * * 0');
            expect(cron.schedule).toHaveBeenCalledWith('0 4 * * 0', expect.any(Function));
        });

        it('does not schedule when the cron expression is invalid', () => {
            (cron.validate as jest.Mock).mockReturnValue(false);
            const writer = makeMockWriter();
            const job = new UserPurgeJob(writer);

            job.start();

            expect(cron.schedule).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid cron expression'));
        });

        it('logs a startup error without throwing if the immediate run rejects', async () => {
            const writer = makeMockWriter();
            writer.purgeDeletedUsers.mockRejectedValue(new Error('startup db failure'));
            const job = new UserPurgeJob(writer);

            expect(() => job.start()).not.toThrow();
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Startup run failed'),
                expect.any(Error),
            );
        });
    });
});
