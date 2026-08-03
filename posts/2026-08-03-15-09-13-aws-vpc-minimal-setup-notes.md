---
title: "AWS VPCを最小構成で組むまでの備忘録"
date: "2026-08-03 15:09:13"
description: "VPC・サブネット・ルーティング・セキュリティグループの整理から、EC2 + RDS + Route 53 だけをつないだ最小構成の作り方まで。AWS CLI とマネジメントコンソールの両方の手順、踏みやすい箇所、後片付けの順番をまとめた備忘録です。"
---

VPC、なんとなく使えてるけど改めて説明しろと言われると詰まる、みたいな状態になりがちじゃないですか。ウィザードでポチポチ作ると動くものはできるので、中で何が起きてるのかを飛ばしたまま先に進める。それでしばらくは困らないんだけど、「RDS に繋がらない」となった瞬間に切り分けができない。

というわけで、自分用に手順を残しておきます。前半は用語の整理、後半は EC2 + RDS + Route 53 だけをつないだ最小構成を CLI とコンソールの両方で作る手順。手を動かした話ではなく、調べて組み立てた手順のメモなので、実際に叩いたときの体感みたいなものは入っていません。あとで自分が見返すためのものです。

## VPC は結局なんなのか

VPC（Virtual Private Cloud）は、AWS アカウントの中に作る論理的に隔離された仮想ネットワークです。**リージョン単位**のリソースで、複数の AZ にまたがれる。ここに EC2 や RDS を置いて、IP アドレス空間・ルーティング・ファイアウォールを自分で決める。

物理データセンターのネットワーク機器を API で作る抽象、と捉えるとだいたい合っています。ただしレイヤ2は見えないので、ブロードキャストやマルチキャストは基本的に使えない。オンプレの構成をそのまま持ってこようとするとここで引っかかる。

新規アカウントには各リージョンにデフォルト VPC（`172.31.0.0/16`、各 AZ に `/20` のパブリックサブネット）が用意されています。試すぶんには楽だけど、本番はまず自前で作ることになります。

## CIDR は後から変えられない

VPC を作るとき IPv4 CIDR を1つ決めます。範囲は `/16`（65,536 IP）から `/28`（16 IP）まで。

ここで押さえておきたいのは、**プライマリ CIDR は後から変更できない**という点。セカンダリ CIDR の追加はできる（最大4つ、上限緩和でそれ以上も可）けど、プライマリを広げたり付け替えたりはできません。

使うのは RFC1918 のレンジ、つまり `10.0.0.0/8` / `172.16.0.0/12` / `192.168.0.0/16` のどれか。パブリック IP レンジも技術的には設定できるけど、そのレンジ宛の外向き通信が壊れるので普通はやらない。

設計で効いてくるのは「将来つなぐ相手と重複しないか」です。オンプレ、他部署の VPC、買収先のアカウント。重複すると VPC Peering も Transit Gateway も張れなくて、NAT で無理やり変換する羽目になる。複数アカウントを運用するなら AWS IPAM で払い出しを一元管理するのが現実的な解になります。

### サブネットで5個消える

サブネットは AZ 単位のリソースです。VPC の CIDR を切り分けて作る。

そして各サブネットで5個の IP が AWS 予約になります。`10.0.0.0/24` の場合はこう。

| アドレス | 用途 |
|---|---|
| `10.0.0.0` | ネットワークアドレス |
| `10.0.0.1` | VPC ルーター |
| `10.0.0.2` | Amazon 提供 DNS（Route 53 Resolver） |
| `10.0.0.3` | 将来利用のため予約 |
| `10.0.0.255` | ブロードキャストアドレス（実際にブロードキャストはできないが予約） |

なので `/24` で使えるのは 251 個。`/28` だと 11 個しか残らないので、Interface エンドポイント用の小さい枠くらいにしか使えません。

サイズ選定で刺されやすいのは EKS です。VPC CNI は Pod ごとに VPC の IP を1つ消費するので、`/24` のサブネットだと Pod 200個ちょっとで枯れる。ノード数と1ノードあたりの Pod 数を掛けて見積もる必要がある。

パブリックとプライベートという区別は設定項目ではなくて、ルートテーブルの中身で決まります。`0.0.0.0/0` が Internet Gateway に向いているサブネットがパブリック、それ以外がプライベート。この理解がないと「プライベートサブネットを作る」というチェックボックスを探して見つからずに困る。

## ルーティングとゲートウェイ

各サブネットはちょうど1つのルートテーブルに紐づきます。明示しなければ VPC のメインルートテーブル。ルートテーブルには VPC CIDR 宛の `local` ルートが必ず入っていて、これは消せない。

宛先の一致はロンゲストマッチです。`10.0.0.0/16 → local` と `10.0.5.0/24 → tgw` が両方あれば後者が勝つ。

ターゲットになれるものを並べておきます。

- **Internet Gateway (IGW)** — VPC にアタッチする（1 VPC に1つ）。双方向のインターネット通信。IGW へのルートと、ENI にパブリック IP または Elastic IP が付いていることの両方が必要で、片方だけだと通らない
- **NAT Gateway** — プライベートサブネットからの外向き通信専用。パブリックサブネットに置いて EIP を持たせる。AZ 単位のリソースなので、冗長化するなら AZ ごとに1台
- Egress-only Internet Gateway — IPv6 版の外向き専用ゲートウェイ
- Virtual Private Gateway (VGW) — Site-to-Site VPN や Direct Connect の VPC 側終端
- Transit Gateway attachment / VPC Peering connection / VPC エンドポイント
- ENI — 自前のファイアウォールアプライアンスを経由させたいとき

