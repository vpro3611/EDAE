import { Request, Response } from 'express';
import { z } from 'zod';
import { TxServiceConnectionCreate } from '../transactional_services/tx_service.connection.create';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';
import { ConnectionCredentialsSchema } from '../connection.credentials.schema';

export const CreateConnectionBodySchema = z.object({
    name: z.string().min(1).max(100),
    credentials: ConnectionCredentialsSchema,
});

type CreateConnectionBodyType = z.infer<typeof CreateConnectionBodySchema>;

export class ControllerConnectionCreate {
    private moduleName = 'ControllerConnectionCreate';

    constructor(
        private readonly txService: TxServiceConnectionCreate,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceConnectionCreate, extractor: UserIdExtractor) {
        return new ControllerConnectionCreate(txService, extractor);
    }

    createConnectionCont = async (req: Request<{}, {}, CreateConnectionBodyType>, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const { name, credentials } = req.body;
        const connection = await this.txService.createConnectionService(userId, name, credentials);
        return res.status(201).json({ connection });
    };
}
