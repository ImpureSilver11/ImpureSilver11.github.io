---
title: "ssh hogefugaをやめてSession Managerに移行する話"
date: "2026-08-03 10:50:10"
description: "秘密鍵を持って踏み台にSSHする運用から、AWS Systems ManagerのSession Managerに移す話。仕組みの整理から、正直しんどいデメリット、結局SSHと併用する落ち着き先まで、実務目線でまとめました。"
---

`ssh` コマンドでサーバーに入る、っていうの、めちゃくちゃ手に馴染んでるじゃないですか。`~/.ssh/config` に Host を書いて、鍵を置いて、あとは4文字打つだけ。10年くらい同じ動きをしてる気がします。

で、この運用をやめて AWS の Session Manager に寄せられないかな、という話が最近あって、いま調べてるところです。これがまあ「思ってたよりいい」と「思ってたより面倒」が半々くらいで出てきておもしろかった。ネットで見かける記事はだいたい「踏み台不要！鍵管理不要！最高！」で終わってるんですが、日常作業を全部そっちに寄せると考えると、引っかかりそうなポイントがけっこう出てくる。

まだ1台も移してないので実戦の話は書けないんですが、調べて分かったことと、いま考えてる落としどころを整理しておきます。同じことを検討してる人の判断材料になればうれしいです。

## そもそも Systems Manager って何なのか問題

Session Manager の話をする前に、親サービスの Systems Manager（SSM）に触れておきます。ここがぼんやりしてると Session Manager の設定でハマったときに原因が分からなくなるので。

SSM って、正直「機能の詰め合わせ」なんですよね。名前からは何のサービスか全然分からないし、コンソールを開くと左メニューに20個くらい機能が並んでてげんなりする。歴史的に EC2 の付属機能（Run Command）から始まって、運用系の機能をひたすら吸収して膨らんだ結果なので、統一されたひとつのサービスというより、**同じ看板の下に独立性の高い機能が同居してる**という理解が正しいです。

代表的なものだけ挙げるとこんな感じ。

| 機能 | ざっくり何をするか |
|---|---|
| Session Manager | ポートを開けずにシェルに入る |
| Run Command | 複数サーバーにコマンドを一括実行 |
| State Manager | 「あるべき状態」を定期的に適用しつづける |
| Patch Manager | OSパッチをベースラインに沿って当てる |
| Parameter Store | 設定値・シークレットの保管 |
| Automation | 複数ステップのランブックを実行 |
| Fleet Manager | サーバー一覧をGUIで見る・RDPする |

で、これら全部が同じ土台の上に乗ってます。その土台が「**マネージドノード + SSM Agent + SSM ドキュメント + IAM**」の4点セット。

マネージドノードは「SSM の管理下に入ったサーバー」のこと。SSM Agent はそこに常駐するエージェントで、こいつがアウトバウンドの443でロングポーリングして「なんか仕事ある?」と聞きに来る。SSM ドキュメントは JSON/YAML で書かれた処理の定義で、`AWS-RunShellScript` みたいな AWS 提供のやつがたくさんある。そして誰が何をできるかは IAM で決まる。

この4点が揃ってれば、Session Manager も Run Command も Patch Manager も全部使えるようになります。逆に「SSM の機能が使えない」ときは、だいたいこの土台のどこかが欠けてるだけ。まず叩くべきはこれです。

```bash
aws ssm describe-instance-information
```

ここに自分のインスタンスが出てこないなら、SSM のどの機能も使えません。出てくるのに繋がらないなら Agent 側の問題。この切り分けだけ覚えておくと、あとで無駄に悩まなくて済みそう。

余談だけど、機能が多すぎるせいで「SSM」という略語がほぼ情報を持ってないんですよね。SSM って言われても Session Manager の話か Parameter Store の話か Run Command の話か分からない。略さず呼んだほうが早い気がします。話が逸れた。

## Session Manager が何を置き換えるのか

本題です。Session Manager は SSM の中の一機能で、やることは「サーバーにシェルで入る」。ただし経路と認証が根本的に違います。

いまの SSH 運用ってこうなってるはず。

```
[手元の端末] ──SSH(22)──→ [踏み台/パブリックIPのEC2] ──SSH(22)──→ [内部サーバー]
   ↑ ~/.ssh/id_rsa（秘密鍵）
                            ↑ ~/.ssh/authorized_keys（公開鍵）
```

Session Manager だとこう。

