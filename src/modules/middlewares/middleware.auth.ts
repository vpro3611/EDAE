import {JwtTokenServiceInterface} from "../authentification/jwt/interfaces/jwt.token_service.interface";
import {NextFunction, Request, Response} from "express";



export const authMiddleware = (jwtTokenService: JwtTokenServiceInterface) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({message: 'Authorization header is missing'});
        }

        const [type, token] = authHeader.split(' ');
        if (type !== 'Bearer' || !token) {
            return res.status(401).json({message: 'Invalid authorization header format'});
        }

        try {
            const payload = jwtTokenService.verifyAccessToken(token);
            req.user = payload;
            next();
        } catch (error) {
            return res.status(401).json({message: 'Invalid token'});
        }
    }
}