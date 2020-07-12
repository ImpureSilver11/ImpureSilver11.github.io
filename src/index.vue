<template>
  <div>
    <div>
      <keep-alive>
        <!-- <header_menu v-bind:is="menu"></header_menu> -->
        <component v-bind:is="header"></component>
      </keep-alive>
    </div>
    <div class = "row" >
      <div class="col-sm-4"></div>
      <div class="col-sm-4 col-xs-10">
        <h3>
          {{ prolife }}
        </h3>
        <em>{{ this.links.title }}</em>
        <table class='table table-striped table-bordered table-sm'>
          <thead>
            <th>{{ this.links.headerKey }}</th>
            <th>{{ this.links.headerValue }}</th>
          </thead>
          <tbody>
            <tr v-for="d in this.links.datas" v-bind:key='d'>
              <td>{{ d.key }}</td>
              <td v-if="d.link != ''">
                <a :href="d.link">
                  {{ d.value }}
                </a>
              <td v-else>
                {{ d.value }}
              </td>
            </tr>
          </tbody>
        </table>
        <em>{{ this.personal_history.title }}</em>
        <table class='table table-striped table-bordered table-sm'>
          <thead>
            <th>{{ this.personal_history.headerKey }}</th>
            <th>{{ this.personal_history.headerValue }}</th>
          </thead>
          <tbody>
            <tr v-for="career in this.personal_history.dates" v-bind:key='career'>
              <td>{{career.key}}</td>
              <td>{{career.value}}</td>
            </tr>
          </tbody>
        </table>
        <em>スキル(触れてきたことをとりあえず思いつく限り列挙)</em>
        <ul v-for="skil in this.skils" v-bind:key="skil">
          {{ skil.title }}
          <li v-for="name in skil.names " v-bind:key="name">
            {{ name.name }}
          </li>
        </ul>
        <li><a href="./biography/">biography</a></li>
        <em>作ったものとか</em>
        <ul>
          <li><a href="https://github.com/takahashimasahiro/kintai_app">勤怠app</a></li>
          <!-- <li><a href="https://fir-clone-f614e.firebaseapp.com/">firebaseで遊ぶ</a></li> -->
          <li><a href="https://takaonagayan.herokuapp.com/">工事中</a></li>
          <li><a href="https://impuresilver11.github.io/sudoku/">数独を作りたい</a></li>
          <li><a href="./othello/#/">オセロ</a></li>
        </ul>
        <ul>
          <li><a href="https://www.amazon.jp/hz/wishlist/ls/O62WMU63KR32?ref_=wl_share/">ほしい物リスト</a></li>
        </ul>
      </div>
      <div class="col-sm-4">
        last update 20190804
      </div>
    </div>
  </div>
</template>
<script>
import HeaderMenu from './pages/header.vue'

export default {
    component: {
      HeaderMenu
    },
    data () {
      return{
        menu: true,
        prolife: 'プロフィール',
        links: [],
        personal_history: [],
        skils: []
      }
    },
    created: function(){
      this.links = this.setLinkData()
      this.personal_history = this.setCareer()
      this.skils = this.setSkilSet()
    },
    methods: {
      // TODO: この辺のJSONはどっかからとってくるようにする
      // ファイル作っておいてもいいか
      setLinkData: function(){
        return {
          title: 'リンク',
          headerKey: 'key',
          headerValue: 'Value',
          datas: [{
            key: 'name',
            value: '高橋 昌弘',
            link: ''
          },
          {
            key: 'Birthday',
            value: '1992/4/30',
            link: ''
          },
          {
            key: 'twitter',
            value: '@ImpureSilver11',
            link: 'https://twitter.com/ImpureSilver11'
          },
          {
            key: 'qiita',
            value: 'ImpureSilver11',
            link: 'https://qiita.com/ImpureSilver11'
          },
          {
            key: 'blog',
            value: 'ImpureSilver11',
            link: 'https://impuresilver11.hateblo.jp/'
          },
          {
            key: 'github(趣味用)',
            value: 'ImpureSilver11',
            link: 'https://github.com/ImpureSilver11'
          },
          {
            key: 'github(会社用)',
            value: 'MTakahashi',
            link: 'https://github.com/takahashimasahiro'
          }
        ]
        }
      },
      setCareer: function(){
        return {
          title: '経歴',
          headerKey: 'key',
          headerValue: 'Value',
          dates: [
            {
              key: '東京電機大学',
              value: '~ 2016/3/31'
            },
            {
              key: '某IT企業',
              value: '2016/4/1 ~ 2018/8/31'
            },
            {
              key: '株式会社DEPARTURE',
              value: '2018/9/~now'
            }
          ]
        }
      },
      setSkilSet: function(){
        return[
          {
            title: '言語',
            names: [
              { name: 'Kotlin(少しふれた)' },
              { name: 'Java(昔触れた)' },
              { name: 'JavaScript(使わざるおえない)' },
              { name: 'Ruby(メインで使う)' },
              { name: 'python(少し触れた)' },
              { name: 'VB.NET(昔使ってた)' },
              { name: 'C#(少し使った)' },
              { name: 'GO(好き)' },
            ]
          },{
            title: 'フレームワーク',
            names:[
              { name: 'Vuejs(ちょこちょこ使う)' },
              { name: 'Rails(メインで使う)' },
              { name: 'flask(少し触れた)' },
              { name: 'go-gin(好き)' }
            ]
          },{
            title: 'DB',
            names:[
              { name: 'PostgreSQL(よく使う)' },
              { name: 'MySQL(少しふれた)' },
              { name: 'SQLServer(昔使ってた)' },
            ]
          }
        ]
      }
    }
}
</script>
<style lang="less">
</style>
