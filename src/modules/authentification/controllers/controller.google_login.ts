import { AuthentificationService } from "../auth_service";
import { Request, Response } from "express";
import { z } from "zod";
import { REFRESH_TOKEN_EXPIRATION_TIME_FOR_DATABASE } from "../jwt/jwt.config";

export const GoogleLoginBodySchema = z.object({
  code: z.string(),
});

type GoogleLoginBodySchemaType = z.infer<typeof GoogleLoginBodySchema>;

export class ControllerGoogleLogin {
  constructor(private readonly authService: AuthentificationService) {}

  static create(authService: AuthentificationService) {
    return new ControllerGoogleLogin(authService);
  }

  googleLoginCont = async (req: Request<{}, {}, GoogleLoginBodySchemaType>, res: Response) => {
    const { code } = req.body;
    const { loggedUser, accessToken, refreshToken } = await this.authService.loginGoogle(code);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: REFRESH_TOKEN_EXPIRATION_TIME_FOR_DATABASE,
    });
    return res.status(200).json({ accessToken, user: loggedUser });
  };
}
