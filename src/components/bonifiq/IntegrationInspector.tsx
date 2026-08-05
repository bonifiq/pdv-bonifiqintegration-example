import { useEffect, useState } from 'react'
import { bonifiqConfig } from '../../bonifiq/config'
import { clearIntegrationTrace, subscribeToIntegrationTrace, traceAsCurl, type IntegrationTraceEvent } from '../../bonifiq/trace'

interface Props { open: boolean; onClose: () => void }

export function IntegrationInspector({ open, onClose }: Props) {
  const [events, setEvents] = useState<IntegrationTraceEvent[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  useEffect(() => subscribeToIntegrationTrace(setEvents), [])
  if (!open) return null
  const copyCurl = async (event: IntegrationTraceEvent) => {
    await navigator.clipboard.writeText(traceAsCurl(event, bonifiqConfig.apiBaseUrl))
    setCopied(event.id)
    window.setTimeout(() => setCopied(null), 1500)
  }
  return <div className="inspector-overlay" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <aside className="integration-inspector" role="dialog" aria-modal="true" aria-labelledby="inspector-title">
      <header><div><span className="panel-eyebrow">Modo desenvolvedor</span><h2 id="inspector-title">Linha do tempo da integração</h2><p>Requests e responses no casing do contrato da API; apenas credenciais são removidas.</p></div><button aria-label="Fechar inspetor" onClick={onClose}>×</button></header>
      <div className="inspector-actions"><span>{events.length} evento(s)</span><button onClick={clearIntegrationTrace}>Limpar</button></div>
      {!events.length ? <div className="inspector-empty"><strong>Nenhum evento ainda</strong><span>Selecione um cenário ou identifique um cliente para começar.</span></div> : <div className="trace-list">{events.map(event => <article key={event.id} className={`trace-event ${event.ok ? 'success' : 'error'}`}>
        <button className="trace-summary" onClick={() => setExpanded(expanded === event.id ? null : event.id)}>
          <span className="trace-status">{event.ok ? '✓' : '!'}</span><span><small>{event.kind === 'local' ? 'EVENTO LOCAL · sem chamada à API' : `${event.method} ${event.endpoint}`}</small><strong>{event.operation}</strong><em>{event.kind === 'local' ? 'ação no PDV' : `${event.durationMs} ms`}</em></span><b>{expanded === event.id ? '−' : '+'}</b>
        </button>
        {expanded === event.id && <div className="trace-details"><div className="trace-reason"><strong>{event.kind === 'api' ? 'Motivo da chamada' : 'Motivo da ação'}</strong><span>{event.reason}</span></div>{event.persists.length > 0 && <div className="trace-persists"><strong>Persistir no PDV:</strong> {event.persists.join(', ')}</div>}<label>{event.kind === 'local' ? 'Contexto' : 'Body enviado à API'}</label><pre>{event.request === null ? 'Sem body' : JSON.stringify(event.request, null, 2)}</pre><label>{event.kind === 'local' ? 'Resultado' : 'Resposta recebida da API'}</label><pre>{JSON.stringify(event.response, null, 2)}</pre>{event.kind === 'api' && <button className="btn btn-secondary" onClick={() => void copyCurl(event)}>{copied === event.id ? 'Copiado!' : 'Copiar cURL (bash)'}</button>}</div>}
      </article>)}</div>}
    </aside>
  </div>
}