IPv6 に NAT がないのは、アドレスが枯渇しないので中と外を変換する動機がないからです。だから IPv6 のプライベート通信は「グローバルアドレスを持ったまま、入ってくる通信だけ塞ぐ」という形になる。Egress-only IGW はそのためのもの。

NAT Gateway に関しては、各 AZ のプライベートサブネットを自 AZ の NAT に向けるのを忘れないようにしたい。AZ-a のインスタンスが AZ-c の NAT を経由すると、AZ 間の転送料が全トラフィックに乗ります。

## セキュリティグループとネットワーク ACL

混同されやすいので並べます。

| | セキュリティグループ | Network ACL |
|---|---|---|
| 適用先 | ENI（インスタンス単位） | サブネット |
| ステート | ステートフル（戻りは自動許可） | ステートレス（戻りも明示的に許可） |
| ルール | 許可のみ | 許可と拒否の両方 |
| 評価 | 全ルールを評価、1つ一致すれば許可 | 番号順に評価、最初の一致で確定 |
| ソース指定 | 他の SG やプレフィックスリストを指定できる | CIDR のみ |
| デフォルト | インバウンド全拒否 / アウトバウンド全許可 | デフォルト NACL は全許可、自作 NACL は全拒否 |

NACL のステートレス性が事故の元になります。TCP の戻りパケットはエフェメラルポート宛（Linux は概ね 32768–60999、AWS のドキュメント推奨は 1024–65535）に返ってくるので、アウトバウンドでそこを開けないと通信が片道で死ぬ。原因が分かりにくいタイプの詰まり方です。

実務では SG を主戦力にして NACL はデフォルトのまま、というのが標準的な運用になっている印象。NACL を触るのは「このサブネットに特定 IP レンジを絶対に入れない」といった粗い遮断が要るときだけ。SG は許可しか書けないので、明示的な拒否が必要な場面だけ NACL の出番になる。

SG で覚えておきたいのは、**ソースに別の SG を指定できる**ところ。「ALB の SG からだけ App の 8080 を許可」と書いておけば、インスタンスが増減しても IP を書き換えなくていい。1 ENI に付けられる SG はデフォルト5個（上限緩和で最大16）、1 SG あたりのルールは方向ごとに 60 が既定です。

## VPC エンドポイント

プライベートサブネットから AWS のサービスを叩くのに、いちいち NAT Gateway 経由でインターネットに出るのは遅いし高い。それを VPC 内で完結させるのがエンドポイントです。

種類は3つあって、性質がかなり違う。

Gateway エンドポイントは **S3 と DynamoDB だけ**が対象。ルートテーブルに「マネージドプレフィックスリスト → エンドポイント」というルートが入る形で動きます。料金は無料で、データ処理料もかからない。ただし VPC の外（オンプレや Peering 先）からは使えないし、セキュリティグループも効かない。アクセス制御はエンドポイントポリシーでやる。

Interface エンドポイント（AWS PrivateLink）は、サブネットに ENI が作られてプライベート IP が振られる方式。ほぼ全ての AWS サービスに対応していて、`com.amazonaws.ap-northeast-1.ssm` のような名前で指定します。SG が効くのがこちら。ただし ENI 1本あたりの時間課金とデータ処理量課金があって、3 AZ × 20 サービスと並べると地味に積み上がる。Private DNS を有効にすると標準のサービス DNS 名がそのままエンドポイント IP に解決されるので、アプリ側の書き換えは不要。

Gateway Load Balancer エンドポイントは、サードパーティのインライン検査アプライアンスに通信を透過的に流すためのもの。ここは触ったことがないので、こういうものがあるという記述だけにしておきます。

自作サービスを他アカウントに公開するのも PrivateLink です。提供側が NLB を Endpoint Service として登録して、利用側が Interface エンドポイントを作る。CIDR が重複していても使えるのが Peering との決定的な差で、SaaS 連携でよく採用される方式。通信の向きは利用側から提供側への片方向。

## VPC 同士・オンプレとつなぐ

| 方式 | 特徴 | 向くケース |
|---|---|---|
| VPC Peering | 1対1、推移的ルーティング不可、CIDR 重複不可。データ処理料なし | VPC が数個。安く済ませたい |
| Transit Gateway | ハブ&スポーク、推移的ルーティング可、ルートテーブルで経路分離 | VPC が10個超、マルチアカウント |
| Site-to-Site VPN | IPsec、インターネット経由。1トンネル約 1.25 Gbps 上限 | オンプレ接続を早く安く。DX のバックアップ |
| Direct Connect | 専用線。1/10/100 Gbps（Hosted なら 50Mbps から） | 大容量・低遅延・コンプライアンス要件 |
| PrivateLink | サービス単位の片方向公開。CIDR 重複 OK | SaaS 提供、部門間のサービス公開 |
| VPC Lattice | サービス間のアプリケーションレイヤ接続 | マイクロサービス間の接続を宣言的に管理したいとき |

Peering の「推移的でない」は必ず一度は刺されるところです。A–B と B–C を張っても A–C は通らない。VPC が増えてきたら Transit Gateway に寄せる、という判断になる。

