import {User} from "../entity/user";


export interface UserRepoWriterInterface {
    createUser(user: { name: string, email: string, password_hashed: string | null, last_password: string | null }): Promise<void>;
    updateUser(user: User): Promise<void>;
    deleteUser(id: string): Promise<void>;
    markUserAsVerified(id: string): Promise<void>;
    purgeDeletedUsers(): Promise<number>;
}

export interface UserRepoReaderInterface {
    getUserById(id: string): Promise<User | null>;
    getUserByEmail(email: string): Promise<User | null>;
    getNonDeletedUsers(): Promise<User[]>;
    getVerifiedUsers(): Promise<User[]>;
}