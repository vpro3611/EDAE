import { Request, Response } from 'express';
import { TxServiceConnectionListActive } from '../transactional_services/tx_service.connection.list_active';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export class ControllerConnectionListActive {
    private moduleName = 'ControllerConnectionListActive';

    constructor(
        private readonly txService: TxServiceConnectionListActive,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceConnectionListActive, extractor: UserIdExtractor) {
        return new ControllerConnectionListActive(txService, extractor);
    }

    listActiveConnectionsCont = async (req: Request, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const connections = await this.txService.listActiveConnectionsService(userId);
        return res.status(200).json({ connections });
    };
}
