import {AuthentificationService} from "../auth_service";
import {Request, Response} from "express";
import {z} from "zod";
import {REFRESH_TOKEN_EXPIRATION_TIME_FOR_DATABASE} from "../jwt/jwt.config";


export const RegisterConfirmRequestBodySchema = z.object({
    email: z.string().email(),
    otp: z.string(),
});

type RegisterConfirmRequestBodySchemaType = z.infer<typeof RegisterConfirmRequestBodySchema>;

export class ControllerRegisterConfirm {
    constructor(private readonly authService: AuthentificationService) {
    }

    static create(authService: AuthentificationService) {
        return new ControllerRegisterConfirm(authService);
    }

    registerConfirmCont =
        async (req: Request<{},{}, RegisterConfirmRequestBodySchemaType>, res: Response) => {
            const {email, otp} = req.body;

            const result = await this.authService.registerConfirm(email, otp);

            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: REFRESH_TOKEN_EXPIRATION_TIME_FOR_DATABASE,
            });

            return res.status(200).json({user: result.user, accessToken: result.accessToken});
        }
}