ただし TGW はアタッチメントの時間課金とデータ処理量課金がかかります。Peering にはデータ処理量課金がないので、2〜3 VPC なら Peering のほうが安い。ここは数で決まる話。

Direct Connect は物理1本だと単一障害点なので、本番では異なるロケーションに2本、あるいは DX + VPN バックアップを組むことになります。SLA が付くのも冗長構成にしたときだけ。

## DNS 周りで覚えておくこと

VPC には2つのフラグがあります。

`enableDnsSupport` が VPC+2 の Amazon 提供 DNS（Route 53 Resolver）を使えるかどうか。`enableDnsHostnames` が起動したインスタンスにパブリック DNS 名を振るかどうか。

新規に作った VPC は `enableDnsSupport` が true、`enableDnsHostnames` が false で作られます。後者を有効にしないと RDS のエンドポイント名が引けなくなるので、VPC を作った直後に必ず有効化する。ここを忘れると後半の構築で「RDS に繋がらない」の形で表面化します。

オンプレと名前解決を相互にやるなら Route 53 Resolver の Inbound / Outbound Endpoint を立てて、Outbound に転送ルールを書く。Resolver には ENI あたり毎秒 1024 パケット程度の上限があって、大量のコンテナが名前解決すると詰まる。EKS で NodeLocal DNSCache を検討する理由がこれです。

## 構築編：何を作り、何を作らないか

ここから手順。作るものは「EC2 上の Web アプリ + RDS(MySQL) + 独自ドメイン」で、余計なものは一切足さない。

```
                    Internet
                        │
                  [Route 53]  www.example.com → A → 203.0.113.10
                        │
                    [IGW]
                        │
┌─── VPC 10.0.0.0/16 (ap-northeast-1) ─────────────────────┐
│                                                          │
│  Public  10.0.0.0/24   (AZ-a)                            │
│    └─ EC2 t3.micro  ← EIP 203.0.113.10                   │
│         SG: web (in 80,443 from 0.0.0.0/0)               │
│                     │                                    │
│                     │ 3306                               │
│                     ▼                                    │
│  Private 10.0.10.0/24 (AZ-a)  ─┐                         │
│    └─ RDS MySQL (Single-AZ)     │ DB Subnet Group        │
│         SG: db (in 3306 from SG:web)                     │
│  Private 10.0.11.0/24 (AZ-c)  ─┘  ※空。RDS の要件で必要   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

作るのは8種類。VPC、サブネット3つ、IGW、ルートテーブル1つ、SG 2つ、EC2 + EIP + IAM ロール、RDS + DB サブネットグループ、Route 53 のホストゾーンと A レコード。

作らないものも書いておきます。

- NAT Gateway。EC2 はパブリックサブネットにいて IGW から直接外に出られるし、RDS は外に出る必要がない
- プライベート用のルートテーブル。メインルートテーブル（`local` のみ）にそのまま紐づけるほうが、余計なルートが入る余地がなくて安全
- ALB。EC2 1台に直接 EIP を振るので要らない
- VPC エンドポイント。パブリックサブネットから IGW 経由で SSM に届く

<Callout type="warn">
プライベートサブネットが2つ必要なのは、RDS の DB サブネットグループが最低2 AZ を要求するため。Single-AZ で起動しても要件は変わりません。片方は空のまま残ります。
</Callout>

## AWS CLI で作る

同じシェルセッションで続けて実行する前提。変数を先に置きます。

```bash
export AWS_PAGER=""
REGION=ap-northeast-1
AZ_A=${REGION}a
AZ_C=${REGION}c
NAME=minimal
DOMAIN=example.com
HOST=www.${DOMAIN}
```

### VPC

```bash
VPC_ID=$(aws ec2 create-vpc \
  --region $REGION \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${NAME}-vpc}]" \
  --query 'Vpc.VpcId' --output text)
echo "VPC_ID=$VPC_ID"

aws ec2 modify-vpc-attribute --region $REGION --vpc-id $VPC_ID --enable-dns-support   '{"Value":true}'
aws ec2 modify-vpc-attribute --region $REGION --vpc-id $VPC_ID --enable-dns-hostnames '{"Value":true}'
```

### サブネット

```bash
SUBNET_PUB_A=$(aws ec2 create-subnet --region $REGION \
  --vpc-id $VPC_ID --cidr-block 10.0.0.0/24 --availability-zone $AZ_A \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${NAME}-public-a}]" \
  --query 'Subnet.SubnetId' --output text)

SUBNET_PRI_A=$(aws ec2 create-subnet --region $REGION \
  --vpc-id $VPC_ID --cidr-block 10.0.10.0/24 --availability-zone $AZ_A \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${NAME}-private-a}]" \
  --query 'Subnet.SubnetId' --output text)

SUBNET_PRI_C=$(aws ec2 create-subnet --region $REGION \
  --vpc-id $VPC_ID --cidr-block 10.0.11.0/24 --availability-zone $AZ_C \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${NAME}-private-c}]" \
  --query 'Subnet.SubnetId' --output text)

