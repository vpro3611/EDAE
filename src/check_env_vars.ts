
// update this file with your environment variables, and whenever you add
//  a new.env variable.
export const envVars: Record<string, (string | undefined)> = {
    DATABASE_URL: process.env.DATABASE_URL,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    APP_NAME: process.env.APP_NAME,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    API_URL: process.env.API_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    GITHUB_POLL_INTERVAL_MS: process.env.GITHUB_POLL_INTERVAL_MS,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
}

export function checkEnvVars(envVars: Record<string, (string | undefined)>): void {
    for (const [key, value] of Object.entries(envVars)) {
        if (!value) {
            console.error(`Missing environment variable: ${key}`);
            throw new Error(`Missing environment variable: ${key} with its value being set to: ${value}`);
        }
    }
}