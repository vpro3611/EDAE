import { Request, Response } from 'express';
import { TxServiceConnectionSoftDelete } from '../transactional_services/tx_service.connection.soft_delete';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export class ControllerConnectionSoftDelete {
    private moduleName = 'ControllerConnectionSoftDelete';

    constructor(
        private readonly txService: TxServiceConnectionSoftDelete,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceConnectionSoftDelete, extractor: UserIdExtractor) {
        return new ControllerConnectionSoftDelete(txService, extractor);
    }

    softDeleteConnectionCont = async (req: Request<{ id: string }>, res: Response) => {
        const actorId = this.extractor.extractUserId(req, this.moduleName);
        const { id } = req.params;
        await this.txService.softDeleteConnectionService(actorId, id);
        return res.status(204).send();
    };
}
