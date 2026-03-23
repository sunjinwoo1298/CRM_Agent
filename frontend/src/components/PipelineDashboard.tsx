import { useCallback, useMemo, useState } from "react";
import { useMergeLink } from "@mergeapi/react-merge-link";
import { api } from "../api";
import type { PipelineAnalysisReport } from "../contracts/report";

export function PipelineDashboard() {
  const [endUserOriginId, setEndUserOriginId] = useState("demo-user-1");
  const [linkToken, setLinkToken] = useState<string>("");
  const [accountToken, setAccountToken] = useState<string | null>(null);
  const [report, setReport] = useState<PipelineAnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const createLinkToken = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post("/api/merge/link-token", {
        end_user_origin_id: endUserOriginId,
        end_user_organization_name: "Demo Org",
        end_user_email_address: "demo@example.com",
      });
      setLinkToken(res.data.link_token);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to create link token");
    } finally {
      setBusy(false);
    }
  }, [endUserOriginId]);

  const onSuccess = useCallback(
    async (public_token: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await api.post("/api/merge/account-token", {
          public_token,
          end_user_origin_id: endUserOriginId,
        });
        setAccountToken(res.data.account_token);
      } catch (e: any) {
        setError(e?.response?.data?.error ?? e?.message ?? "Failed to exchange account token");
      } finally {
        setBusy(false);
      }
    },
    [endUserOriginId]
  );

  const { open, isReady } = useMergeLink(
    useMemo(
      () => ({
        linkToken,
        onSuccess,
      }),
      [linkToken, onSuccess]
    )
  );

  const analyze = useCallback(async () => {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const res = await api.post<PipelineAnalysisReport>("/api/analyze-pipeline", {
        end_user_origin_id: endUserOriginId,
      });
      setReport(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to analyze pipeline");
    } finally {
      setBusy(false);
    }
  }, [endUserOriginId]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Pipeline Dashboard</h1>
          <p className="text-sm text-gray-600">
            Connect HubSpot via Merge Link, then analyze normalized deals.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <label className="block text-sm font-medium text-gray-700">End user origin id</label>
          <input
            value={endUserOriginId}
            onChange={(e) => setEndUserOriginId(e.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. customer-123"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={createLinkToken}
              disabled={busy}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              1) Get link token
            </button>
            <button
              onClick={open}
              disabled={!isReady || !linkToken || busy}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              2) Connect HubSpot
            </button>
            <button
              onClick={analyze}
              disabled={!accountToken || busy}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              3) Analyze pipeline
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-600">
            <div>Link token: {linkToken ? "ready" : "not created"}</div>
            <div>Account token: {accountToken ? "stored (in-memory)" : "not stored"}</div>
          </div>

          {error ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}
        </div>

        {report ? (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Risk Signals</h2>
              <div className="text-sm text-gray-600">
                High risk: {report.summary.high_risk_count} / {report.summary.total_deals}
              </div>
            </div>

            {report.high_risk_deals.length === 0 ? (
              <div className="mt-4 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                No high-risk deals detected.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {report.high_risk_deals.map((d) => (
                  <div
                    key={d.deal_id}
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm font-semibold text-red-900">
                        {d.deal_name || d.deal_id}
                      </div>
                      <div className="text-xs text-red-900/80">
                        Stage: {d.stage ?? "—"} · Amount: {d.amount ?? "—"}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-red-900">
                      <div className="font-medium">Signals</div>
                      <ul className="mt-1 list-disc pl-5">
                        {d.signals.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