echo "PUB_A=$SUBNET_PUB_A  PRI_A=$SUBNET_PRI_A  PRI_C=$SUBNET_PRI_C"
```

`/24` を選んだのは深い理由はなくて、251 IP あれば当面足りるから。将来パブリック側に ALB を足す余地も残ります（ALB は最低 `/27` を要求する）。

### IGW とルートテーブル

```bash
IGW_ID=$(aws ec2 create-internet-gateway --region $REGION \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${NAME}-igw}]" \
  --query 'InternetGateway.InternetGatewayId' --output text)

aws ec2 attach-internet-gateway --region $REGION \
  --internet-gateway-id $IGW_ID --vpc-id $VPC_ID

RTB_PUB=$(aws ec2 create-route-table --region $REGION \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${NAME}-rtb-public}]" \
  --query 'RouteTable.RouteTableId' --output text)

aws ec2 create-route --region $REGION \
  --route-table-id $RTB_PUB --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID

aws ec2 associate-route-table --region $REGION \
  --route-table-id $RTB_PUB --subnet-id $SUBNET_PUB_A
```

プライベートサブネット2つは何も紐づけません。自動的にメインルートテーブルに属して、外へのルートがない状態になる。

### セキュリティグループ

db が web を参照するので、web から作ります。

```bash
SG_WEB=$(aws ec2 create-security-group --region $REGION \
  --group-name ${NAME}-web --description "web tier" --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress --region $REGION \
  --group-id $SG_WEB --protocol tcp --port 80  --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --region $REGION \
  --group-id $SG_WEB --protocol tcp --port 443 --cidr 0.0.0.0/0

SG_DB=$(aws ec2 create-security-group --region $REGION \
  --group-name ${NAME}-db --description "db tier" --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress --region $REGION \
  --group-id $SG_DB --protocol tcp --port 3306 --source-group $SG_WEB

echo "SG_WEB=$SG_WEB  SG_DB=$SG_DB"
```

22番は開けません。接続は SSM Session Manager でやります。インバウンド SSH が0本という状態は、それだけで攻撃面がかなり減る。

アウトバウンドは新規 SG のデフォルトで全許可なので何も書かない。これが `dnf update` と SSM エージェントの通信に効いています。

### EC2 用の IAM ロール

```bash
aws iam create-role \
  --role-name ${NAME}-ec2-ssm \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name ${NAME}-ec2-ssm \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

aws iam create-instance-profile --instance-profile-name ${NAME}-ec2-ssm
aws iam add-role-to-instance-profile \
  --instance-profile-name ${NAME}-ec2-ssm --role-name ${NAME}-ec2-ssm
```

`AmazonSSMManagedInstanceCore` 1つで Session Manager が通ります。インスタンスプロファイルの伝播に少し時間がかかるので、次の起動まで10秒ほど置いたほうが安全。

### EC2 起動

AMI ID はハードコードせず、SSM Public Parameter から最新の Amazon Linux 2023 を引きます。

```bash
AMI_ID=$(aws ssm get-parameters --region $REGION \
  --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query 'Parameters[0].Value' --output text)

INSTANCE_ID=$(aws ec2 run-instances --region $REGION \
  --image-id $AMI_ID \
  --instance-type t3.micro \
  --subnet-id $SUBNET_PUB_A \
  --security-group-ids $SG_WEB \
  --associate-public-ip-address \
  --iam-instance-profile Name=${NAME}-ec2-ssm \
  --metadata-options "HttpTokens=required,HttpEndpoint=enabled" \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":20,"VolumeType":"gp3","Encrypted":true,"DeleteOnTermination":true}}]' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${NAME}-web}]" \
  --query 'Instances[0].InstanceId' --output text)

aws ec2 wait instance-running --region $REGION --instance-ids $INSTANCE_ID
```

`HttpTokens=required` は IMDSv2 の強制。SSRF でクレデンシャルを抜かれる古典的な攻撃をここで塞ぎます。

Elastic IP を割り当てて関連付ける。

```bash
read EIP_ALLOC EIP_ADDR <<< $(aws ec2 allocate-address --region $REGION --domain vpc \
  --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=${NAME}-web-eip}]" \
  --query '[AllocationId,PublicIp]' --output text)

aws ec2 associate-address --region $REGION \
  --instance-id $INSTANCE_ID --allocation-id $EIP_ALLOC

echo "EIP=$EIP_ADDR"
```

EIP を関連付けると、起動時に自動割り当てされたパブリック IP は破棄されて EIP に置き換わります。この瞬間に既存接続は切れる。

### RDS

```bash
aws rds create-db-subnet-group --region $REGION \
  --db-subnet-group-name ${NAME}-db-subnets \
  --db-subnet-group-description "private subnets for ${NAME}" \
  --subnet-ids $SUBNET_PRI_A $SUBNET_PRI_C

aws rds create-db-instance --region $REGION \
  --db-instance-identifier ${NAME}-db \
  --engine mysql \
  --db-instance-class db.t4g.micro \
  --allocated-storage 20 \
  --storage-type gp3 \
  --storage-encrypted \
  --master-username admin \
  --manage-master-user-password \
  --db-name appdb \
  --db-subnet-group-name ${NAME}-db-subnets \
  --vpc-security-group-ids $SG_DB \
  --no-publicly-accessible \
  --no-multi-az \
  --backup-retention-period 7 \
  --auto-minor-version-upgrade \
  --deletion-protection

aws rds wait db-instance-available --region $REGION --db-instance-identifier ${NAME}-db

DB_ENDPOINT=$(aws rds describe-db-instances --region $REGION \
  --db-instance-identifier ${NAME}-db \
  --query 'DBInstances[0].Endpoint.Address' --output text)
DB_SECRET_ARN=$(aws rds describe-db-instances --region $REGION \
  --db-instance-identifier ${NAME}-db \
  --query 'DBInstances[0].MasterUserSecret.SecretArn' --output text)
```

指定のうち効いているものを3つ。

`--manage-master-user-password` はパスワードを自分で決めず Secrets Manager に自動生成とローテーションを任せるオプション。シェル履歴やスクリプトに平文パスワードが残らない。`--no-publicly-accessible` はプライベートサブネットに置いていても明示する。`--deletion-protection` は消すときに一手間増えるけど付けておく。

作成には5分から10分かかります。

### Route 53

ドメインを取得済みで、ネームサーバーを Route 53 に向けられる前提。

```bash
HZ_ID=$(aws route53 create-hosted-zone \
  --name $DOMAIN \
  --caller-reference "${NAME}-$(date +%s)" \
  --query 'HostedZone.Id' --output text | sed 's|/hostedzone/||')

aws route53 get-hosted-zone --id $HZ_ID --query 'DelegationSet.NameServers' --output text
```

出てきた4つの NS を、ドメインを買ったレジストラ側のネームサーバー設定に貼ります。ここをやらないと世界からはずっと名前が引けない。反映は数分から48時間。

A レコードを作る。

```bash
cat > /tmp/rrset.json <<EOF
{
  "Comment": "web A record",
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "${HOST}",
      "Type": "A",
      "TTL": 300,
      "ResourceRecords": [{"Value": "${EIP_ADDR}"}]
    }
  }]
}
EOF

