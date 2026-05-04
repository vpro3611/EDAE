import { throwAppError } from '../../errors/errors.global';

export class GithubSourceValidator {
    private static moduleName = 'GithubSourceValidator';

    static validateRepoOwner(repoOwner: string): void {
        const trimmed = repoOwner.trim()
        if (trimmed.length === 0) {
            throwAppError('Repo owner cannot be empty.', 400, `${GithubSourceValidator.moduleName}.validateRepoOwner`);
        }
        if (trimmed.length > 255) {
            throwAppError('Repo owner is too long.', 400, `${GithubSourceValidator.moduleName}.validateRepoOwner`);
        }
    }

    static validateRepoName(repoName: string): void {
        const trimmed = repoName.trim()
        if (trimmed.length === 0) {
            throwAppError('Repo name cannot be empty.', 400, `${GithubSourceValidator.moduleName}.validateRepoName`);
        }
        if (trimmed.length > 255) {
            throwAppError('Repo name is too long.', 400, `${GithubSourceValidator.moduleName}.validateRepoName`);
        }
    }
}