```
[手元の端末] ──AWS API(StartSession)──→ [SSMコントロールプレーン]
      ↓ WebSocket(443)                          ↓
[ssmmessages エンドポイント] ←──アウトバウンド443──── [EC2 + SSM Agent]
                                                    ↑ インバウンドは全閉でOK
                                                    ↑ パブリックIPも不要
```

大事なのは**接続を張るのがサーバー側から**だということ。サーバーが自分から外に出ていって443で待ち受けてるので、SG のインバウンドは空っぽでいい。22番も開けない、パブリック IP も EIP もいらない。

置き換わるのは要するにこの2つです。

| | SSH | Session Manager |
|---|---|---|
| 認証 | 秘密鍵を持ってること | IAM（SSO・MFAが効く） |
| 経路 | 22番へのインバウンド | アウトバウンド443のWebSocket |
| 認可 | サーバー上の `authorized_keys` | IAMポリシー（タグ条件など） |
| 監査 | 各ホストの sshd ログ | CloudTrail + 集中セッションログ |

シェルが開いたあとの体験はだいたい同じです。ここが「移行できるかも」と思える理由でもある。

<Callout type="warn">
プライベートサブネットで使う場合、`ssm` / `ssmmessages` / `ec2messages` の3つの VPC エンドポイントが必要です。特に `ssmmessages` はセッションのデータチャネルそのものなので、これを忘れると「Agent は online なのにセッションだけ張れない」という一番わかりにくい詰まり方をします。
</Callout>

## コマンドが実際どう変わるか

素の状態だとこうです。

```bash
# これまで
ssh hogefuga

# Session Manager
aws ssm start-session --target i-0123456789abcdef0
```

インスタンス ID を毎回打つのは無理ですよね。人間の使うものじゃない。なので最低限のラッパーは絶対に作ります。

```bash
# ~/.zshrc
ssmssh() {
  local id=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=$1" "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].InstanceId' --output text | head -1)
  [ -z "$id" ] && { echo "not found: $1"; return 1; }
  aws ssm start-session --target "$id"
}
```

これで `ssmssh hogefuga` と打てるようになります。Auto Scaling でインスタンスが入れ替わっても、タグから引き直すので気にしなくていい。`known_hosts` の警告が出て `ssh-keygen -R` する儀式がなくなるのは、地味にうれしいところだと思ってます。

ポートフォワードもできます。というか、自分の使い方だとたぶんこれが主役になる。

```bash
# 踏み台にログインせずに、RDSへのトンネルだけ張る
aws ssm start-session --target i-0123 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["mydb.xxxx.rds.amazonaws.com"],"portNumber":["3306"],"localPortNumber":["13306"]}'
```

コマンドは長いんですが、これ何がいいかというと、**踏み台のシェル権限を渡さずにトンネルだけ許可できる**ところ。SSH の `-L` だと結局そのサーバーにログインできる権限を渡すことになるので、「DB は見せたいけどサーバーには入れたくない」が表現できなかった。IAM で使える SSM ドキュメントを絞れば、「ポートフォワードは OK、対話シェルは禁止」ができます。これは素直に SSH より強い。

複数台への一括実行も、for ループを自作しなくてよくなります。

```bash
aws ssm send-command --document-name AWS-RunShellScript \
  --targets "Key=tag:Role,Values=web" \
  --parameters 'commands=["systemctl restart nginx"]' \
  --max-concurrency 1 --max-errors 0
```

タグ指定、並列度制御、失敗したら止まる、実行記録が残る。`for h in web1 web2 web3; do ssh $h ...; done` を手で書いてた頃と比べると、まあ文明的です。

## これは効きそうだと思ったところ

秘密鍵の管理って、真面目にやるとしんどいんですよね。新しいメンバーが入るたびに公開鍵を集めて全ホストの `authorized_keys` に配って、辞めるたびに全ホストから消して、消し漏れがないか棚卸しして。PC 紛失したら全部ローテーションしないといけないし、そもそも「その鍵、いま何台のサーバーに登録されてるんですか」に即答できる状態を維持するのがきつかった。Session Manager だと IAM ロールから外せば即時に権限が消えるので、この一連が丸ごとなくなります。

あと SSH に MFA が効かないのも、ずっと気持ち悪かったんだけど。鍵ファイル1個の所有だけで本番に入れる状態って、よく考えると怖いです。Session Manager は SSO + MFA の上に乗るので、ここが素直に強くなる。

