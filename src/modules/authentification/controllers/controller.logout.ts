import { AuthentificationService } from "../auth_service";
import { Request, Response } from "express";

export class ControllerLogout {
    constructor(private readonly authService: AuthentificationService) {}

    static create(authService: AuthentificationService) {
        return new ControllerLogout(authService);
    }

    logoutCont = async (req: Request, res: Response) => {
        const refreshToken: string | undefined = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token is missing." });
        }

        await this.authService.logout(refreshToken);

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });

        return res.status(200).json({ message: "Logged out successfully." });
    };
}
