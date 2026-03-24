import { useQuery } from '@apollo/client/react';
import { GET_INSPECTION_SYSTEMS } from '../graphql/queries';

export function Systems() {
  const { data, loading, error } = useQuery(GET_INSPECTION_SYSTEMS);

  if (loading) return <div className="text-slate-500">Cargando sistemas...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Sistemas de inspeccion</h1>

      <div className="grid grid-cols-2 gap-4">
        {data.inspectionSystems.map((sys: any) => (
          <div key={sys.id} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-900">{sys.name}</h3>
                <span className="font-mono text-xs text-slate-500">{sys.code}</span>
              </div>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                sys.connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
                sys.connectionStatus === 'disconnected' ? 'bg-slate-100 text-slate-500' :
                'bg-red-100 text-red-700'
              }`}>
                {sys.connectionStatus}
              </span>
            </div>
            {sys.lastSeenAt && (
              <p className="text-xs text-slate-500">
                Ultimo contacto: {new Date(sys.lastSeenAt).toLocaleString('es-ES')}
              </p>
            )}
            {sys.sensorsConfig?.sensors && (
              <div className="mt-2 flex flex-wrap gap-1">
                {sys.sensorsConfig.sensors.map((s: string) => (
                  <span key={s} className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded">{s}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
