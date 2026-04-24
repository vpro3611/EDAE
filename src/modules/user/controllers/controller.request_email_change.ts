import { Request, Response } from "express";
import { z } from "zod";
import { TxServiceRequestEmailChange } from "../transactional_services/tx_service.request_email_change";
import { UserIdExtractor } from "../../authentification/extractor.extract_user_id";

export const RequestEmailChangeBodySchema = z.object({
    newEmail: z.string().email(),
});

type RequestEmailChangeBodyType = z.infer<typeof RequestEmailChangeBodySchema>;

export class ControllerRequestEmailChange {

    private readonly moduleName = "ControllerRequestEmailChange";

    constructor(private readonly txService: TxServiceRequestEmailChange,
                private readonly extractor: UserIdExtractor) {}

    static create(txService: TxServiceRequestEmailChange, extractor: UserIdExtractor) {
        return new ControllerRequestEmailChange(txService, extractor);
    }

    requestEmailChangeCont =
        async (req: Request<{}, {}, RequestEmailChangeBodyType>, res: Response) => {
            const id = this.extractor.extractUserId(req, this.moduleName);
            const { newEmail } = req.body;

            await this.txService.requestEmailChangeService(id, newEmail);

            return res.status(200).json({ message: "Email change requested. Check your inbox for a verification code." });
        };
}
