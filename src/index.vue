<template>
  <div>
    <h3>
        {{ prolife }}
    </h3>
    <div class = "row" >
      <div class="col-sm-4 col-xs-10">
        <table class='table table-striped table-bordered table-sm'>
          <thead>
            <th>{{ headerKey }}</th>
            <th>{{ headerValue }}</th>
          </thead>
          <tbody>
            <tr>
              <td>name</td>
              <td>高橋 昌弘</td>
            </tr>
            <tr>
              <td>Birthday</td>
              <td>1992/4/30</td>
            </tr>
            <tr>
              <td>twitter</td>
              <td>
                <a href="https://twitter.com/ImpureSilver11">
                  @ImpureSilver11
                </a>
              </td>
            </tr>
            <tr>
              <td>qiita</td>
              <td>
                <a href="https://qiita.com/ImpureSilver11">
                  ImpureSilver11
                </a>
              </td>
            </tr>
            <tr>
              <td>homepage</td>
              <td>
                <a href="https://impuresilver11.hateblo.jp/">
                  ImpureSilver11
                </a>
              </td>
            </tr>
            <tr>
              <td>github(会社用)</td>
              <td>
                <a href="https://github.com/takahashimasahiro">
                  MTakahashi
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      <!-- <div class="col-sm-4 "> -->
      <em>経歴</em>
      <table class='table table-striped table-bordered table-sm'>
        <thead>
          <th>key</th>
          <th>value</th>
        </thead>
        <tbody>
          <tr>
            <td>東京電機大学</td>
            <td>~ 2016/3/31</td>
          </tr>
          <tr>
            <td>SIer企業</td>
            <td>2016/4/1 ~ 2018/8/31</td>
          </tr>
          <tr>
            <td>株式会社DEPARTURE</td>
            <td>2018/9/~now</td>
          </tr>
        </tbody>
      </table>
      <em>スキル</em>
      <ul>言語およびフレームワーク
        <li>Kotlin</li>
        <li>Java</li>
        <li>JavaScript</li>
        <li>Ruby</li>
        <li>jQuery</li>
        <li>Vuejs(studying)</li>
        <li>Rails</li>
        <li>VB.NET</li>
        <li>C#</li>
        <li>.NET Framework(~4.7)</li>
      </ul>
      <ul>server side
          <li>docker</li>
          <li>kubernetes</li>
      </ul>
      <ul>DB
        <li>MySQL</li>
        <li>PostgreSQL</li>
        <li>SQLServer</li>
        <li>firebase</li>
      </ul>
      <ul>プロジェクト管理
        <li>subversion</li>
        <li>git</li>
        <li>git hub</li>
        <li>git hub flow</li>
      </ul>
      <ul>パッケージ
        <li>yarn</li>
        <li>npm</li>
        <li>webpack</li>
        <li>webpacker</li>
      </ul>
      <ul>通信周り
        <li>REST</li>
        <li>Protocol Buffers</li>
        <li>gRPC</li>
      </ul>
      <li><a href="./biography/">biography</a></li>
      <em>作ったものとか</em>
      <ul>
        <li><a href="https://github.com/takahashimasahiro/kintai_app">勤怠app</a></li>
        <li><a href="https://fir-clone-f614e.firebaseapp.com/">firebaseで遊ぶ</a></li>
        <!-- <li><a href="https://takaonagayan.herokuapp.com/">よくわからないサイト</a></li> -->
        <li><a href="./othello/#/">製作中</a></li>
      </ul>
    </div>
  </div>
  </div>
</template>
<script>
export default {
    data () {
      return{
        prolife: 'プロフィール',
        headerKey: 'key',
        headerValue: 'Value',
        tableData: ''
      }
    },
}
</script>
<style lang="less">

</style>
