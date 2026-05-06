import { Request, Response } from 'express';
import { z } from 'zod';
import { TxServiceConnectionUpdate } from '../transactional_services/tx_service.connection.update';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';
import { ConnectionCredentialsSchema } from '../connection.credentials.schema';

export const UpdateConnectionBodySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    credentials: ConnectionCredentialsSchema.optional(),
});

type UpdateConnectionBodyType = z.infer<typeof UpdateConnectionBodySchema>;

export class ControllerConnectionUpdate {
    private moduleName = 'ControllerConnectionUpdate';

    constructor(
        private readonly txService: TxServiceConnectionUpdate,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceConnectionUpdate, extractor: UserIdExtractor) {
        return new ControllerConnectionUpdate(txService, extractor);
    }

    updateConnectionCont = async (req: Request<{ id: string }, {}, UpdateConnectionBodyType>, res: Response) => {
        const actorId = this.extractor.extractUserId(req, this.moduleName);
        const { id } = req.params;
        const { name, credentials } = req.body;
        const connection = await this.txService.updateConnectionService(actorId, id, { name, credentials });
        return res.status(200).json({ connection });
    };
}
