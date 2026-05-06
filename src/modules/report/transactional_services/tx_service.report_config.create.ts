import { TransactionManagerInterface } from '../../infra/transaction_manager/transaction_manager.interface';
import { InfraEncryptionInterface } from '../../infra/encryption/infra.encryption.interface';
import { RepositoryReportConfigWriter } from '../repository/repository.report_config.writer';
import { RepositoryConnectionReader } from '../../connection/repository/repository.connection.reader';
import { ReportConfigCreateUseCase } from '../usecases/report_config.create.usecase';
import { ReportConfigDtoMapper } from '../dto/report_config.dto.mapper';
import { ReportConfigDto } from '../dto/report_config.dto';
import { ReportFrequency } from '../entity/report_config';

export class TxServiceReportConfigCreate {
    constructor(
        private readonly txManager: TransactionManagerInterface,
        private readonly encryption: InfraEncryptionInterface,
        private readonly mapper: ReportConfigDtoMapper,
    ) {}

    static create(
        txManager: TransactionManagerInterface,
        encryption: InfraEncryptionInterface,
        mapper: ReportConfigDtoMapper,
    ): TxServiceReportConfigCreate {
        return new TxServiceReportConfigCreate(txManager, encryption, mapper);
    }

    async createReportConfigService(
        userId: string,
        connectionId: string,
        frequency: ReportFrequency,
        scheduleDay: number,
    ): Promise<ReportConfigDto> {
        return await this.txManager.runInTransaction(async (client) => {
            const writer = RepositoryReportConfigWriter.create(client);
            const connReader = RepositoryConnectionReader.create(client, this.encryption);
            const useCase = ReportConfigCreateUseCase.create(writer, connReader, this.mapper);
            return await useCase.execute(userId, connectionId, frequency, scheduleDay);
        });
    }
}
