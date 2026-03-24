import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GET_JOURNEYS } from '../graphql/queries';

const statusLabels: Record<string, string> = {
  in_progress: 'En curso',
  completed: 'Completado',
  failed: 'Fallido',
};

const statusColors: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export function Journeys() {
  const [page, setPage] = useState(1);
  const { data, loading, error } = useQuery<any>(GET_JOURNEYS, {
    variables: { pagination: { page, pageSize: 20 } },
  });

  if (loading) return <div className="text-slate-500">Cargando trayectos...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  const { items, pageInfo } = data.journeys;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Trayectos</h1>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Sistema</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Inicio</th>
              <th className="px-4 py-3 font-medium">Fin</th>
              <th className="px-4 py-3 font-medium">Alertas</th>
            </tr>
          </thead>
          <tbody>
            {items.map((j: any) => (
              <tr key={j.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/journeys/${j.id}`} className="text-slate-900 font-medium hover:underline">
                    {j.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{j.system.code}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[j.status]}`}>
                    {statusLabels[j.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(j.startedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {j.endedAt ? new Date(j.endedAt).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td className="px-4 py-3">
                  <AlertBadges counts={j.alertCount} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pageInfo.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <span className="text-sm text-slate-500">{pageInfo.totalCount} trayectos</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">Anterior</button>
              <span className="px-3 py-1 text-sm">{page} / {pageInfo.totalPages}</span>
              <button disabled={page >= pageInfo.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertBadges({ counts }: { counts: { warning: number; alert: number; critical: number } }) {
  return (
    <div className="flex gap-1">
      {counts.critical > 0 && <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded">{counts.critical}C</span>}
      {counts.alert > 0 && <span className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded">{counts.alert}A</span>}
      {counts.warning > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded">{counts.warning}W</span>}
      {counts.critical === 0 && counts.alert === 0 && counts.warning === 0 && <span className="text-slate-400 text-xs">—</span>}
    </div>
  );
}
