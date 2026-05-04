import { Request, Response } from 'express';
import { z } from 'zod';
import { TxServiceSubscriptionCreate } from '../transactional_services/tx_service.subscription.create';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export const CreateSubscriptionBodySchema = z.object({
    github_source_id: z.string().uuid(),
    event_type: z.enum(['new_release', 'new_commit', 'new_branch', 'new_tag', 'issue_opened', 'issue_closed', 'pr_opened', 'pr_merged', 'workflow_completed', 'star_milestone', 'fork_milestone']),
    connection_id: z.string().uuid(),
    message_template: z.string().min(1),
    config: z.record(z.string(), z.unknown()).optional().default({}),
});

type CreateSubscriptionBodyType = z.infer<typeof CreateSubscriptionBodySchema>;

export class ControllerSubscriptionCreate {
    private moduleName = 'ControllerSubscriptionCreate';

    constructor(
        private readonly txService: TxServiceSubscriptionCreate,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceSubscriptionCreate, extractor: UserIdExtractor): ControllerSubscriptionCreate {
        return new ControllerSubscriptionCreate(txService, extractor);
    }

    createSubscriptionCont = async (req: Request<{}, {}, CreateSubscriptionBodyType>, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const { github_source_id, event_type, connection_id, message_template, config } = req.body;
        const subscription = await this.txService.createSubscriptionService(
            userId, github_source_id, event_type, connection_id, message_template, config,
        );
        return res.status(201).json({ subscription });
    };
}
