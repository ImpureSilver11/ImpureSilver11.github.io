---
title: "tmuxを入れて画面分割と色を整えるまで"
date: "2026-08-03 12:06:40"
description: "Claude Codeを並行で回したくてtmuxを導入した記録。brewでのインストールから、prefixキーに指が慣れるまでの話、画面分割を | と - に変える設定、macOS標準ターミナルでの色の当て方までを順番に書きました。"
---

Claude Code を2つ、3つ同時に走らせたくなる日があるじゃないですか。片方にコードを書かせながら、もう片方で別の調べ物をさせたい、みたいな。

それで tmux を入れました。名前は前から知ってたし、人の画面で見たこともあるんだけど、自分の環境にちゃんと設定して常用するのは初めてです。で、入れてみて最初にやったのは設定でも何でもなく、「キーの押し方に慣れる」でした。ツールを覚えるより先に、指を作り替える作業がある。ここが想像してたよりつらかった。

同じところでつまずく人がいそうなので、インストールから画面分割と色を整えるところまで、順番に書いておきます。macOS + 標準のターミナル.app が前提です。

## tmuxは何をしてくれるのか

ひとつのターミナルウィンドウの中を分割して、複数のシェルを同時に開いておけるようにするものです。左でサーバーを動かしながら右でログを見る、みたいな並べ方ができる。

登場する言葉は3つだけ覚えれば足ります。分割された1区画が**ペイン**、ペインの集合が「ウィンドウ」（ブラウザのタブに近い）、ウィンドウの集合が「セッション」。今回はペインの話だけで終わります。

## brew install tmux で入る

Homebrew が入っていれば1行です。

```bash
brew install tmux
```

入ったらバージョンを見ておきます。

```bash
tmux -V
# tmux 3.7b
```

起動は `tmux` と打つだけ。画面の一番下に帯が1本出て、左端に `[0] 0:zsh*` のような表示が並びます。これがステータスバー。あとで色を変えるのはここです。抜けるときは普通に `exit` か Ctrl-d。

<Callout type="note">
インストール先は Apple Silicon なら `/opt/homebrew/bin/tmux`、Intel なら `/usr/local/bin/tmux` になります。手元は後者でした。`which tmux` が `/usr/bin/tmux` を返す場合は OS 付属の古いものを見てるので、PATH の順番を疑ってください。
</Callout>

## 最初の壁はprefixキーだった

tmux への命令は、全部「Ctrl-b を押してから、続けてコマンドのキーを押す」という2段構えになってます。この Ctrl-b が prefix と呼ばれるやつです。

押し方が独特で、ここでずっと引っかかりました。正しくは Ctrl と b を同時に押して**両方離してから**、次のキーを単独で押す。Ctrl を押したまま次のキーを押すんじゃない。自分は最初これを勘違いしていて、押しっぱなしのまま `|` を叩いては「動かないな」とやってました。

厄介なのは、prefix を押せてないときに何のエラーも出ないところです。Ctrl-b はシェル側ではカーソルを1文字左に戻すキーなので、prefix のつもりで押してから `|` を打つと、画面は分割されずにコマンド行の変な位置に `|` が入るだけ。無反応でもエラーでもないから、何を間違えてるのか分からない。しばらく「tmux が壊れてるのかな」と思ってました…

素の状態で最初に覚えるキーはこのくらいです。

| キー | 何が起きるか |
|---|---|
| prefix + % | 左右に分割 |
| prefix + " | 上下に分割 |
| prefix + o | 次のペインへ移動 |
| prefix + x | いまのペインを閉じる（y/n を聞かれる） |
| prefix + ? | キー割り当ての一覧を表示（q で戻る） |

`prefix + ?` は覚えておくと救われます。何が割り当たってるか分からなくなったら、ここを見れば全部載ってる。

prefix そのものを Ctrl-a や Ctrl-t に変える人も多いようです。Ctrl-b は左手の形がつらいので。自分はいまも C-b のままにしてるんだけど、これは慣れで解決する話なのか、素直に変えたほうが早いのか、まだ判断がついてません。

