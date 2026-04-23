import {JwtTokenDto} from "../dto/jwt.token.dto";


export interface JwtRefreshTokenRepositoryInterface {
    create(data: {userId: string, tokenHash: string, expiresAt: Date}): Promise<void>
    findValidByHash(tokenHash: string): Promise<JwtTokenDto | null>
    revokeByHash(tokenHash: string): Promise<void>
    revokeById(id: string): Promise<void>
}