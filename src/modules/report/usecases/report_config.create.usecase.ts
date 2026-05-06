import { ReportConfigRepoWriterInterface } from '../interfaces/interface.repository';
import { ConnectionRepoReaderInterface } from '../../connection/interfaces/interface.repository';
import { ReportConfigDtoMapper } from '../dto/report_config.dto.mapper';
import { ReportConfigDto } from '../dto/report_config.dto';
import { ReportConfig, ReportFrequency } from '../entity/report_config';
import { throwAppError } from '../../errors/errors.global';

export class ReportConfigCreateUseCase {
    private moduleName = 'ReportConfigCreateUseCase';

    constructor(
        private readonly writer: ReportConfigRepoWriterInterface,
        private readonly connectionReader: ConnectionRepoReaderInterface,
        private readonly mapper: ReportConfigDtoMapper,
    ) {}

    static create(
        writer: ReportConfigRepoWriterInterface,
        connectionReader: ConnectionRepoReaderInterface,
        mapper: ReportConfigDtoMapper,
    ): ReportConfigCreateUseCase {
        return new ReportConfigCreateUseCase(writer, connectionReader, mapper);
    }

    async execute(
        userId: string,
        connectionId: string,
        frequency: ReportFrequency,
        scheduleDay: number,
    ): Promise<ReportConfigDto> {
        const connection = await this.connectionReader.getConnectionById(connectionId);
        if (!connection) {
            throwAppError('Connection not found.', 404, `${this.moduleName}.execute`);
        }
        connection.ensureOwnership(userId, `${this.moduleName}.execute`);
        connection.ensureNotDeleted(`${this.moduleName}.execute`);

        const data = ReportConfig.createForDatabase(userId, connectionId, frequency, scheduleDay);
        const config = await this.writer.createConfig(data);
        return this.mapper.mapToDto(config);
    }
}
