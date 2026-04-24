import { Request, Response } from "express";
import { z } from "zod";
import { TxServiceConfirmAccountDeletion } from "../transactional_services/tx_service.confirm_account_deletion";
import { UserIdExtractor } from "../../authentification/extractor.extract_user_id";

export const ConfirmAccountDeletionBodySchema = z.object({
    otp: z.string(),
});

type ConfirmAccountDeletionBodyType = z.infer<typeof ConfirmAccountDeletionBodySchema>;

export class ControllerConfirmAccountDeletion {

    private moduleName = "ControllerConfirmAccountDeletion";

    constructor(private readonly txService: TxServiceConfirmAccountDeletion,
                private readonly extractor: UserIdExtractor) {}

    static create(txService: TxServiceConfirmAccountDeletion, extractor: UserIdExtractor) {
        return new ControllerConfirmAccountDeletion(txService, extractor);
    }

    confirmAccountDeletionCont =
        async (req: Request<{}, {}, ConfirmAccountDeletionBodyType>, res: Response) => {
            const id = this.extractor.extractUserId(req, this.moduleName);
            const { otp } = req.body;

            await this.txService.confirmAccountDeletionService(id, otp);

            return res.status(200).json({ message: "Account deleted successfully." });
        };
}