## 分割を | と - に変える

`%` と `"` がどうしても覚えられなかった。どっちがどっちなのか、押すまで分からない。なので記号を変えました。

```bash
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
unbind '"'
unbind %
```

`|` を押すと左右、`-` を押すと上下。見た目のとおりなので、これは一発で覚えられました。`unbind` は元の割り当てを外してるだけなので、なくても動きます。

`-c "#{pane_current_path}"` のほうが実用的には効きます。これを付けないと、新しく開いたペインはセッションを開始したときのディレクトリで開きます。プロジェクトの奥深くで作業してるときに毎回 `cd` し直すのは無理なので、これはほぼ必須の指定だと思ってます。

同じ理由で、新規ウィンドウ（`prefix + c`）にも付けておきました。

```bash
bind c new-window -c "#{pane_current_path}"
```

## ペインの移動とサイズ変更

分割したら移動が要ります。デフォルトは `prefix + 矢印キー` ただmacの矢印押しにくいんで `h/j/k/l` にしました。

```bash
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R
```

サイズ変更は大文字に割り当てます。

```bash
bind -r H resize-pane -L 5
bind -r J resize-pane -D 5
bind -r K resize-pane -U 5
bind -r L resize-pane -R 5
```

ここの `-r` が地味に効きます。これを付けると prefix を押し直さずに連打できるようになる。`prefix + H H H H` で20カラム分まとめて縮みます。付けないと1回ごとに Ctrl-b からやり直しで、幅をちょっと調整するだけで指が疲れる。連打が有効な時間は `repeat-time` で決まっていて、デフォルトは 500ms です。

<Callout type="tip">
`l` は素の tmux では「直前のウィンドウに戻る」に割り当たっています。上書きすると消えるので、ウィンドウを行き来する使い方をする人は別のキーに退避させたほうがいいかもしれません。自分はウィンドウをほとんど使ってないので、潰したままにしてます。
</Callout>

## 色を当てる

見た目の話です。標準のターミナル.app を使ってる場合、ここに落とし穴が1個あります。

まず tmux の中で使える色数を宣言します。

```bash
set -g default-terminal "tmux-256color"
```

これで256色。tmux の中で `tput colors` を叩くと `256` が返ってきます。

で、ネットで見かける設定だと、この次に truecolor（24bit カラー）を有効にする行がだいたい付いてます。

```bash
# set -ga terminal-overrides ",*256col*:Tc"
```

これはターミナル.app では入れないほうがいいです。Apple のターミナルは 24bit カラーに対応していないので、この行を書くと「対応してます」と嘘の申告をすることになる。中で動く vim やエディタが 24bit で色を送ってきて、表示が崩れます。iTerm2 や Ghostty に移ったら有効化する、というコメントだけ残してコメントアウトしてあります。

もうひとつ、`tmux-256color` という terminfo が OS 側に入っていないと起動でこけます。手元では入っていましたが、先に見ておくと安心です。

```bash
infocmp tmux-256color >/dev/null && echo ok
```

`ok` が出ないなら `screen-256color` に落としておけば動きます。

そのうえで境界線とステータスバーに色を付けます。

```bash
# ペイン境界線: 非アクティブはグレー、アクティブは水色
set -g pane-border-style        fg=colour240
set -g pane-active-border-style fg=colour39

# ステータスバー
set -g status-style                bg=colour236,fg=colour248
set -g window-status-current-style bg=colour39,fg=colour236,bold
set -g message-style               bg=colour39,fg=colour236
```

このなかで一番効いたのは `pane-active-border-style` でした。ペインを3つ4つに増やすと、いまキー入力がどこに飛んでるのか分からなくなるんですよね。アクティブなペインの枠だけ水色になってると、それだけで迷わなくなる。**色は飾りだと思ってたけど、分割を増やすほど実用の道具になる。**

