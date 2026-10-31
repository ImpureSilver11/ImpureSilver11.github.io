import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Now Playing | ImpureSilver11',
  description: '聴いている曲を判別して、曲名をクリップボードにコピーする',
}

const SHORTCUT_NAME = '曲をコピー'

const steps = [
  'iPhone の「ショートカット」アプリを開いて、右上の「+」で新しいショートカットを作る',
  'アクション「ミュージックを認識」を追加する（Shazam で曲を判別するアクション）',
  'アクション「テキスト」を追加して、変数から「Shazam メディア」の「タイトル」と「アーティスト」を入れる（例: タイトル / アーティスト）',
  'アクション「クリップボードにコピー」を追加する',
  `ショートカットの名前を「${SHORTCUT_NAME}」にして保存する`,
]

export default function NowPlaying() {
  return (
    <div className="space-y-6">
      <section className="pixel-panel text-center">
        <h1 className="section-title">▶ NOW PLAYING</h1>
        <p className="text-sm text-green-300 mb-4">
          イヤホンで曲を流したままボタンを押すと、曲名とアーティスト名をクリップボードにコピーします。
        </p>
        <a
          href={`shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`}
          className="inline-block border-2 border-yellow-400 px-6 py-3 text-yellow-400 hover:text-yellow-200"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', textShadow: '0 0 6px #fbbf24' }}
        >
          {'>> COPY SONG <<'}
        </a>
      </section>

      <section className="pixel-panel">
        <h2 className="section-title">▶ 最初に1回だけやること</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-green-300">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
