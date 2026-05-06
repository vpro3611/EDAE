import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { RepositoryReportConfigReader } from '../repository/repository.report_config.reader';
import { RepositoryReportConfigWriter } from '../repository/repository.report_config.writer';
import { ReportConfigDeleteUseCase } from '../usecases/report_config.delete.usecase';

export class TxServiceReportConfigDelete {
    constructor(
        private readonly txManager: TransactionManagerInterface,
    ) {}

    static create(txManager: TransactionManagerInterface): TxServiceReportConfigDelete {
        return new TxServiceReportConfigDelete(txManager);
    }

    async deleteReportConfigService(userId: string, configId: string): Promise<void> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryReportConfigReader.create(client);
            const writer = RepositoryReportConfigWriter.create(client);
            const useCase = ReportConfigDeleteUseCase.create(reader, writer);
            return await useCase.execute(userId, configId);
        });
    }
}
