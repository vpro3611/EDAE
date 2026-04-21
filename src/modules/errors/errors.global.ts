export class AppError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public internalError: string,
        public originalErrorMessage?: string
    ) {
        super(message);
    }
}

export function throwAppError(
    message: string,
    statusCode: number,
    context: string,
    originalErrorMessage?: string
): never {
    throw new AppError(message, statusCode, context, originalErrorMessage);
}