import { AuthentificationService } from "../auth_service";
import { Request, Response } from "express";
import { z } from "zod";
import { REFRESH_TOKEN_EXPIRATION_TIME_FOR_DATABASE } from "../jwt/jwt.config";

export const LoginEmailRequestBodySchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

type LoginEmailRequestBodySchemaType = z.infer<typeof LoginEmailRequestBodySchema>;

export class ControllerLoginEmail {
    constructor(private readonly authService: AuthentificationService) {}

    static create(authService: AuthentificationService) {
        return new ControllerLoginEmail(authService);
    }

    loginEmailCont =
        async (req: Request<{}, {}, LoginEmailRequestBodySchemaType>, res: Response) => {
            const { email, password } = req.body;

            const { loggedUser, accessToken, refreshToken } = await this.authService.loginEmail(email, password);

            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: REFRESH_TOKEN_EXPIRATION_TIME_FOR_DATABASE,
            });

            return res.status(200).json({ accessToken, user: loggedUser });
        };
}
