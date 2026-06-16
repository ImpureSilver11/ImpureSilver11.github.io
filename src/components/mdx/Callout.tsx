type CalloutType = 'note' | 'warn' | 'tip'

const config: Record<CalloutType, { color: string; label: string }> = {
  note: { color: '#4ade80', label: 'NOTE' },
  warn: { color: '#fbbf24', label: 'WARN' },
  tip:  { color: '#34d399', label: 'TIP' },
}

export default function Callout({
  type = 'note',
  children,
}: {
  type?: CalloutType
  children: React.ReactNode
}) {
  const { color, label } = config[type]
  return (
    <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: '1rem', margin: '1.25rem 0' }}>
      <div style={{ color, fontSize: '9px', fontFamily: "'Press Start 2P', monospace", marginBottom: '0.4rem' }}>
        [{label}]
      </div>
      <div>{children}</div>
    </div>
  )
}
