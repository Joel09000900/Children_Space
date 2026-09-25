import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { api } from "../api/client";
import type { AdminStats } from "../api/types";
import { useAuth } from "../context/AuthContext";
import ChartCard from "../components/charts/ChartCard";
import TimeSeriesChart from "../components/charts/TimeSeriesChart";

const RANGES = [7, 30, 90];

const fmt = (n: number) => n.toLocaleString("fr-FR");
const plural = (n: number, word: string) => `${fmt(n)} ${word}${n > 1 ? "s" : ""}`;
const dayLabel = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fullDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function AdminPage() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="state state--page">Chargement…</p>;
  // La destination est transmise à la page de connexion, qui y ramènera après login
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  if (user.role !== "ADMIN") {
    return (
      <section className="not-found">
        <p className="eyebrow eyebrow--wide">Accès refusé</p>
        <h1 className="page-title">Espace réservé</h1>
        <p className="lead">Cette page est réservée à l'administrateur du site.</p>
        <Link className="btn btn--primary" to="/">Retour à la galerie</Link>
      </section>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setRefreshing(true);
    api
      .adminStats(days, ctrl.signal)
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((err: Error) => {
        if (!ctrl.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setRefreshing(false);
      });
    return () => ctrl.abort();
  }, [days]);

  return (
    <section className="admin">
      <header>
        <p className="eyebrow eyebrow--wide">Administration</p>
        <h1 className="admin__title">Inscriptions</h1>
        <p className="admin__lead">Comptes membres créés sur le site.</p>
      </header>

      <div className="admin__filters" role="group" aria-label="Période">
        {RANGES.map((r) => (
          <button key={r} type="button" className={`chip ${r === days ? "chip--active" : ""}`} aria-pressed={r === days} onClick={() => setDays(r)}>
            {r} jours
          </button>
        ))}
      </div>

      {error && <p className="state state--error">{error}</p>}
      {!stats && !error && <p className="state">Chargement des statistiques…</p>}
      {stats && <StatsView stats={stats} refreshing={refreshing} />}
    </section>
  );
}

function StatsView({ stats, refreshing }: { stats: AdminStats; refreshing: boolean }) {
  const delta = stats.periodSignups - stats.previousPeriodSignups;
  const signups = stats.series.map((p) => ({ date: p.date, value: p.signups }));
  const members = stats.series.map((p) => ({ date: p.date, value: p.members }));

  return (
    // Pendant un rechargement, l'affichage précédent reste en place, atténué
    <div className={`admin__body${refreshing ? " admin__body--refreshing" : ""}`} aria-busy={refreshing}>
      <div className="admin__tiles">
        <div className="stat-tile stat-tile--hero">
          <p className="stat-tile__label">Membres inscrits</p>
          <p className="stat-tile__value">{fmt(stats.totalMembers)}</p>
        </div>
        <div className="stat-tile">
          <p className="stat-tile__label">Nouvelles inscriptions</p>
          <p className="stat-tile__value">{fmt(stats.periodSignups)}</p>
          <p className={`stat-tile__delta${delta > 0 ? " stat-tile__delta--up" : delta < 0 ? " stat-tile__delta--down" : ""}`}>
            {delta > 0 ? `▲ +${fmt(delta)}` : delta < 0 ? `▼ −${fmt(-delta)}` : "Stable"} par rapport aux {stats.days} jours précédents
          </p>
        </div>
        <div className="stat-tile">
          <p className="stat-tile__label">Moyenne par jour</p>
          <p className="stat-tile__value">{(stats.periodSignups / stats.days).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</p>
        </div>
      </div>

      <ChartCard
        title="Nouvelles inscriptions par jour"
        subtitle={`${stats.days} derniers jours`}
        columns={["Jour", "Inscriptions"]}
        rows={signups.map((p) => [dayLabel(p.date), fmt(p.value)])}
      >
        <TimeSeriesChart
          kind="column"
          points={signups}
          label="Nouvelles inscriptions par jour"
          formatValue={(v) => plural(v, "inscription")}
          emptyLabel="Aucune inscription sur la période"
        />
      </ChartCard>

      <ChartCard
        title="Total des membres"
        subtitle="Cumul en fin de journée"
        columns={["Jour", "Membres"]}
        rows={members.map((p) => [dayLabel(p.date), fmt(p.value)])}
      >
        <TimeSeriesChart kind="line" points={members} label="Total des membres" formatValue={(v) => plural(v, "membre")} />
      </ChartCard>

      <section className="chart-card admin__wide" aria-labelledby="latest-members">
        <h2 id="latest-members" className="chart-card__title">Derniers inscrits</h2>
        {stats.latest.length === 0 ? (
          <p className="admin__empty">Aucun membre inscrit pour l'instant.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Membre</th>
                  <th scope="col" className="num">Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                {stats.latest.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="member__name">{u.name}</span>
                      <span className="member__email">{u.email}</span>
                    </td>
                    <td className="num">{fullDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
