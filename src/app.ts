import {DepsContainer} from "./container";
import express, {Express} from "express";
import cookieParser from "cookie-parser";

export function createApp(dependencies: DepsContainer): Express {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());


    const publicRouter = express.Router();
    const privateRouter = express.Router();

    app.use("/pub", publicRouter);
    app.use("/protected", privateRouter);

    publicRouter.get("/health", (req, res) => {
        res.status(200).json({message: "OK"});
    }); //


    
    return app;
}