CHANGE_ID=$(aws route53 change-resource-record-sets \
  --hosted-zone-id $HZ_ID --change-batch file:///tmp/rrset.json \
  --query 'ChangeInfo.Id' --output text)

aws route53 wait resource-record-sets-changed --id $CHANGE_ID
```

エイリアスレコードは ALB や CloudFront を指すときのもの。生の EIP に向けるなら通常の A レコードで TTL を自分で決めます。

## マネジメントコンソールで作る

同じものを画面から作る手順。項目名は改定されることがあるので、違っていたら意味で読み替えてください。

まず右上のリージョンセレクタを「アジアパシフィック（東京）ap-northeast-1」にする。ここが違うまま作り始めて、後で「作ったはずのサブネットが選択肢に出てこない」となるのがコンソール最大の事故です。

Billing の予算で $10 くらいのアラートを1つ作っておくのも、消し忘れに気づけるので悪くない。

### ネットワークをウィザードで一括作成

VPC ダッシュボードの「VPC を作成」を開いて、上部のトグルで「VPC など」を選びます。「VPC のみ」だとサブネットも IGW も自分で作ることになる。右側に構成図のプレビューが出るので、入力しながらそこを見て確認する。

| 項目 | 設定値 |
|---|---|
| 名前タグの自動生成 | チェックON / `minimal` |
| IPv4 CIDR ブロック | `10.0.0.0/16` |
| IPv6 CIDR ブロック | IPv6 CIDR ブロックなし |
| テナンシー | デフォルト |
| アベイラビリティーゾーンの数 | 2 |
| AZ のカスタマイズ | `ap-northeast-1a` / `ap-northeast-1c` |
| パブリックサブネットの数 | 2 |
| プライベートサブネットの数 | 2 |
| NAT ゲートウェイ | なし |
| VPC エンドポイント | なし（または S3 ゲートウェイ） |
| DNS ホスト名を有効化 | チェックON |
| DNS 解決を有効化 | チェックON |

<Callout type="warn">
NAT ゲートウェイの欄でうっかり「1 AZ 内」を選ぶと、その瞬間から時間課金が始まります。プレビュー図に NAT が現れていないことを目で確かめてから作成する。
</Callout>

CIDR ブロックのカスタマイズを開くと各サブネットの CIDR を手で指定できます。デフォルトだと `/20` のような広い切り方になるので、CLI 手順と揃えるならパブリックを `10.0.0.0/24` と `10.0.1.0/24`、プライベートを `10.0.10.0/24` と `10.0.11.0/24` にする。

余談だけど、このウィザードの「VPC など」という名前は英語の "VPC and more" の直訳で、初見だと何のことか分からない。日本語版のコンソールはこういう箇所がときどきある。話が逸れました。

ウィザードは対称に4サブネット作るので、CLI 手順の3つより1つ多くなります。余るパブリックサブネット（1c）は空のまま置いておく。後で ALB を足すときに2 AZ 分のパブリックサブネットが必要になるので、むしろ都合がいい。

ルートテーブルは3つできます。`minimal-rtb-public` に `0.0.0.0/0 → minimal-igw` が入ってパブリックサブネット2つが紐づき、プライベート用が AZ ごとに1つずつ `local` のみで作られる。作成後に「リソースマップ」タブを開くと結線が図で見えるので、プライベートサブネットから IGW への線が引かれていないことを確認しておく。

### セキュリティグループ

VPC ダッシュボードの左メニューから「セキュリティグループ」を開いて2つ作ります。EC2 コンソール側からも同じ画面に行けるけど、VPC を選び間違えないよう VPC コンソールから作るほうがいい。

web 用は名前を `minimal-web`、VPC を `minimal-vpc` にする。VPC の欄はデフォルトの VPC が選ばれているので必ず変更する。インバウンドは HTTP(80) と HTTPS(443) をどちらも `0.0.0.0/0` から。アウトバウンドはデフォルトの全許可をそのまま残す。これがないと SSM エージェントが AWS に繋がらず、Session Manager で入れなくなります。

db 用は名前を `minimal-db`、インバウンドは MYSQL/Aurora の 3306 を1本だけ。ソースの欄で「カスタム」を選んで入力欄をクリックすると SG の候補がドロップダウンで出てくるので、そこで `minimal-web` を選ぶ。CIDR ではなく SG を指定するのがポイント。

### IAM ロール

IAM の「ロール」から「ロールを作成」。信頼されたエンティティタイプは AWS のサービス、ユースケースは EC2。許可の検索欄に `AmazonSSMManagedInstanceCore` と入れてチェックを入れる。これ1つだけ。ロール名は `minimal-ec2-ssm`。

コンソール経由だとインスタンスプロファイルが自動で同名で作られます。CLI だと別途作る必要があった部分がここでは省略される。

### EC2

「インスタンスを起動」から順に埋めていきます。

- 名前は `minimal-web`
- AMI はクイックスタートの Amazon Linux → `Amazon Linux 2023 AMI`、64ビット（x86）
- インスタンスタイプは `t3.micro`
- キーペアは「キーペアなしで続行（推奨されません）」を選ぶ。警告が出るけど SSM で入る前提なので問題ない。むしろ鍵ファイルを管理しないぶん安全

ネットワーク設定は右の「編集」を押して展開します。

| 項目 | 設定値 |
|---|---|
| VPC | `minimal-vpc` |
| サブネット | `minimal-subnet-public1-ap-northeast-1a` |
| パブリック IP の自動割り当て | 有効化 |
| ファイアウォール | 既存のセキュリティグループを選択 |
| 共通のセキュリティグループ | `minimal-web` |

「パブリック IP の自動割り当て」はサブネット設定を継承して無効になっていることがあります。無効だと起動後に SSM で入れず、原因が分かりにくい。明示的に有効化する。

ファイアウォールの欄はデフォルトが「セキュリティグループを作成する」で、放っておくと SSH 22 番が全開放の SG が新規作成されます。必ず「既存のセキュリティグループを選択」に切り替える。

ストレージは 20 GiB / gp3 にして、「詳細」を開いて暗号化を有効に。

「高度な詳細」は折りたたまれているので開きます。IAM インスタンスプロファイルに `minimal-ec2-ssm`、メタデータのバージョンに「V2 のみ（トークンは必須）」。一番下のユーザーデータ欄に nginx を入れておくなら次を貼る。

```bash
#!/bin/bash
dnf install -y nginx mariadb105
systemctl enable --now nginx
echo "<h1>hello from $(hostname)</h1>" > /usr/share/nginx/html/index.html
```

起動後、EC2 の「Elastic IP」から「Elastic IP アドレスを割り当てる」→ アクション →「Elastic IP アドレスの関連付け」でインスタンスに紐づける。表示された IP を Route 53 で使うのでメモしておく。

### RDS

先に DB サブネットグループを作ります。RDS の左メニュー「サブネットグループ」→「DB サブネットグループを作成」。名前は `minimal-db-subnets`、VPC は `minimal-vpc`、AZ に `1a` と `1c` を選んでから、サブネットでプライベート側の2つを選ぶ。AZ を先に選ばないとサブネットの候補が出てきません。

ここでパブリックサブネットを混ぜると、後で「パブリックアクセス可能」を有効化された瞬間に DB がインターネットから見える構成になってしまう。プライベート側だけにする。

次に「データベースの作成」。ここで「標準作成」を選ぶ。

<Callout type="warn">
「簡易作成」だと VPC・サブネットグループ・セキュリティグループを選ぶ画面が出ません。デフォルト VPC に作られてしまうので、必ず標準作成にする。
</Callout>

主な設定はこう。

| 項目 | 設定値 |
|---|---|
| エンジン | MySQL、最新の 8.0 系 |
| テンプレート | 開発/テスト（無料利用枠が使えるならそちら） |
| DB インスタンス識別子 | `minimal-db` |
| マスターユーザー名 | `admin` |
| 認証情報管理 | AWS Secrets Manager で管理 |
| インスタンスクラス | `db.t4g.micro` |
| ストレージ | gp3 / 20 GiB / 自動スケーリング最大 100 GiB |
| 可用性と耐久性 | 単一の DB インスタンス |
| VPC | `minimal-vpc` |
| DB サブネットグループ | `minimal-db-subnets` |
| パブリックアクセス | なし |
| VPC セキュリティグループ | 既存の選択 → `minimal-db` |

テンプレートで「本番稼働用」を選ぶとマルチ AZ と Provisioned IOPS がデフォルトになって、月額が数倍に跳ねます。検証なら開発/テスト。

VPC セキュリティグループの欄はデフォルトで `default` SG が入っています。これを削除して `minimal-db` だけにする。ここを見落とすと `default` SG のルール次第で繋がらなくなる。

「追加設定」を開いて、最初のデータベース名に `appdb`、バックアップ保持期間7日、暗号化を有効、マイナーバージョン自動アップグレードを有効、削除保護を有効。最初のデータベース名を空にするとインスタンスはできるけど中にスキーマが1つもない状態になるので、ここで書いておくと手数が少ない。

画面下部に月額の見積もりが出ているので、想定と合っているか見てから「データベースを作成」。

### Route 53

「ホストゾーン」→「ホストゾーンの作成」で、ドメイン名を入れてタイプは「パブリックホストゾーン」。作成すると `NS` と `SOA` が自動で入ります。

その NS の4つの値を、ドメインを買ったレジストラ側のネームサーバー設定に貼る。Route 53 でドメインを登録した場合は自動で繋がっているので何もしなくていい。他社で取った場合はこの作業が必須です。

続けて「レコードを作成」。レコード名を `www`、レコードタイプを A、エイリアスはオフ、値に Elastic IP、TTL は 300、ルーティングポリシーはシンプルルーティング。ルートドメインでもアクセスさせたいなら、レコード名を空にしたレコードをもう1つ同じ値で作る。

ホストゾーンは1つあたり月 $0.50 程度の固定費がかかります。作って消してを繰り返すテストは避けたい。

## 動作確認

EC2 のインスタンスを選択して上部の「接続」ボタン、「セッションマネージャー」タブから「接続」。ブラウザ内にターミナルが開きます。

「接続」がグレーアウトしている場合、原因はだいたい4つのどれか。

- IAM ロールが付いていない、または `AmazonSSMManagedInstanceCore` が足りていない
- パブリック IP が付いていないので SSM エンドポイントに到達できない
- SG のアウトバウンドが閉じている
- 起動直後でエージェントの登録がまだ終わっていない。2〜3分待つ

Systems Manager のフリートマネージャーを開くと、インスタンスが管理対象として認識されているか確認できます。ここに出てこないなら上の1から3を疑う。

セッション内から RDS に繋ぐ。

```bash
mysql -h minimal-db.xxxxxxxx.ap-northeast-1.rds.amazonaws.com -u admin -p appdb
```

パスワードは Secrets Manager から取ります。コンソールなら RDS の「設定」タブにあるマスター認証情報 ARN のリンクから飛んで「シークレットの値を取得する」。CLI なら次。

```bash
aws secretsmanager get-secret-value --region $REGION \
  --secret-id $DB_SECRET_ARN --query SecretString --output text
