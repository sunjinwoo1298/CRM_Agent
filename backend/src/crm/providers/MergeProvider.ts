import axios from "axios";
import type { Deal } from "../../contracts/deal";
import type { CrmProvider } from "../CrmProvider";

type MergeDeal = {
  id: string;
  name: string | null;
  amount: number | null;
  stage: string | null;
  last_activity_at?: string | null;
};

type MergeListResponse<T> = {
  next: string | null;
  previous: string | null;
  results: T[];
};

export class MergeProvider implements CrmProvider {
  constructor(private opts: { apiKey: string }) {}

  async listDeals(params: { accountToken: string }): Promise<Deal[]> {
    const res = await axios.get<MergeListResponse<MergeDeal>>(
      "https://api.merge.dev/api/crm/v1/deals",
      {
        headers: {
          Authorization: `Bearer ${this.opts.apiKey}`,
          "X-Account-Token": params.accountToken,
        },
      }
    );

    return res.data.results.map((d) => ({
      id: d.id,
      name: d.name ?? "",
      amount: d.amount ?? null,
      stage: d.stage ?? null,
      last_activity: d.last_activity_at ?? null,
    }));
  }
}
