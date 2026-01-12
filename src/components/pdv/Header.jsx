/**
 * Cabeçalho do PDV
 */
export function Header() {
  const now = new Date()
  return (
    <header className="header">
      <div className="header-logo">
        <span>PDV</span> Demo
      </div>
      <div className="header-info">
        <span>📅 {now.toLocaleDateString('pt-BR')}</span>
        <span>🕐 {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>👤 Vendedor: João</span>
      </div>
    </header>
  )
}
