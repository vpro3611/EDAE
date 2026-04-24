import { Request, Response } from "express";
import { z } from "zod";
import { TxServiceConfirmPasswordReset } from "../transactional_services/tx_service.confirm_password_reset";

export const ConfirmPasswordResetBodySchema = z.object({
    email: z.string().email(),
    otp: z.string(),
    newPassword: z.string(),
});

type ConfirmPasswordResetBodyType = z.infer<typeof ConfirmPasswordResetBodySchema>;

export class ControllerConfirmPasswordReset {
    constructor(private readonly txService: TxServiceConfirmPasswordReset) {}

    static create(txService: TxServiceConfirmPasswordReset) {
        return new ControllerConfirmPasswordReset(txService);
    }

    confirmPasswordResetCont =
        async (req: Request<{}, {}, ConfirmPasswordResetBodyType>, res: Response) => {
            const { email, otp, newPassword } = req.body;

            await this.txService.confirmPasswordResetService(email, otp, newPassword);

            return res.status(200).json({ message: "Password reset successfully." });
        };
}
