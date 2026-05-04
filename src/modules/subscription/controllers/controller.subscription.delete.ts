import { Request, Response } from 'express';
import { TxServiceSubscriptionDelete } from '../transactional_services/tx_service.subscription.delete';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export class ControllerSubscriptionDelete {
    private moduleName = 'ControllerSubscriptionDelete';

    constructor(
        private readonly txService: TxServiceSubscriptionDelete,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceSubscriptionDelete, extractor: UserIdExtractor): ControllerSubscriptionDelete {
        return new ControllerSubscriptionDelete(txService, extractor);
    }

    deleteSubscriptionCont = async (req: Request<{ id: string }>, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const { id } = req.params;
        await this.txService.deleteSubscriptionService(userId, id);
        return res.status(204).send();
    };
}
