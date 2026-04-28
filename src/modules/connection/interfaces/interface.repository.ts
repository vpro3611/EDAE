import { Connection } from '../entity/connection';
import { ConnectionCredentials } from '../connection.credentials';

export interface ConnectionRepoReaderInterface {
    getConnectionById(id: string): Promise<Connection | null>;
    getActiveConnectionsByUserId(userId: string): Promise<Connection[]>;
    getDeletedConnectionsByUserId(userId: string): Promise<Connection[]>;
}

export interface ConnectionRepoWriterInterface {
    createConnection(data: {
        user_id: string;
        provider: string;
        name: string;
        credentials: ConnectionCredentials;
    }): Promise<Connection>;
    updateConnection(connection: Connection): Promise<void>;
    softDeleteConnection(id: string): Promise<void>;
    restoreConnection(id: string): Promise<void>;
}
