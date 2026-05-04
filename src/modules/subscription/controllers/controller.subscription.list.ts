import { Request, Response } from 'express';
import { TxServiceSubscriptionList } from '../transactional_services/tx_service.subscription.list';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';
import { throwAppError } from '../../errors/errors.global';

export class ControllerSubscriptionList {
    private moduleName = 'ControllerSubscriptionList';

    constructor(
        private readonly txService: TxServiceSubscriptionList,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceSubscriptionList, extractor: UserIdExtractor): ControllerSubscriptionList {
        return new ControllerSubscriptionList(txService, extractor);
    }

    listSubscriptionsCont = async (req: Request<{}, {}, {}, { source_id?: string }>, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const { source_id } = req.query;
        if (!source_id) {
            throwAppError('source_id query parameter is required.', 400, `${this.moduleName}.listSubscriptionsCont`);
        }
        const subscriptions = await this.txService.listSubscriptionsService(userId, source_id);
        return res.status(200).json({ subscriptions });
    };
}
