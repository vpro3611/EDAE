import {InfraPasswordHasherInterface} from "./infra.password_hasher.interface";
import * as bcrypt from 'bcrypt';

export class InfraPasswordBcryptImplementation implements InfraPasswordHasherInterface{

    private moduleName = "InfraPasswordBcryptImplementation";

    constructor(private readonly saltRounds: number = 12) {
    }

    static create(saltRounds: number = 12) {
        return new InfraPasswordBcryptImplementation(saltRounds);
    }

    async hash(plain: string): Promise<string> {
        return await bcrypt.hash(plain, this.saltRounds);
    }

    async compare(plain: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(plain, hashedPassword);
    }

}