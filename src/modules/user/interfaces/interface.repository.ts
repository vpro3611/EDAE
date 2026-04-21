import {User} from "../entity/user";


export interface UserRepoWriterInterface {
    createUser(name: string, email: string, password: string): Promise<void>;
    updateUser(id: string, name: string, email: string, password: string): Promise<void>;
    deleteUser(id: string): Promise<void>;
}

export interface UserRepoReaderInterface {
    getUserById(id: string): Promise<User>;
    getUserByEmail(email: string): Promise<User>;
    getNonDeletedUsers(): Promise<User[]>;
}