監査も変わります。共有ユーザーで SSH してると、sshd のログを見ても「誰が入ったか」が結局分からない。Session Manager は IAM プリンシパルと操作が最初から紐づくので、CloudTrail に「誰がいつどのインスタンスにセッションを開いたか」がそのまま残る。セッションの入出力も S3 や CloudWatch Logs に流せます。監査のときの説明コストがだいぶ下がりそうなのは、けっこうありがたい話だなと思ってます。

そして踏み台サーバーそのものが消える。EC2 の費用だけじゃなくて、あいつのパッチ適用、監視、可用性、sshd のハードニング、fail2ban の設定。全部いらなくなる。Session Manager 自体は無料です。突き詰めると sshd を止めて22番のリスナーを OS から消せるので、sshd の CVE が出たときの対応対象からも外れられる。

## で、これは面倒そうというところ

ここまで散々褒めてきたんだけど、調べていくと引っかかりそうな点も同じくらい出てきました。

まずファイル転送ができない。これが一番でかい。素の Session Manager に `scp` 相当がないんですよ。`scp ./app.tar.gz hogefuga:/tmp/` みたいな、何も考えずにやってた操作がいきなり使えなくなる。回避策は S3 経由にするか、後述の SSH over SSM を設定するかなんだけど、どっちも一手間増えるので、これはかなり面倒そう…

端末体験も微妙に違うらしい。ウィンドウサイズ変更の追従があやしいときがあるし、`vim` や `top` で描画が崩れることがある。長いテキストをペーストすると取りこぼす。`Ctrl-C` の伝わり方も場面によって違う。致命的ではないんだけど、「SSH と完全に同じ」ではないので、慣れるまではイラっとしそうだなと思ってます。`tmux` を常用してる人は影響が小さいはず。

あとデフォルト20分でアイドル切断される。設定で1〜60分に変えられるんだけど、`ServerAliveInterval` で無限に張りっぱなしにしてた運用とは前提が変わる。長い作業は `tmux` か `nohup` が必須になります。

クライアント側の準備が増えるのも地味に効きそう。AWS CLI v2 に加えて Session Manager Plugin を別途入れないといけないし、有効な AWS クレデンシャルが必要。SSO なら定期的に `aws sso login` する。しかも**セッション中にクレデンシャルが切れると落ちる**。「秘密鍵さえあればどこからでも入れる」から「AWS 認証が通る環境でしか入れない」への変化は、思ってるより行動を縛ってくるんじゃないかなぁ。

そして既存ツールチェーンが動かない。これも痛い。`~/.ssh/config` を前提にしてるツール、つまり `rsync`、Ansible、VS Code Remote-SSH、JetBrains のリモート開発、ssh-agent フォワーディングでサーバー上から `git push`。このへんが素の Session Manager では全滅する。調べててここが一番ネックだなと思った…

そして一番真剣に考えるべきなのがこれ。

<Callout type="warn">
SSM Agent が死ぬと入れなくなります。sshd が落ちても SSM で入れる、という逆はあるんですが、Agent が落ちたら SSM 経路は使えません。しかも SSM Agent は sshd よりずっと重くて依存が多い（常駐プロセス、443の到達性、IAM、KMS…）。ディスクが full で Agent が死んだ、SSM 側でリージョン障害が起きた、VPC エンドポイントの設定を壊した、といったケースで**入り口がゼロになる**リスクがあります。
</Callout>

対策は **EC2 Serial Console** です。インスタンスのシリアルコンソールに直結する機能で、ネットワークもエージェントも介さない。移行するなら、これを有効化して手順を書いておくのを移行作業の一部に含めるべきだと思います。「入れなくなったときどうするか」を用意しないまま22番を閉じるのは、正直おすすめしません。締めたつもりが自分の首も締めてた、っていうのが一番情けないパターンなので。

<Callout type="note">
もうひとつ見落としやすいのが権限の話。`ssm:StartSession` と `ssm:SendCommand` は**実質そのホストの root 権限**です。ネットワークを完全に閉じた安心感で `AmazonSSMFullAccess` を配ると、「SG は完璧に閉じてるのに誰でも本番で任意コマンドを実行できる」という状態になります。閉じたネットワークの代わりに IAM で締める、という発想の切り替えが要ります。
</Callout>

## たぶんこういう使い分けになる

「SSH をやめて Session Manager にする」じゃなくて、**用途で使い分ける**のが現実的かなと思ってます。

