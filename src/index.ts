import dotenv from 'dotenv';
import {startServer} from "./server";

dotenv.config();

async function main() {
    await startServer();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
})
