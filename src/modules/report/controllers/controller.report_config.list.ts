import { Request, Response } from 'express';
import { TxServiceReportConfigList } from '../transactional_services/tx_service.report_config.list';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export class ControllerReportConfigList {
    private moduleName = 'ControllerReportConfigList';

    constructor(
        private readonly txService: TxServiceReportConfigList,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceReportConfigList, extractor: UserIdExtractor): ControllerReportConfigList {
        return new ControllerReportConfigList(txService, extractor);
    }

    listReportConfigsCont = async (req: Request, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const report_configs = await this.txService.listReportConfigsService(userId);
        return res.status(200).json({ report_configs });
    };
}
