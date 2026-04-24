import {TxServiceGetSelfProfile} from "../transactional_services/tx_service.get_self_profile";
import {UserIdExtractor} from "../../authentification/extractor.extract_user_id";
import {Request, Response} from "express";

export class ControllerGetSelfProfile {

    private moduleName = "ControllerGetSelfProfile";

    constructor(private readonly txService: TxServiceGetSelfProfile,
                private readonly extractor: UserIdExtractor) {
    }

    static create(txService: TxServiceGetSelfProfile, extractor: UserIdExtractor) {
        return new ControllerGetSelfProfile(txService, extractor);
    }

    getSelfProfileCont = async (req: Request, res: Response) => {
        const id = this.extractor.extractUserId(req, this.moduleName);

        const result = await this.txService.getSelfProfileService(id);

        return res.status(200).json(result);
    }
}