```

ここでタイムアウトするなら、`minimal-db` SG のインバウンドのソースが `minimal-web` SG になっているかを見る。CIDR で書いてしまっていたり、`default` SG が RDS に付いたままだと通りません。

外から確認。

```bash
dig +short www.example.com
curl -I http://www.example.com
```

`dig` が EIP を返して `curl` が `HTTP/1.1 200 OK` を返せば完成。`dig` が何も返さないならネームサーバーの委任がまだ効いていない。

## HTTPS がここだけ素直にいかない

最小構成の弱点がここで、ACM で発行した無料証明書は EC2 に直接インストールできません。ACM のパブリック証明書は ALB / CloudFront / API Gateway などのマネージドサービスでしか使えない仕様なので。

選択肢は2つ。EC2 上で certbot（Let's Encrypt）を動かすか、ALB + ACM を足すか。前者は追加コストゼロだけど90日ごとの更新を cron に任せることになる。後者は証明書の更新が完全に自動になるけど、ALB の時間課金と LCU 課金が乗るし、パブリックサブネットを2 AZ 分用意する必要が出る。

1台構成で運用の手間を減らしたいなら certbot、将来のスケールを見るなら ALB、という整理はできるものの、どちらを選ぶべきかは自分の中でも決着していません。証明書の更新が止まってサイトが落ちるリスクと、月数千円の固定費を天秤にかける話で、判断はサイトの性質によって変わりそう。ここは実際に運用してみないと分からない部分だと思っています。

## 踏みやすいところ

| 症状 | 原因 |
|---|---|
| 作ったサブネットが選択肢に出ない | 右上のリージョンが違う |
| VPC ウィザードの後で請求が増えた | NAT ゲートウェイを「1 AZ 内」以上にしていた |
| EC2 に SSM で繋がらない | IAM インスタンスプロファイル未設定、またはパブリック IP なし |
| SSH 22 が全世界に開いていた | 起動時のファイアウォールを「新規作成」のままにした |
| RDS で VPC を選ぶ欄がない | 「簡易作成」を選んでいる |
| RDS に繋がらない | `default` SG が付いたまま、`minimal-db` が付いていない |
| RDS が消せない | 削除保護が有効。変更画面でオフにしてから削除 |
| 名前解決されない | レジストラ側の NS を Route 53 のものに変えていない |
| 停止起動したら IP が変わった | EIP を関連付けていない |
| SG が消せない | ENI がまだ残っている（EC2 / RDS の削除待ち） |
| RDS のエンドポイント名が引けない | `enableDnsHostnames` が false のまま |

## 後片付け

検証で作ったなら消す。依存関係の逆順にやらないと `DependencyViolation` で止まります。

```bash
# Route 53
cat > /tmp/rrdel.json <<EOF
{"Changes":[{"Action":"DELETE","ResourceRecordSet":{
  "Name":"${HOST}","Type":"A","TTL":300,
  "ResourceRecords":[{"Value":"${EIP_ADDR}"}]}}]}
