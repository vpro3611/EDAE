import {TxServiceGetOtherProfileService} from "../transactional_services/tx_service.get_other_profile";
import {UserIdExtractor} from "../../authentification/extractor.extract_user_id";
import {Request, Response} from "express";
import {z} from "zod";

export const GetOtherProfileParamsSchema = z.object({
    targetId: z.string(),
})

type GetOtherProfileParamsType = z.infer<typeof GetOtherProfileParamsSchema>;

export class ControllerGetOtherProfile {

    private moduleName = "ControllerGetOtherProfile";

    constructor(private readonly txService: TxServiceGetOtherProfileService,
                private readonly extractor: UserIdExtractor) {
    }

    static create(txService: TxServiceGetOtherProfileService, extractor: UserIdExtractor) {
        return new ControllerGetOtherProfile(txService, extractor);
    }

    getOtherProfileCont =
        async (req: Request<GetOtherProfileParamsType>, res: Response) => {
            const id = this.extractor.extractUserId(req, this.moduleName);

            const { targetId } = req.params;

            const result = await this.txService.getOtherProfileService(id, targetId);

            return res.status(200).json(result);
    }
}