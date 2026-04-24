import { Request, Response } from "express";
import { z } from "zod";
import { TxServiceRequestPasswordReset } from "../transactional_services/tx_service.request_password_reset";

export const RequestPasswordResetBodySchema = z.object({
    email: z.string().email(),
});

type RequestPasswordResetBodyType = z.infer<typeof RequestPasswordResetBodySchema>;

export class ControllerRequestPasswordReset {
    constructor(private readonly txService: TxServiceRequestPasswordReset) {}

    static create(txService: TxServiceRequestPasswordReset) {
        return new ControllerRequestPasswordReset(txService);
    }

    requestPasswordResetCont =
        async (req: Request<{}, {}, RequestPasswordResetBodyType>, res: Response) => {
            const { email } = req.body;

            await this.txService.requestPasswordResetService(email);

            return res.status(200).json({ message: "If an account with that email exists, a reset code has been sent." });
        };
}
