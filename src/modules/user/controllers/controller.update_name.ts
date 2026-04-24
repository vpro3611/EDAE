import { Request, Response } from "express";
import { z } from "zod";
import { TxServiceUpdateName } from "../transactional_services/tx_service.update_name";
import { UserIdExtractor } from "../../authentification/extractor.extract_user_id";

export const UpdateNameBodySchema = z.object({
    name: z.string(),
});

type UpdateNameBodyType = z.infer<typeof UpdateNameBodySchema>;

export class ControllerUpdateName {

    private moduleName = "ControllerUpdateName";

    constructor(private readonly txService: TxServiceUpdateName,
                private readonly extractor: UserIdExtractor,) {}

    static create(txService: TxServiceUpdateName, extractor: UserIdExtractor) {
        return new ControllerUpdateName(txService, extractor);
    }

    updateNameCont =
        async (req: Request<{}, {}, UpdateNameBodyType>, res: Response) => {
            const id = this.extractor.extractUserId(req, this.moduleName);
            const { name } = req.body;

            const user = await this.txService.updateNameService(id, name);

            return res.status(200).json({ user });
        };
}
