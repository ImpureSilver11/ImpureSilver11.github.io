---
title: "RSpecでS3を直接叩くのをやめてモックに置き換えた話"
date: "2026-07-02"
description: "RubyのRSpecテストでAWS S3に直接接続することのデメリットと、aws-sdkのstub_responses機能を使ってモックに置き換える方法をまとめた。"
---

テスト書いてるとき、「とりあえず本物のS3に繋いでおけばテストの信頼性が高そう」って思いませんか。正直、自分もそう思ってた時期がありました。でも実際にやってみると、地味につらいことが積み重なってくるんですよね。

## 直接S3に接続するのが辛かった理由

まず**テストが遅い**。ネットワークのI/Oが毎回走るので、ちょっとしたファイル操作のテストなのに数秒かかったりする。1個2個なら気にならなくても、テストが増えてくるとCIのビルドが体感でわかるくらい遅くなってきます。

それと**フラキーになりやすい**。AWSが一時的に不安定なだけで自分のコードは何も悪くないのに、テストが落ちる。CIを眺めながら「あれ、なんで落ちてるんだろ」ってなって調査したら「S3のエンドポイントが一瞬タイムアウトしてただけ」とわかったときの虚無感、正直かなりつらかったです。

地味に嫌なのが**テストデータの蓄積**。本物のバケットに繋ぎっぱなしだと、テスト実行のたびにファイルが溜まっていく。定期的にクリーンアップしなきゃいけないし、うっかり本番と同じバケットを向いてしまうと目も当てられない。

あとはコスト。頻繁にCIが回る環境だと、積み重なって無視できない金額になることもあります。

## モックに置き換える方法

いくつかやり方があるんですが、自分がいちばん使いやすいと思ったのは **`stub_responses: true`** を `spec_helper.rb` で一括設定する方法です。

```ruby
# spec/spec_helper.rb
RSpec.configure do |config|
  config.before(:each) do
    Aws.config.update({
      region: "ap-northeast-1",
      credentials: Aws::Credentials.new("test", "test"),
      stub_responses: true
    })
  end
end
```

これだけで全テストのネットワーク呼び出しがブロックされます。aws-sdk の公式機能なので gem の追加も不要で、既存のコードを一切変えなくていいのが楽です。

レスポンスの中身を細かく制御したいときは、こういう書き方もできます。

```ruby
let(:s3_client) do
  Aws::S3::Client.new(stub_responses: true)
end

before do
  s3_client.stub_responses(:get_object, {
    body: StringIO.new("テストの内容"),
    content_type: "text/plain"
  })
end
```

特定のテストで「S3からこういうファイルが返ってくる場合」みたいなシナリオを作りたいときに便利です。

## RSpecのdoubleを使う方法もある

もっとシンプルに `instance_double` で差し替える方法もあります。

```ruby
let(:s3_client) { instance_double(Aws::S3::Client) }

before do
  allow(Aws::S3::Client).to receive(:new).and_return(s3_client)
  allow(s3_client).to receive(:put_object)
end

it "S3にファイルをアップロードする" do
  expect(s3_client).to receive(:put_object).with(
    bucket: "my-bucket",
    key: "uploads/test.txt",
    body: "hello"
  )

  FileUploader.new.upload("test.txt", "hello")
end
```

`instance_double` を使うとメソッドのシグネチャが実際のクラスと一致しているかチェックしてくれるので、存在しないメソッドをうっかりスタブしても気づける。これ地味に助かります。

## どっちを使えばいいのか

個人的には、**全体のスタブは `stub_responses: true` で一括設定、特定のレスポンスを検証したいテストだけ `instance_double` を使う**、という使い分けが一番きれいに収まるなぁと思ってます。

`stub_responses: true` は「S3に繋がないようにする」という目的に特化していて、設定が1箇所で完結するのが気持ちいい。`instance_double` は「このメソッドが正しく呼ばれているか」を検証したいときに使う、という役割分担です。

テストが速くなって、フラキーがなくなって、CIが安定するだけで開発体験がかなり変わります。S3を直接叩いてるテストがあったら、一度モックに置き換えてみるといいと思います。

これはclaude codeで生成しました。

私は怒りの念で見てます。