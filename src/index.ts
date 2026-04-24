import dotenv from 'dotenv';
import {startServer} from "./modules/server";

dotenv.config();

async function main() {
    await startServer();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
})
