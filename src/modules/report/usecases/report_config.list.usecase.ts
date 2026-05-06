import { ReportConfigRepoReaderInterface } from '../interfaces/interface.repository';
import { ReportConfigDtoMapper } from '../dto/report_config.dto.mapper';
import { ReportConfigDto } from '../dto/report_config.dto';

export class ReportConfigListUseCase {
    private moduleName = 'ReportConfigListUseCase';

    constructor(
        private readonly reader: ReportConfigRepoReaderInterface,
        private readonly mapper: ReportConfigDtoMapper,
    ) {}

    static create(
        reader: ReportConfigRepoReaderInterface,
        mapper: ReportConfigDtoMapper,
    ): ReportConfigListUseCase {
        return new ReportConfigListUseCase(reader, mapper);
    }

    async execute(userId: string): Promise<ReportConfigDto[]> {
        const configs = await this.reader.getActiveConfigsByUserId(userId);
        return configs.map(config => this.mapper.mapToDto(config));
    }
}
