export type UserDtoForSelf = {
    id: string;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
    is_verified: boolean;
}

export type UserDtoForOthers = Omit<UserDtoForSelf, 'is_verified' | 'email'>;
