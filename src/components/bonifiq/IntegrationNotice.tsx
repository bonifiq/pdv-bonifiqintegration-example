interface Props { message: string; canRetry: boolean; canDismiss?: boolean; onRetry: () => void; onDismiss: () => void }

export function IntegrationNotice({ message, canRetry, canDismiss = true, onRetry, onDismiss }: Props) {
  return <div className="integration-notice" role="alert">
    <div><strong>Não foi possível concluir a etapa BonifiQ</strong><span>{message}</span></div>
    <div>{canRetry && <button className="btn btn-primary" onClick={onRetry}>Tentar novamente</button>}{canDismiss && <button className="btn btn-secondary" onClick={onDismiss}>Cancelar benefício</button>}</div>
  </div>
}
