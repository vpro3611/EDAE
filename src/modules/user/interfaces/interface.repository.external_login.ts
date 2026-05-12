export interface ExternalLoginRepoInterface {
  findByProviderAndExternalId(provider: string, externalId: string): Promise<string | null>;
  create(userId: string, provider: string, externalId: string): Promise<void>;
}
