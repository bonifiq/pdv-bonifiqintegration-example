import { bonifiqConfig } from '../../bonifiq/client'
import { DEMO_SCENARIOS, type DemoScenarioId } from '../../bonifiq/scenarios'

interface Props { activeScenario: DemoScenarioId | null; onScenarioChange: (scenario: DemoScenarioId) => void; onOpenInspector: () => void }

export function DeveloperToolbar({ activeScenario, onScenarioChange, onOpenInspector }: Props) {
  const scenario = DEMO_SCENARIOS.find(item => item.id === activeScenario)
  return <section className="developer-toolbar">
    <div className="developer-toolbar-main"><div><span className={`mode-badge ${bonifiqConfig.mode}`}>{bonifiqConfig.mode === 'mock' ? '● Mock local' : '● API de demonstração'}</span><strong>Explore um cenário de integração</strong><small>{scenario ? `${scenario.description} Esperado: ${scenario.expected}` : 'Escolha um cenário para carregar cliente, carrinho e comportamento esperado.'}</small></div><select aria-label="Cenário guiado" value={activeScenario || ''} onChange={event => event.target.value && onScenarioChange(event.target.value as DemoScenarioId)}><option value="" disabled>Escolha um cenário...</option>{DEMO_SCENARIOS.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select><button className="btn inspector-trigger" onClick={onOpenInspector}>⌁ Ver integração</button></div>
    {bonifiqConfig.mode === 'api' && <div className="api-security-warning">⚠️ Frontend direto apenas para demonstração local. As credenciais ficam visíveis no navegador e não devem ser usadas assim em produção.</div>}
    {bonifiqConfig.configurationError && <div className="api-security-warning error">{bonifiqConfig.configurationError}</div>}
  </section>
}
