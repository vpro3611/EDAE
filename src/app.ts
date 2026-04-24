import {DepsContainer} from "./container";
import express, {Express} from "express";
import cookieParser from "cookie-parser";
import {authMiddleware} from "./modules/middlewares/middleware.auth";

export function createApp(dependencies: DepsContainer): Express {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());


    const publicRouter = express.Router();
    const privateRouter = express.Router();

    app.use("/pub", publicRouter);
    app.use("/protected", privateRouter);

    // using auth middleware for all routes in privateRouter, so that the bearer
    // token is validated before the route handler is called
    privateRouter.use(authMiddleware(dependencies.jwtTokenService));

    publicRouter.get("/health", (req, res) => {
        res.status(200).json({message: "OK"});
    }); //



    return app;
}