import Link from 'next/link'

export default function Header() {
  return (
    <header style={{ borderBottom: '2px solid #166534', backgroundColor: '#020c02' }}>
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="glow"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '11px',
            color: '#4ade80',
            textDecoration: 'none',
          }}
        >
          {'> ImpureSilver11'}
          <span className="blink">_</span>
        </Link>
        <nav className="flex gap-6">
          {[
            { label: 'STATUS', href: '/' },
            { label: 'BLOG', href: '/blog' },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '8px',
                color: '#86efac',
                textDecoration: 'none',
              }}
            >
              [{label}]
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