EOF
aws route53 change-resource-record-sets --hosted-zone-id $HZ_ID --change-batch file:///tmp/rrdel.json
aws route53 delete-hosted-zone --id $HZ_ID

# RDS（削除保護を外してから）
aws rds modify-db-instance --region $REGION --db-instance-identifier ${NAME}-db \
  --no-deletion-protection --apply-immediately
aws rds delete-db-instance --region $REGION --db-instance-identifier ${NAME}-db \
  --skip-final-snapshot --delete-automated-backups
aws rds wait db-instance-deleted --region $REGION --db-instance-identifier ${NAME}-db
aws rds delete-db-subnet-group --region $REGION --db-subnet-group-name ${NAME}-db-subnets

# EC2 と EIP
aws ec2 terminate-instances --region $REGION --instance-ids $INSTANCE_ID
aws ec2 wait instance-terminated --region $REGION --instance-ids $INSTANCE_ID
aws ec2 release-address --region $REGION --allocation-id $EIP_ALLOC

# SG（参照している db 側を先に）
aws ec2 delete-security-group --region $REGION --group-id $SG_DB
aws ec2 delete-security-group --region $REGION --group-id $SG_WEB

# ネットワーク
aws ec2 delete-route-table --region $REGION --route-table-id $RTB_PUB
aws ec2 detach-internet-gateway --region $REGION --internet-gateway-id $IGW_ID --vpc-id $VPC_ID
aws ec2 delete-internet-gateway --region $REGION --internet-gateway-id $IGW_ID
for S in $SUBNET_PUB_A $SUBNET_PRI_A $SUBNET_PRI_C; do
  aws ec2 delete-subnet --region $REGION --subnet-id $S
