const links = [
  { key: 'Birthday', value: '1992/4/30', href: '' },
  { key: 'Blog', value: 'ImpureSilver11', href: 'https://impuresilver11.hateblo.jp/' },
  { key: 'GitHub', value: 'ImpureSilver11', href: 'https://github.com/ImpureSilver11' },
]

const skills = [
  {
    title: '言語・フレームワーク',
    names: ['JavaScript', 'Ruby', 'Rails',],
  },
  {
    title: 'インフラ',
    names: ['Docker'],
  },
  {
    title: 'DB',
    names: ['MySQL', 'PostgreSQL', 'Firebase'],
  },
  {
    title: '通信',
    names: ['REST'],
  },
]

export default function Portfolio() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold mb-4">プロフィール</h1>
        <table className="w-full text-sm border-collapse">
          <tbody>
            {links.map((item) => (
              <tr key={item.key} className="border-b border-gray-200">
                <td className="py-2 pr-4 font-medium text-gray-500 w-32">{item.key}</td>
                <td className="py-2">
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
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

      <section>
        <h2 className="text-xl font-bold mb-4">経歴</h2>
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-2 pr-4 text-gray-500 w-32">2016/4/1〜</td>
              <td className="py-2">社会人（詳細は個人的に）</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">スキル</h2>
        <div className="space-y-4">
          {skills.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">{group.title}</h3>
              <div className="flex flex-wrap gap-2">
                {group.names.map((name) => (
                  <span
                    key={name}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
