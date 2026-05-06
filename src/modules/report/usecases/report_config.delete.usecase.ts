import { ReportConfigRepoReaderInterface, ReportConfigRepoWriterInterface } from '../interfaces/interface.repository';
import { throwAppError } from '../../errors/errors.global';

export class ReportConfigDeleteUseCase {
    private moduleName = 'ReportConfigDeleteUseCase';

    constructor(
        private readonly reader: ReportConfigRepoReaderInterface,
        private readonly writer: ReportConfigRepoWriterInterface,
    ) {}

    static create(
        reader: ReportConfigRepoReaderInterface,
        writer: ReportConfigRepoWriterInterface,
    ): ReportConfigDeleteUseCase {
        return new ReportConfigDeleteUseCase(reader, writer);
    }

    async execute(actorId: string, configId: string): Promise<void> {
        const config = await this.reader.getConfigById(configId);
        if (!config) {
            throwAppError('Report configuration not found.', 404, `${this.moduleName}.execute`);
        }
        config.ensureOwnership(actorId, `${this.moduleName}.execute`);
        await this.writer.deleteConfig(configId);
    }
}
