import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/errors.global";
import { DatabaseError } from "../errors/errors.database";
import { ZodError } from "zod";
import { LoggerService } from "../infra/observability/logger.service";

export const errorsMiddleware = (logger: LoggerService) => {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
        if (err instanceof ZodError) {
            return res.status(400)
                .json({ message: err.issues.map(issue => issue.message).join(', ') });
        }
        if (err instanceof AppError) {
            logger.error(`AppError: ${err.message}`, err, err.internalError);
            return res.status(err.statusCode)
                .json({ message: err.message, originalMessageError: err.originalErrorMessage });
        }
        if (err instanceof DatabaseError) {
            logger.error(`DatabaseError: ${err.message}`, err);
            return res.status(500)
                .json({ message: 'Internal server error', originalMessageError: err.message });
        }

        logger.error(`Unexpected Error: ${err.message}`, err);
        if (process.env.NODE_ENV === 'production') {
            return res.status(500).json({ message: `Unexpected internal server error` });
        } else {
            return res.status(500).json({
                message: `Unexpected internal server error: ${err.message} | stack: ${err.stack} | cause: ${err.cause}`,
            });
        }
    };
};
