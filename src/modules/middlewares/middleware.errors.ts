import {NextFunction, Request, Response} from "express";
import {AppError} from "../errors/errors.global";
import {DatabaseError} from "../errors/errors.database";
import {ZodError} from "zod";


export const errorsMiddleware = () => {
    return (err: Error, req: Request, res: Response, next: NextFunction)=> {
        if (err instanceof ZodError) {
            return res.status(400)
                .json({message: err.issues.map(issue => issue.message).join(', ')});
        }
        if (err instanceof AppError) {
            return res.status(err.statusCode)
                .json({message: err.message, originalMessageError: err.originalErrorMessage});

        }
        if (err instanceof DatabaseError) {
            return res.status(500)
                .json({message: 'Internal server error', originalMessageError: err.message});
        }

        return res.status(500).json({message: 'Unexpected internal server error'});
    }
}