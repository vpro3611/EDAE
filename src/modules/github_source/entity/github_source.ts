import { GithubSourceValidator } from './github_source.validator';
import { throwAppError } from '../../errors/errors.global';

export class GithubSource {
    private moduleName = 'GithubSourceDomain';

    constructor(
        public id: string,
        public user_id: string,
        public repo_owner: string,
        public repo_name: string,
        public access_token: string | null,
        public created_at: Date,
        public updated_at: Date,
    ) {}

    static createForDatabase(
        userId: string,
        repoOwner: string,
        repoName: string,
        accessToken: string | null,
    ): { user_id: string; repo_owner: string; repo_name: string; access_token: string | null } {
        GithubSourceValidator.validateRepoOwner(repoOwner);
        GithubSourceValidator.validateRepoName(repoName);
        return { user_id: userId, repo_owner: repoOwner, repo_name: repoName, access_token: accessToken };
    }

    static restore(
        id: string,
        user_id: string,
        repo_owner: string,
        repo_name: string,
        access_token: string | null,
        created_at: Date,
        updated_at: Date,
    ): GithubSource {
        GithubSourceValidator.validateRepoOwner(repo_owner);
        GithubSourceValidator.validateRepoName(repo_name);
        return new GithubSource(id, user_id, repo_owner, repo_name, access_token, created_at, updated_at);
    }

    ensureOwnership(actorId: string, op: string): void {
        if (this.user_id !== actorId) {
            throwAppError('Forbidden.', 403, `${this.moduleName}.${op}`);
        }
    }
}
