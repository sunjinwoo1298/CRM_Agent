import axios from "axios";
import type { Request, Response } from "express";
import { Router } from "express";
import { CrmManager } from "../crm/CrmManager";
import { MergeProvider } from "../crm/providers/MergeProvider";
import { getAccountToken } from "../store/accountTokens";

export const analyzeRouter = Router();

function buildCrmManager() {
  const mergeApiKey = process.env.MERGE_API_KEY;
  if (!mergeApiKey) throw new Error("MERGE_API_KEY not set");

  return new CrmManager({
    merge: new MergeProvider({ apiKey: mergeApiKey }),
  });
}

analyzeRouter.post("/analyze-pipeline", async (req: Request, res: Response) => {
  try {
    const { end_user_origin_id } = req.body ?? {};
    if (!end_user_origin_id) {
      return res
        .status(400)
        .json({ error: "end_user_origin_id is required" });
    }

    const accountToken = getAccountToken(end_user_origin_id);
    if (!accountToken) {
      return res.status(400).json({
        error:
          "No account_token stored for this end_user_origin_id. Connect CRM via Merge Link first.",
      });
    }

    const providerName = process.env.CRM_PROVIDER ?? "merge";
    const crm = buildCrmManager().getProvider(providerName);
    const deals = await crm.listDeals({ accountToken });

    const agentBaseUrl = process.env.AGENT_BASE_URL ?? "http://localhost:8000";
    const agentRes = await axios.post(`${agentBaseUrl}/agent/analyze`, deals, {
      headers: { "Content-Type": "application/json" },
    });

    return res.json(agentRes.data);
  } catch (err: any) {
    const message = err?.response?.data ?? err?.message ?? "Unknown error";
    const status = err?.response?.status ?? 500;
    return res.status(status).json({ error: message });
  }
});
