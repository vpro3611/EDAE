import { Request, Response } from 'express';
import { TxServiceReportConfigDelete } from '../transactional_services/tx_service.report_config.delete';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export class ControllerReportConfigDelete {
    private moduleName = 'ControllerReportConfigDelete';

    constructor(
        private readonly txService: TxServiceReportConfigDelete,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceReportConfigDelete, extractor: UserIdExtractor): ControllerReportConfigDelete {
        return new ControllerReportConfigDelete(txService, extractor);
    }

    deleteReportConfigCont = async (req: Request<{ id: string }>, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const { id } = req.params;
        await this.txService.deleteReportConfigService(userId, id);
        return res.status(204).send();
    };
}
