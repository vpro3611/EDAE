import { Request, Response } from 'express';
import { TxServiceGithubSourceDelete } from '../transactional_services/tx_service.github_source.delete';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export class ControllerGithubSourceDelete {
    private moduleName = 'ControllerGithubSourceDelete';

    constructor(
        private readonly txService: TxServiceGithubSourceDelete,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceGithubSourceDelete, extractor: UserIdExtractor): ControllerGithubSourceDelete {
        return new ControllerGithubSourceDelete(txService, extractor);
    }

    deleteSourceCont = async (req: Request<{ id: string }>, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const { id } = req.params;
        await this.txService.deleteSourceService(userId, id);
        return res.status(204).send();
    };
}
