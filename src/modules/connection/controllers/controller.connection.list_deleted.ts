import { Request, Response } from 'express';
import { TxServiceConnectionListDeleted } from '../transactional_services/tx_service.connection.list_deleted';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export class ControllerConnectionListDeleted {
    private moduleName = 'ControllerConnectionListDeleted';

    constructor(
        private readonly txService: TxServiceConnectionListDeleted,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceConnectionListDeleted, extractor: UserIdExtractor) {
        return new ControllerConnectionListDeleted(txService, extractor);
    }

    listDeletedConnectionsCont = async (req: Request, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const connections = await this.txService.listDeletedConnectionsService(userId);
        return res.status(200).json({ connections });
    };
}