done
aws ec2 delete-vpc --region $REGION --vpc-id $VPC_ID

# IAM
aws iam remove-role-from-instance-profile --instance-profile-name ${NAME}-ec2-ssm --role-name ${NAME}-ec2-ssm
aws iam delete-instance-profile --instance-profile-name ${NAME}-ec2-ssm
aws iam detach-role-policy --role-name ${NAME}-ec2-ssm --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam delete-role --role-name ${NAME}-ec2-ssm
```

コンソールでやる場合も同じ順序。RDS は変更画面で削除保護をオフにして「すぐに適用」してから、アクション → 削除 → 最終スナップショットのチェックを外して、確認欄に `delete me` と入力する。

VPC の削除だけは楽で、コンソールで「VPC を削除」を押すと配下のサブネット・ルートテーブル・IGW・関連付けをまとめて消してくれます。ただし ENI が1本でも残っていると止まるので、EC2 と RDS が完全に消えたことを確認してから実行する。

<Callout type="warn">
Elastic IP の解放漏れと Route 53 ホストゾーンの残りが、地味に課金が続く2大パターンです。EIP は未使用でもアタッチ済みでも、パブリック IPv4 アドレス自体に時間課金がかかります。翌日以降に Cost Explorer で $0 になっているか見ておくのが確実。
</Callout>

## ここから足していく順番

最小構成で動いたあと、要件が出てきたら足す。優先度の順に並べるとこうなると思っています。

1. HTTPS。certbot か ALB + ACM。公開するなら避けられない
2. RDS のバックアップからの復元手順の確認。課金は既に発生しているので、使えることを確かめておく
3. VPC Flow Logs。障害が起きてから有効化しても過去は取れない
4. RDS のマルチ AZ。料金がおよそ倍になるので、可用性要件が出てから
5. パブリックサブネット2 AZ + ALB + Auto Scaling。EC2 1台の単一障害点を消す段階
6. EC2 をプライベートに移して NAT Gateway を置く。ALB を前に置いたら EC2 にパブリック IP は不要になる
7. S3 用の Gateway エンドポイント

6 と 7 は同時にやるのがいい。NAT を入れた直後に S3 トラフィックを NAT に流すと、その分が丸ごとデータ処理料になります。Gateway エンドポイントは無料なので、NAT を置いたら必ずセットで作る。

## コンソールと CLI をどう使い分けるか

VPC ウィザードは正直よくできていて、ネットワークだけならコンソールのほうが速いし間違いにくい。プレビュー図でルーティングを目視確認できるのは CLI にない利点です。

ただ同じ環境を dev / stg / prod と3回作るなら、コンソール作業は必ずどこかで揺れます。「stg だけ削除保護が付いていない」みたいな差分が後から見つかる。2回目以降を作る予定があるなら、1回目はコンソールで作って構造を理解して、そのあと Terraform か CloudFormation に落とす順序がよさそう。

自分用のメモとして書き始めたけど、書いてみると「なんでこの設定が要るのか」を言葉にする過程が一番の収穫でした。よければ手元で1回作って消してみてください。作るより消すほうが依存関係の理解が進みます。

## 参考

<LinkCard url="https://docs.aws.amazon.com/vpc/latest/userguide/" title="Amazon VPC User Guide" description="サブネットの予約 IP、ルートテーブル、エンドポイントの仕様はここを参照" />

<LinkCard url="https://aws.amazon.com/vpc/pricing/" title="Amazon VPC Pricing" description="NAT Gateway・エンドポイント・データ転送の料金体系" />

<LinkCard url="https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/" title="Building a Scalable and Secure Multi-VPC AWS Network Infrastructure" description="複数 VPC の設計指針。Peering と Transit Gateway の使い分け" />

これはclaude codeで生成しました。
