import { Request, Response } from "express";
import { z } from "zod";
import { TxServiceChangePassword } from "../transactional_services/tx_service.change_password";
import { UserIdExtractor } from "../../authentification/extractor.extract_user_id";

export const ChangePasswordBodySchema = z.object({
    oldPassword: z.string(),
    newPassword: z.string(),
});

type ChangePasswordBodyType = z.infer<typeof ChangePasswordBodySchema>;

export class ControllerChangePassword {

    private moduleName = "ControllerChangePassword";

    constructor(private readonly txService: TxServiceChangePassword,
                private readonly extractor: UserIdExtractor) {}

    static create(txService: TxServiceChangePassword, extractor: UserIdExtractor) {
        return new ControllerChangePassword(txService, extractor);
    }

    changePasswordCont =
        async (req: Request<{}, {}, ChangePasswordBodyType>, res: Response) => {
            const id = this.extractor.extractUserId(req, this.moduleName);
            const { oldPassword, newPassword } = req.body;

            await this.txService.changePasswordService(id, oldPassword, newPassword);

            return res.status(200).json({ message: "Password changed successfully." });
        };
}
