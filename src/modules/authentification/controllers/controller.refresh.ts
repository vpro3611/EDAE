import { AuthentificationService } from "../auth_service";
import { Request, Response } from "express";
import { getRefreshTokenCookieOptions } from "../cookies";

export class ControllerRefresh {
    constructor(private readonly authService: AuthentificationService) {}

    static create(authService: AuthentificationService) {
        return new ControllerRefresh(authService);
    }

    refreshCont = async (req: Request, res: Response) => {
        const refreshToken: string | undefined = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token is missing." });
        }

        const { user, accessToken, refreshToken: newRefreshToken } = await this.authService.refresh(refreshToken);

        res.cookie("refreshToken", newRefreshToken, getRefreshTokenCookieOptions());

        return res.status(200).json({ accessToken, user });
    };
}
