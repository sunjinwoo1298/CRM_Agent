import axios from "axios";
import type { Request, Response } from "express";
import { Router } from "express";
import { getAccountToken, setAccountToken } from "../store/accountTokens";

export const mergeRouter = Router();

mergeRouter.post("/link-token", async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.MERGE_API_KEY;
    if (!apiKey)
      return res.status(500).json({ error: "MERGE_API_KEY not set" });

    const {
      end_user_origin_id,
      end_user_organization_name,
      end_user_email_address,
    } = req.body ?? {};

    if (!end_user_origin_id) {
      return res
        .status(400)
        .json({ error: "end_user_origin_id is required" });
    }

    const payload = {
      end_user_origin_id,
      end_user_organization_name: end_user_organization_name ?? "Demo Org",
      end_user_email_address: end_user_email_address ?? "demo@example.com",
      categories: ["crm"],
    };

    const linkTokenRes = await axios.post(
      "https://api.merge.dev/api/integrations/create-link-token",
      payload,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    return res.json({ link_token: linkTokenRes.data.link_token });
  } catch (err: any) {
    const message = err?.response?.data ?? err?.message ?? "Unknown error";
    const status = err?.response?.status ?? 500;
    return res.status(status).json({ error: message });
  }
});

mergeRouter.post("/account-token", async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.MERGE_API_KEY;
    if (!apiKey)
      return res.status(500).json({ error: "MERGE_API_KEY not set" });

    const { public_token, end_user_origin_id } = req.body ?? {};
    if (!public_token) {
      return res.status(400).json({ error: "public_token is required" });
    }
    if (!end_user_origin_id) {
      return res
        .status(400)
        .json({ error: "end_user_origin_id is required" });
    }

    const accountTokenRes = await axios.get(
      `https://api.merge.dev/api/integrations/account-token/${public_token}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    const account_token = accountTokenRes.data.account_token as
      | string
      | undefined;
    if (!account_token) {
      return res
        .status(502)
        .json({ error: "Merge did not return account_token" });
    }

    setAccountToken(end_user_origin_id, account_token);

    return res.json({ account_token });
  } catch (err: any) {
    const message = err?.response?.data ?? err?.message ?? "Unknown error";
    const status = err?.response?.status ?? 500;
    return res.status(status).json({ error: message });
  }
});

mergeRouter.get("/account-token", (req: Request, res: Response) => {
  const endUserOriginId = String(req.query.end_user_origin_id ?? "");
  if (!endUserOriginId) {
    return res
      .status(400)
      .json({ error: "end_user_origin_id query param is required" });
  }

  const token = getAccountToken(endUserOriginId);
  return res.json({ account_token: token ?? null });
});