色番号は `colour39` のように書きます。tmux のドキュメントがイギリス綴りなのでこう書かれることが多いんだけど、`color39` でも通ります。番号と実物の対応は、これを叩けば一覧で出ます。

```bash
for i in {0..255}; do printf "\x1b[48;5;%sm%4d\x1b[0m" "$i" "$i"; (( i % 16 == 15 )) && echo; done
```

240番台がグレー、39が水色、236が黒に近いグレー。実際に並べて見ながら決めました。

余談だけど、この一覧を眺めてると番号の並びに規則があるのが分かります。0〜15が基本色、16〜231が6×6×6の立方体、232〜255がグレースケールの24段階。グレーを選びたいときは末尾の24個だけ見ればいいので、覚えておくと色決めが速くなります。話が逸れた。

## 書き換えたら読み込み直す

設定を変えたときに tmux を再起動する必要はありません。

```bash
tmux source-file ~/.tmux.conf
```

tmux の中からなら `prefix + :` でコマンドラインが開くので、`source-file ~/.tmux.conf` と打ちます。キー割り当てと色はこれで即座に反映されます。起動時にしか読まれない設定（シェルの指定など）は、新しいセッションを作らないと変わりません。

## いまの .tmux.conf

ここまでの設定を1ファイルにするとこうなります。先頭2行はシェルの指定で、これを書いておくと tmux の中でも zsh で入ります。

```bash
set -g default-shell   /bin/zsh
set -g default-command /bin/zsh

# ---------------------------------------------------------------
# 画面分割
# ---------------------------------------------------------------
# prefix (C-b) + | で左右分割、- で上下分割。分割元のディレクトリを引き継ぐ
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
unbind '"'
unbind %

# 新規ウィンドウもカレントディレクトリを引き継ぐ
bind c new-window -c "#{pane_current_path}"

# ペイン移動: prefix + h/j/k/l
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# ペインサイズ変更: prefix + H/J/K/L（prefix を押し直さず連打できる）
bind -r H resize-pane -L 5
bind -r J resize-pane -D 5
bind -r K resize-pane -U 5
bind -r L resize-pane -R 5

# ---------------------------------------------------------------
# 色
# ---------------------------------------------------------------
set -g default-terminal "tmux-256color"
# Apple Terminal は 24bit カラー非対応のため truecolor 設定は入れない。
# iTerm2 / Ghostty / Alacritty などに乗り換えたら次の行を有効化する:
# set -ga terminal-overrides ",*256col*:Tc"

# ペイン境界線: 非アクティブはグレー、アクティブは水色
set -g pane-border-style        fg=colour240
set -g pane-active-border-style fg=colour39

# ステータスバー
set -g status-style                bg=colour236,fg=colour248
set -g window-status-current-style bg=colour39,fg=colour236,bold
set -g message-style               bg=colour39,fg=colour236
```

これで `prefix + |` で右にペインを開いて Claude Code をもう1つ立ち上げ、`prefix + h` で左に戻る、という動きができるようになりました。元々やりたかったのはこれだけです。

## まだ入れてないもの

`set -g mouse on` を書くと、マウスでペインを選んだりドラッグで境界を動かしたりできるようになります。ただスクロールの挙動も一緒に変わるらしくて、まだ入れてません。キーだけで完結させたい気持ちと、スクロールくらいはトラックパッドでやりたい気持ちが半々で、どっちが自分に合うのか決めきれてない。

コピーモード（`prefix + [` で入って、キーだけで範囲を選択してコピーするやつ）にも手を出してないです。ターミナル.app 側のマウス選択でいまは足りてるので…

そんなわけで、やったのは画面を分けて色を付けただけです。tmux の本領はもっと別のところにあるらしいんだけど、そこまで行く前に「並べて使えるようになる」で目的は達成できてしまった。よければ `brew install tmux` して、`|` と `-` の2行だけ書いた `.tmux.conf` から始めてみてください。prefix の指の動きは、設定を凝るより先に体で覚えるしかないやつだと思います。

これはclaude codeで生成しました。
