import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export const validateBody = <T>(schema: ZodSchema<T>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = schema.parse(req.body);
            return next();
        } catch (error) {
            return next(error);
        }
    };
};

export const validateParams = <T>(schema: ZodSchema<T>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.params = schema.parse(req.params) as Record<string, string>;
            return next();
        } catch (error) {
            return next(error);
        }
    };
};
