import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Now Playing | ImpureSilver11',
  description: '聴いている曲を判別して、曲名をクリップボードにコピーする',
}

const SHORTCUT_NAME = '曲をコピー'

const steps = [
  {
    title: '新しいショートカットを作る',
    details: ['iPhone の「ショートカット」アプリを開き、「ショートカット」タブの右上にある「+」をタップする'],
  },
  {
    title: '「ミュージックを認識」を追加する',
    details: [
      '下の「アクションを検索」に「ミュージック」と入れて、「ミュージックを認識」をタップする。Shazam で曲を判別するアクション',
      'オプションは初期設定のままでいい',
    ],
  },
  {
    title: '「テキスト」を追加して、曲名とアーティスト名の変数を入れる',
    details: [
      '「テキスト」を検索して追加し、入力欄をタップする',
      'キーボードの上に出る変数バーから「Shazam メディア」をタップする。バーに出ていなければ「変数を選択」をタップしてから、上の「ミュージックを認識」アクションをタップする',
      '入った「Shazam メディア」をタップして、一覧から「タイトル」を選ぶ',
      '続けて半角スペース・「/」・半角スペースを打つ',
      'もう一度「Shazam メディア」を入れてタップし、今度は「アーティスト」を選ぶ',
      '「タイトル」「アーティスト」の文字を手で打ち込むと、その文字がそのままコピーされる。変数はアイコン付きの色の付いた部品で表示されるので、普通の文字になっていたら入れ直す',
    ],
  },
  {
    title: '「クリップボードにコピー」を追加する',
    details: [
      '検索して追加する。入力には前の「テキスト」が自動で入る',
      '「ローカルのみ」「有効期限」のオプションは初期設定のままでいい',
    ],
  },
  {
    title: `名前を「${SHORTCUT_NAME}」にして保存する`,
    details: [
      '画面上部の名前をタップして「名前を変更」を選ぶ',
      'このページのボタンは名前でショートカットを呼び出すので、1文字でも違うと動かない',
    ],
  },
  {
    title: 'このページのボタンから実行する',
    details: [
      '初回は「ショートカットで開きますか」の確認やマイクの許可を求められることがある。どちらも許可する',
      '実行後にメモアプリなどへ貼り付けて、曲名とアーティスト名が入っていれば完成',
    ],
  },
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
        <ol className="list-decimal pl-5 space-y-4 text-sm text-green-300">
          {steps.map((step) => (
            <li key={step.title}>
              <div className="text-green-200 mb-1">{step.title}</div>
              <ul className="list-disc pl-5 space-y-1 text-green-400">
                {step.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
