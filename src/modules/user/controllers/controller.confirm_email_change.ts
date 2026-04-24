import { Request, Response } from "express";
import { z } from "zod";
import { TxServiceConfirmEmailChange } from "../transactional_services/tx_service.confirm_email_change";
import { UserIdExtractor } from "../../authentification/extractor.extract_user_id";

export const ConfirmEmailChangeBodySchema = z.object({
    otp: z.string(),
});

type ConfirmEmailChangeBodyType = z.infer<typeof ConfirmEmailChangeBodySchema>;

export class ControllerConfirmEmailChange {

    private readonly moduleName = "ControllerConfirmEmailChange";

    constructor(private readonly txService: TxServiceConfirmEmailChange,
                private readonly extractor: UserIdExtractor) {}

    static create(txService: TxServiceConfirmEmailChange, extractor: UserIdExtractor) {
        return new ControllerConfirmEmailChange(txService, extractor);
    }

    confirmEmailChangeCont =
        async (req: Request<{}, {}, ConfirmEmailChangeBodyType>, res: Response) => {
            const id = this.extractor.extractUserId(req, this.moduleName);
            const { otp } = req.body;

            const user = await this.txService.confirmEmailChangeService(id, otp);

            return res.status(200).json({ user });
        };
}
