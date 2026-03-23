import type { Deal } from "../contracts/deal";

export interface CrmProvider {
  listDeals(params: { accountToken: string }): Promise<Deal[]>;
}
