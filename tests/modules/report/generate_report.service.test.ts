import { GenerateReportService } from '../../../src/modules/report/generate_report.service';
import { ReportConfigRepoReaderInterface, ReportConfigRepoWriterInterface } from '../../../src/modules/report/interfaces/interface.repository';
import { ConnectionRepoReaderInterface } from '../../../src/modules/connection/interfaces/interface.repository';
import { FetchGithubActivityUseCase } from '../../../src/modules/report/usecases/fetch_github_activity.usecase';
import { PdfService } from '../../../src/modules/report/pdf/pdf.service';
import { NotificationDispatcher } from '../../../src/modules/notification/notification.dispatcher';
import { ReportConfig } from '../../../src/modules/report/entity/report_config';
import { Connection } from '../../../src/modules/connection/entity/connection';
import { AppError } from '../../../src/modules/errors/errors.global';

function makeCfg(userId = 'user-id', active = true) {
    return ReportConfig.restore('cfg-id', userId, 'conn-id', 'weekly', 3, active, null, new Date(), new Date());
}
function makeConn() {
    return Connection.restore('conn-id', 'user-id', 'email', 'E', { provider: 'email', address: 'u@t.com' }, new Date(), new Date(), false);
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

        await service.generateForConfig('cfg-id', 'user-id');

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
        await expect(service.generateForConfig('cfg-id', 'user-id')).rejects.toThrow(AppError);
    });

    it('throws 403 when actor does not own config', async () => {
        configReader.getConfigById.mockResolvedValue(makeCfg('other'));
        await expect(service.generateForConfig('cfg-id', 'user-id')).rejects.toThrow(AppError);
    });

    it('throws 400 when config is not active', async () => {
        configReader.getConfigById.mockResolvedValue(makeCfg('user-id', false));
        await expect(service.generateForConfig('cfg-id', 'user-id')).rejects.toThrow(AppError);
    });

    it('throws 404 when connection not found', async () => {
        configReader.getConfigById.mockResolvedValue(makeCfg());
        connReader.getConnectionById.mockResolvedValue(null);
        await expect(service.generateForConfig('cfg-id', 'user-id')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 400 when connection is deleted', async () => {
        configReader.getConfigById.mockResolvedValue(makeCfg());
        connReader.getConnectionById.mockResolvedValue(
            Connection.restore('conn-id', 'user-id', 'email', 'E', { provider: 'email', address: 'u@t.com' }, new Date(), new Date(), true),
        );
        await expect(service.generateForConfig('cfg-id', 'user-id')).rejects.toMatchObject({ statusCode: 400 });
    });
});
