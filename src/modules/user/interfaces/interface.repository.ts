import {User} from "../entity/user";


export interface UserRepoWriterInterface {
    createUser(user: { name: string, email: string, password_hashed: string, last_password: string }): Promise<void>;
    updateUser(user: User): Promise<void>;
    deleteUser(id: string): Promise<void>;
    markUserAsVerified(id: string): Promise<void>;
}

export interface UserRepoReaderInterface {
    getUserById(id: string): Promise<User | null>;
    getUserByEmail(email: string): Promise<User | null>;
    getNonDeletedUsers(): Promise<User[]>;
    getVerifiedUsers(): Promise<User[]>;
}