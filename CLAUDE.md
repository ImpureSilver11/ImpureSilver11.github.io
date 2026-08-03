# CLAUDE.md

このリポジトリで作業するときに最初に読むファイル。

## ブートシーケンス（作業開始時・コンパクション復帰時に必ず実行）

1. **この CLAUDE.md** を読み、自分が何をするか把握する
2. `.claude/Progress.md` を読む — 運用ルールと直前の進捗を確認する
3. `.claude/Feedback.md` を読む — 前回の改善アクションで未対応のものがあれば考慮する
4. `TODO.md`（存在すれば）を確認する — 進行中のタスクを把握する
5. 上記を踏まえて作業／会話を再開する

> 詳細な開発ワークフロー・knowhow・エージェント運用は `.claude/`（ADDF フレームワーク）配下を参照。

## プロジェクト概要

- **正体**: 個人ブログ。Next.js (App Router) 製の静的サイトで、GitHub Pages (github.io) にデプロイする
- URL: https://impuresilver11.github.io/
- **記事**: `posts/` に Markdown ファイルとして置く。ファイル名は `YYYY-MM-DD-HH-MM-SS-{slug}.md`
- 記事の新規作成は `/new-post` スキルを使う（作成のワークフローはそこに定義済み）
- 主要ソース:
  - `src/app/` — ページ（トップ・`blog/`・`blog/[slug]/`）
  - `src/lib/posts.ts` — 記事の読み込み・パース
  - `src/components/mdx/` — Callout / YouTube / LinkCard などのカスタム MDX コンポーネント

## 開発コマンド

| コマンド | 用途 |
|---------|------|
| `npm run dev` | 開発サーバー起動（ホットリロードあり） |
| `npm run build` | 本番ビルド（`out/` に静的出力） |
| `npm run start` | ビルド済みサイトの起動 |
| `npm run lint` | ESLint |

> ⚠️ **ビルドしないと反映されない。** 記事や表示の変更を本番に出すには `npm run build` が必要（README 冒頭の注意書き参照）。

## 文章スタイルガイド

**日本語の文章を書く・直すときは必ず `.claude/templates/writing-style.md` を読む。** 口調・文体、三点リーダの使い方、AIっぽさを消すためのルール（語彙・構造・具体性）、書き終わったあとの自己チェック（grep + 目視チェックリスト）を定義してある。

適用対象はブログ記事（`posts/`）だけでなく、README・告知文・PR 説明など人が読む日本語すべて。記事を書くときは `/new-post` スキルがこのファイルを読み込む。

## MDX 記法リファレンス

記事で使える記法（`<small>` / 改行 / GFM / コードブロック / `<details>` / `<Callout>` / `<YouTube>` / `<LinkCard>` など）は **`README.md` に記載**。記事を書く・直すときはそちらを参照する（重複記載を避けるため CLAUDE.md には転記しない）。
