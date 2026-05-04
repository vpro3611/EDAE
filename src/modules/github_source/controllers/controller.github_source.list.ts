import { Request, Response } from 'express';
import { TxServiceGithubSourceList } from '../transactional_services/tx_service.github_source.list';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export class ControllerGithubSourceList {
    private moduleName = 'ControllerGithubSourceList';

    constructor(
        private readonly txService: TxServiceGithubSourceList,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceGithubSourceList, extractor: UserIdExtractor): ControllerGithubSourceList {
        return new ControllerGithubSourceList(txService, extractor);
    }

    listSourcesCont = async (req: Request, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const sources = await this.txService.listSourcesService(userId);
        return res.status(200).json({ sources });
    };
}
