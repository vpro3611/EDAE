import { Request, Response, NextFunction } from "express";
import { errorsMiddleware } from "../../../src/modules/middlewares/middleware.errors";
import { AppError } from "../../../src/modules/errors/errors.global";
import { DatabaseError } from "../../../src/modules/errors/errors.database";
import { ZodError, z } from "zod";

function makeRes() {
    const json = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnValue({ json });
    return { res: { status, json } as unknown as Response, status, json };
}

const handler = errorsMiddleware();
const req = {} as Request;
const next = jest.fn() as NextFunction;

describe("errorsMiddleware", () => {
    describe("ZodError", () => {
        it("responds 400 with joined issue messages", () => {
            const zodErr = z.object({ email: z.string().email(), name: z.string().min(3) })
                .safeParse({ email: "bad", name: "x" });
            const err = (zodErr as any).error as ZodError;
            const { res, status, json } = makeRes();

            handler(err, req, res, next);

            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.any(String) })
            );
        });
    });

    describe("AppError", () => {
        it("responds with the AppError status code and message", () => {
            const err = new AppError("Not found.", 404, "SomeModule.fn()");
            const { res, status, json } = makeRes();

            handler(err, req, res, next);

            expect(status).toHaveBeenCalledWith(404);
            expect(json).toHaveBeenCalledWith(
                expect.objectContaining({ message: "Not found." })
            );
        });

        it("includes originalMessageError when present", () => {
            const err = new AppError("Conflict.", 409, "Module.fn()", "unique constraint");
            const { res, status, json } = makeRes();

            handler(err, req, res, next);

            expect(json).toHaveBeenCalledWith(
                expect.objectContaining({ originalMessageError: "unique constraint" })
            );
        });
    });

    describe("DatabaseError", () => {
        it("responds 500 with generic message and original error detail", () => {
            const err = new DatabaseError("db exploded", 500, "Repo.fn()");
            const { res, status, json } = makeRes();

            handler(err, req, res, next);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith(
                expect.objectContaining({ message: "Internal server error" })
            );
        });
    });

    describe("unknown Error", () => {
        it("responds 500 with unexpected internal server error message", () => {
            const err = new Error("something went very wrong");
            const { res, status, json } = makeRes();

            handler(err, req, res, next);

            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledWith({ message: "Unexpected internal server error" });
        });
    });
});
