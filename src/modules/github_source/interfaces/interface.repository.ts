import { GithubSource } from '../entity/github_source';

export interface GithubSourceRepoReaderInterface {
    getSourceById(id: string): Promise<GithubSource | null>;
    getSourcesByUserId(userId: string): Promise<GithubSource[]>;
}

export interface GithubSourceRepoWriterInterface {
    createSource(data: {
        user_id: string;
        repo_owner: string;
        repo_name: string;
        access_token: string | null;
    }): Promise<GithubSource>;
    deleteSource(id: string): Promise<void>;
}
