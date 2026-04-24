import { Request, Response } from "express";
import { TxServiceRequestAccountDeletion } from "../transactional_services/tx_service.request_account_deletion";
import { UserIdExtractor } from "../../authentification/extractor.extract_user_id";

export class ControllerRequestAccountDeletion {

    private moduleName = "ControllerRequestAccountDeletion";

    constructor(private readonly txService: TxServiceRequestAccountDeletion,
                private readonly extractor: UserIdExtractor) {}

    static create(txService: TxServiceRequestAccountDeletion, extractor: UserIdExtractor) {
        return new ControllerRequestAccountDeletion(txService, extractor);
    }

    requestAccountDeletionCont = async (req: Request, res: Response) => {
        const id = this.extractor.extractUserId(req, this.moduleName);

        await this.txService.requestAccountDeletionService(id);

        return res.status(200).json({ message: "Account deletion requested. Check your inbox for a verification code." });
    };
}
