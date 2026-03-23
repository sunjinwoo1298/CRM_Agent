import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-14">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">CRM Agent</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          Unified HubSpot Intelligence Dashboard
        </h1>
        <p className="mt-5 max-w-2xl text-sm text-slate-300 sm:text-base">
          Connect HubSpot, pull your normalized CRM data, and run risk analysis in one place.
          Use the dedicated dashboard route to keep the landing experience focused.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            to="/hubspot-dashboard"
            className="rounded-md bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Open Unified Dashboard
          </Link>
          <a
            href="/health"
            className="rounded-md border border-slate-700 px-5 py-3 text-sm text-slate-200 transition hover:border-slate-500"
          >
            Backend Health
          </a>
        </div>
      </div>
    </div>
  );
}
