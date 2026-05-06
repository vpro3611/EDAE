import { Request, Response } from 'express';
import { z } from 'zod';
import { GenerateReportService } from '../generate_report.service';
import { UserIdExtractor } from '../../authentification/extractor.extract_user_id';

export const GenerateReportBodySchema = z.object({
    report_config_id: z.string().uuid(),
});

type GenerateReportBodyType = z.infer<typeof GenerateReportBodySchema>;

export class ControllerReportGenerate {
    private moduleName = 'ControllerReportGenerate';

    constructor(
        private readonly generateService: GenerateReportService,
        private readonly extractor: UserIdExtractor,
    ) {}

    static create(generateService: GenerateReportService, extractor: UserIdExtractor): ControllerReportGenerate {
        return new ControllerReportGenerate(generateService, extractor);
    }

    generateReportCont = async (req: Request<{}, {}, GenerateReportBodyType>, res: Response) => {
        const userId = this.extractor.extractUserId(req, this.moduleName);
        const { report_config_id } = req.body;
        await this.generateService.generateForConfig(report_config_id, userId);
        return res.status(200).json({ message: 'Report generated successfully.' });
    };
}
