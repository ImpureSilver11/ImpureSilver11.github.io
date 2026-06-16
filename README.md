https://impuresilver11.github.io/

<!-- @自分　buildしないと反映されない！！！！！！！！！１１１１ -->

## ブログ記事の書き方（MDX）

記事は `posts/` ディレクトリに `.md` ファイルとして作成する。

### フロントマター

```md
---
title: "記事タイトル"
date: "2026-06-16"
description: "記事の説明"
---
```

### 使える記法

#### 小さい文字

```md
<small>注釈や補足テキスト</small>
```

通常より小さく、薄い色で表示される。

#### 改行

1行の改行がそのまま反映される（`remark-breaks` 導入済み）。

```md
1行目
2行目
```

段落を分けたい場合は空行を入れる。

```md
1段落目

2段落目
```

#### 打ち消し線・テーブル・チェックリスト・脚注（GFM）

`remark-gfm` により GitHub Flavored Markdown が使える。

```md
~~打ち消し線~~

| 列1 | 列2 |
|-----|-----|
| A   | B   |

- [x] 完了タスク
- [ ] 未完了タスク

脚注の例[^1]

[^1]: 脚注の内容
```

#### コードブロック（シンタックスハイライト）

`rehype-pretty-code` により言語指定でハイライトされる。

````md
```js
const hello = 'world'
```
````

#### 折りたたみ

```md
<details>
<summary>見出し</summary>
ここに内容
</details>
```

#### 注意書きボックス（Callout）

`type` は `note` / `warn` / `tip` の3種類。

```md
<Callout type="note">
情報や補足を書く
</Callout>

<Callout type="warn">
注意事項を書く
</Callout>

<Callout type="tip">
Tips を書く
</Callout>
```

#### YouTube 埋め込み

URL の `v=` 以降の ID を指定する。

```md
<YouTube id="dQw4w9WgXcQ" />
```

#### リンクカード

```md
<LinkCard url="https://example.com" title="タイトル" description="説明（省略可）" />
```
