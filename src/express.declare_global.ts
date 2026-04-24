import {AccessTokenPayload} from "./modules/authentification/jwt/payload/payloads";


declare global {
    namespace Express {
        interface Request {
            user?: AccessTokenPayload;
        }
    }
}