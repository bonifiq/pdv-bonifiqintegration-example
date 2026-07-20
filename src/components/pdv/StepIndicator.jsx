/**
 * Indicador de etapa da venda
 */
export function StepIndicator({ currentStep }) {
  const steps = [
    { num: 1, label: 'Cliente e produtos' },
    { num: 2, label: 'Pagamento e benefícios' },
  ]

  return (
    <div className="step-indicator">
      {steps.map((step, idx) => (
        <div key={step.num} className="step-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
          <div className={`step ${currentStep === step.num ? 'active' : ''} ${currentStep > step.num ? 'completed' : ''}`}>
            <div className="step-number">
              {currentStep > step.num ? '✓' : step.num}
            </div>
            <span>{step.label}</span>
          </div>
          {idx < steps.length - 1 && <span className="step-arrow" style={{ margin: '0 8px' }}>→</span>}
        </div>
      ))}
    </div>
  )
}
