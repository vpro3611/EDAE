import { ConnectionCredentials } from '../connection.credentials';

export type ConnectionDto = {
    id: string;
    user_id: string;
    provider: string;
    name: string;
    credentials: ConnectionCredentials;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
};
