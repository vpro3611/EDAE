import {AuthentificationService} from "../auth_service";
import {Request, Response} from "express";
import {z} from "zod";


export const RegisterRequestBodySchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string(),
});


type RegisterRequestBodySchemaType = z.infer<typeof RegisterRequestBodySchema>;

export class RegisterRequestController {
    constructor(private readonly authService: AuthentificationService) {
    }

    static create(authService: AuthentificationService) {
        return new RegisterRequestController(authService);
    }

    registerRequestCont =
        async (req: Request<{}, {}, RegisterRequestBodySchemaType>, res: Response) => {
            const {name, email, password} = req.body;

            await this.authService.registerRequest(name, email, password);

            return res.status(201).send({"status": "successfully created, waiting for email confirmation"})
        }
}