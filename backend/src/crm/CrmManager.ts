import type { CrmProvider } from "./CrmProvider";

export class CrmManager {
  private providers: Record<string, CrmProvider>;

  constructor(providers: Record<string, CrmProvider>) {
    this.providers = providers;
  }

  getProvider(name: string): CrmProvider {
    const provider = this.providers[name];
    if (!provider) {
      throw new Error(`Unknown CRM provider: ${name}`);
    }
    return provider;
  }
}
