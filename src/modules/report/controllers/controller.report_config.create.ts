import { Request, Response } from 'express';
import { z } from 'zod';
import { TxServiceReportConfigCreate } from '../transactional_services/tx_service.report_config.create';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export const CreateReportConfigBodySchema = z.object({
    connection_id: z.string().uuid(),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    schedule_day: z.number().int().min(0).max(6),
});

type CreateReportConfigBodyType = z.infer<typeof CreateReportConfigBodySchema>;

export class ControllerReportConfigCreate {
    private moduleName = 'ControllerReportConfigCreate';

    constructor(
        private readonly txService: TxServiceReportConfigCreate,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(txService: TxServiceReportConfigCreate, extractor: UserIdExtractor): ControllerReportConfigCreate {
        return new ControllerReportConfigCreate(txService, extractor);
    }

    createReportConfigCont = async (req: Request<{}, {}, CreateReportConfigBodyType>, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const { connection_id, frequency, schedule_day } = req.body;
        const report_config = await this.txService.createReportConfigService(userId, connection_id, frequency, schedule_day);
        return res.status(201).json({ report_config });
    };
}
