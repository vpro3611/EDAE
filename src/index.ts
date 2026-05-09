import dotenv from 'dotenv';
import {startServer} from "./server";
import {checkEnvVars, envVars} from "./check_env_vars";

dotenv.config();

async function main() {
    checkEnvVars(envVars);
    await startServer();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
})
