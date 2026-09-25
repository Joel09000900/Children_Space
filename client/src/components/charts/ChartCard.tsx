import { useId, useState, type ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** En-têtes et lignes de la vue tableau (équivalent accessible du graphique) */
  columns: [string, string];
  rows: string[][];
  children: ReactNode;
}

export default function ChartCard({ title, subtitle, columns, rows, children }: ChartCardProps) {
  const id = useId();
  const [showTable, setShowTable] = useState(false);

  return (
    <section className="chart-card" aria-labelledby={id}>
      <div className="chart-card__head">
        <div>
          <h2 id={id} className="chart-card__title">{title}</h2>
          {subtitle && <p className="chart-card__subtitle">{subtitle}</p>}
        </div>
        <button type="button" className="btn btn--ghost btn--sm" aria-pressed={showTable} onClick={() => setShowTable((v) => !v)}>
          {showTable ? "Voir le graphique" : "Voir le tableau"}
        </button>
      </div>

      {showTable ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{columns[0]}</th>
                <th scope="col" className="num">{columns[1]}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([name, value]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td className="num">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
