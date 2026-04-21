import { throwDatabaseError } from './errors.database';

export function handleDatabaseError(err: any, context: string): never {
    const pgCode = err.code || 'ERR_UNKNOWN';
    let message = err.message || 'An unexpected database error occurred.';
    let statusCode = 500;

    switch (pgCode) {
        case '23505': {
            const match = err.detail?.match(/Key \((.*?)\)=/);
            const field = match ? match[1] : 'field';
            message = `The ${field} already exists.`;
            statusCode = 409;
            break;
        }
        case '23503': {
            const match = err.detail?.match(/Key \((.*?)\)=/);
            const field = match ? match[1] : 'field';
            message = `The referenced ${field} does not exist.`;
            statusCode = 404;
            break;
        }
        case '23502': {
            const field = err.column || 'field';
            message = `The ${field} is required.`;
            statusCode = 400;
            break;
        }
        case '42703': {
            message = 'Technical error: Invalid data structure.';
            statusCode = 500;
            break;
        }
    }

    throwDatabaseError(message, statusCode, context, err.message);
}
