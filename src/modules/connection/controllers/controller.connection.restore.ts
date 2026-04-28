import { Request, Response } from 'express';
import { TxServiceConnectionRestore } from '../transactional_services/tx_service.connection.restore';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export class ControllerConnectionRestore {
    private moduleName = 'ControllerConnectionRestore';

    constructor(
        private readonly txService: TxServiceConnectionRestore,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceConnectionRestore, extractor: UserIdExtractor) {
        return new ControllerConnectionRestore(txService, extractor);
    }

    restoreConnectionCont = async (req: Request<{ id: string }>, res: Response) => {
        const actorId = this.extractor.extractUserId(req, this.moduleName);
        const { id } = req.params;
        const connection = await this.txService.restoreConnectionService(actorId, id);
        return res.status(200).json({ connection });
    };
}
