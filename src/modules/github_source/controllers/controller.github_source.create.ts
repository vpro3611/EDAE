import { Request, Response } from 'express';
import { z } from 'zod';
import { TxServiceGithubSourceCreate } from '../transactional_services/tx_service.github_source.create';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export const CreateGithubSourceBodySchema = z.object({
    repo_owner: z.string().min(1).max(255),
    repo_name: z.string().min(1).max(255),
    access_token: z.string().min(1).nullable().optional(),
});

type CreateGithubSourceBodyType = z.infer<typeof CreateGithubSourceBodySchema>;

export class ControllerGithubSourceCreate {
    private moduleName = 'ControllerGithubSourceCreate';

    constructor(
        private readonly txService: TxServiceGithubSourceCreate,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceGithubSourceCreate, extractor: UserIdExtractor): ControllerGithubSourceCreate {
        return new ControllerGithubSourceCreate(txService, extractor);
    }

    createSourceCont = async (req: Request<{}, {}, CreateGithubSourceBodyType>, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const { repo_owner, repo_name, access_token } = req.body;
        const source = await this.txService.createSourceService(userId, repo_owner, repo_name, access_token ?? null);
        return res.status(201).json({ source });
    };
}