日常の対話作業は素の Session Manager。DB や内部サービスへの接続はリモートポートフォワード。一括オペレーションは Run Command。そしてファイル転送と IDE 連携のために SSH over SSM を残す。緊急時は Serial Console。この5段構えです。

SSH over SSM っていうのは、SSH のトンネルだけ SSM に通すやつです。`~/.ssh/config` にこう書きます。

```
Host hogefuga
  HostName i-0123456789abcdef0
  User ec2-user
  IdentityFile ~/.ssh/hogefuga-key
  ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"

# インスタンスIDを直接叩きたい場合はワイルドカードで
Host i-* mi-*
  User ec2-user
  ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
```

これを入れると何が起きるかというと、**`ssh hogefuga` というコマンドが、コマンドを一切変えずに SSM 経路で通る**ようになります。`scp` も `rsync` も VS Code Remote-SSH も Ansible も全部そのまま動く。22番は閉じたままで。

これを見つけたときは「なんだ、最初からこれでよかったのでは」と思いました。もっと早く知りたかった…　ただトレードオフはあって、この構成では sshd と鍵が残るんだけど。つまり「鍵管理が消える」というメリットは半分になる。代わりに、インターネットからの攻撃面はゼロになって、鍵は「SSM を通れた人だけが使える二要素目」として機能する。鍵管理の手間を残す代わりに多層防御になったと考えると、悪くない妥協点だなぁと思ってます。

やるとしたらこの順番かなと思ってます。急にやると事故りそうなので。

- [ ] 検証環境で SSM Agent と IAM ロールを整え、`describe-instance-information` に出るのを確認する
- [ ] VPC エンドポイント（または NAT）を用意する
- [ ] セッションログの S3 出力を有効化する
- [ ] `ssm:StartSession` をタグ条件付きで開発者ロールに付ける
- [ ] `~/.ssh/config` に ProxyCommand を入れて、既存の作業が全部動くか試す
- [ ] EC2 Serial Console を有効化して、break-glass 手順を書く（これを飛ばすと後で泣く）
- [ ] 踏み台の SG から22番を消して、数週間様子を見る
- [ ] 踏み台 EC2 を落とす
- [ ] Run As を設定して、OS ユーザーと IAM プリンシパルを対応づける

最後の Run As は忘れがちなんですが、デフォルトだと全員が `ssm-user` という同じ OS ユーザーで入ることになって、OS レベルでは誰が誰だか分からなくなります。`bash_history` も混ざる。せっかく IAM で個人を特定できるようにしたのに、シェルの中で匿名化されるのはもったいない。ここまでやって初めて筋が通る気がします。

## あと SSH の体験を保ちたいだけなら

「セキュリティのために22番は閉じたいけど、Agent 依存は怖いし SSM の他の機能もいらない」という場合、**EC2 Instance Connect Endpoint** という第三の選択肢もあります。Agent 不要で SSH プロトコルをそのままトンネルしてくれるので、移行が一番軽い。

代わりに EC2 限定で、ポートフォワードや一括実行みたいな SSM の周辺機能は付いてきません。運用の自動化まで含めて寄せたいなら SSM、とりあえずインバウンドだけ閉じたいなら EIC Endpoint、という住み分けかなと思ってます。

## で、どっちを主に使うのか

セキュリティと鍵管理と監査の話としては、Session Manager は明確に強いです。特に「退職者の鍵を回収する」とか「22番の開放申請を出す」みたいな作業が発生してる環境なら、寄せる価値はかなり大きいと思う。

ただ、ここまで書いてきて自分でもまだ決めきれてないことがあって。**ふだんの作業で `ssh` と Session Manager のどっちを主に使うのか**、というところです。ファイル転送や IDE 連携が絡む日は `ssh`（over SSM）のほうが速いし、DB を覗くだけの日は `aws ssm start-session` のほうが軽い。どっちかに寄せる理由が、いまのところ見つかってない。

なので当面は「利点に合わせて両方使う」で行くつもりです。決着したというより、決着を先延ばしにしてる感じなんだけど、実際に運用してみないと分からないことでもあるので、しばらくはこのままでいいかなと思ってます。

そんなわけで、自分はまだ調べただけで1台も移してません。よければ検証環境あたりから一緒に試してみてください。ProxyCommand だけ先に入れて `ssh` が SSM 経由で通るのを確認するのが、一番手軽な第一歩だと思います。

これはclaude codeで生成しました。
