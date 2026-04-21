
export class DatabaseError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public internalError: string,
        public originalErrorMessage?: string
    ) {
        super(message);
    }
}

export function throwDatabaseError(
    message: string,
    statusCode: number,
    context: string,
    originalErrorMessage?: string
): never {
    throw new DatabaseError(message, statusCode, context, originalErrorMessage);
}