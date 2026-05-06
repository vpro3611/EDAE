import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { RepositoryReportConfigReader } from '../repository/repository.report_config.reader';
import { ReportConfigListUseCase } from '../usecases/report_config.list.usecase';
import { ReportConfigDtoMapper } from '../dto/report_config.dto.mapper';
import { ReportConfigDto } from '../dto/report_config.dto';

export class TxServiceReportConfigList {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly mapper: ReportConfigDtoMapper,
    ) {}

    static create(
        txManager: TransactionManagerInterface,
        mapper: ReportConfigDtoMapper,
    ): TxServiceReportConfigList {
        return new TxServiceReportConfigList(txManager, mapper);
    }

    async listReportConfigsService(userId: string): Promise<ReportConfigDto[]> {
        return await this.txManager.runInTransaction(async (client) => {
            const reader = RepositoryReportConfigReader.create(client);
            const useCase = ReportConfigListUseCase.create(reader, this.mapper);
            return await useCase.execute(userId);
        });
    }
}
