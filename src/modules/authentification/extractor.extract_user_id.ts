import { Request } from "express";
import {throwAppError} from "../errors/errors.global";

export class UserIdExtractor {
    private moduleName = "UserIdExtractor";

    static create(): UserIdExtractor {
        return new UserIdExtractor();
    }

    extractUserId(req: Request, calledInModule: string): string {
        if (!req.user) {
            throwAppError(
                "User not found.",
                401,
                `${this.moduleName}.extractUserId()`,
                calledInModule
            );
        }
        return req.user.sub;
    }
}