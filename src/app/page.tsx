import BlueskyFeed from '@/components/BlueskyFeed'

const links = [
  { key: 'NAME', value: 'ImpureSilver11', href: '' },
  { key: 'BORN', value: '1992/4/30', href: '' },
  { key: 'BLOG', value: '>> OPEN <<', href: 'https://impuresilver11.hateblo.jp/' },
  { key: 'GITHUB', value: '>> OPEN <<', href: 'https://github.com/ImpureSilver11' },
]

const skills = [
  {
    title: '[ LANGUAGE / FRAMEWORK ]',
    names: ['JavaScript', 'Ruby', 'Rails'],
    level: 80,
  },
  {
    title: '[ INFRA ]',
    names: ['Docker'],
    level: 60,
  },
  {
    title: '[ DATABASE ]',
    names: ['MySQL', 'PostgreSQL', 'Firebase'],
    level: 70,
  },
  {
    title: '[ COMMUNICATION ]',
    names: ['REST'],
    level: 75,
  },
]

export default function Portfolio() {
  return (
    <>
    <div className="space-y-6 text-center">

      {/* Title screen flavor */}
      <div className="py-4">
        <div className="glow-amber text-xs mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>
          ★ PORTFOLIO ★
        </div>
        <div className="text-[8px] text-green-600">
          {'> SELECT YOUR INQUIRY <'}
          <span className="blink">_</span>
        </div>
      </div>

      {/* PLAYER STATUS */}
      <section className="pixel-panel">
        <h2 className="section-title text-center">
          ▶ PLAYER STATUS
        </h2>
        <table className="w-full" style={{ borderSpacing: '0 6px', borderCollapse: 'separate' }}>
          <tbody>
            {links.map((item) => (
              <tr key={item.key}>
                <td className="pr-4 text-green-500 w-28 text-center align-middle" style={{ fontSize: '8px' }}>
                  {item.key}
                </td>
                <td className="text-green-300 text-center" style={{ fontSize: '9px' }}>
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-400 hover:text-yellow-200"
                      style={{ textShadow: '0 0 6px #fbbf24' }}
                    >
                      {item.value}
                    </a>
                  ) : (
                    item.value
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* QUEST LOG */}
      <section className="pixel-panel">
        <h2 className="section-title text-center">
          ▶ QUEST LOG
        </h2>
        <div className="space-y-3">
          <div style={{ fontSize: '8px' }}>
            <div className="text-green-600 mb-1">2016/4/1</div>
            <div className="text-green-300">✔ 社会人クエスト　スタート！</div>
            <div className="text-green-600 mt-1">
              {'※ 詳細は直接コンタクトせよ'}
            </div>
          </div>
          <div className="text-green-700 mt-2" style={{ fontSize: '8px' }}>
            {'- - - MORE TO BE UNLOCKED - - -'}
          </div>
        </div>
      </section>

      {/* SKILL TREE */}
      <section className="pixel-panel">
        <h2 className="section-title text-center">
          ▶ SKILL TREE
        </h2>
        <div className="space-y-5">
          {skills.map((group) => (
            <div key={group.title}>
              <div className="text-green-600 mb-2 text-center" style={{ fontSize: '7px' }}>
                {group.title}
              </div>
              <div className="hp-bar mb-2">
                <div className="hp-bar-fill" style={{ width: `${group.level}%` }} />
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {group.names.map((name) => (
                  <span key={name} className="pixel-tag">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer ticker */}
      <div className="pixel-panel py-2">
        <div className="marquee text-green-700" style={{ fontSize: '8px' }}>
          <span>
            {'★ PRESS ANY KEY TO CONTINUE ★　　'}
            {'★ PRESS ANY KEY TO CONTINUE ★　　'}
            {'★ PRESS ANY KEY TO CONTINUE ★　　'}
            {'★ PRESS ANY KEY TO CONTINUE ★　　'}
          </span>
        </div>
      </div>

    </div>
    <BlueskyFeed />
    </>
  )
}
