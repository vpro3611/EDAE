import {createDepsContainer} from "../container";
import {createApp} from "../app";
import * as http from "node:http";


export async function startServer(): Promise<void> {
    const dependencies = createDepsContainer();


    const app = createApp(dependencies);

    const server = http.createServer(app);

    const port = process.env.PORT || 3000;

    server.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    })
}