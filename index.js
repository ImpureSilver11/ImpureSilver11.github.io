
import Vue from 'vue'
import Index from './src/index.vue'
import router from './src/route/index.js'

new Vue(
  {
    el: '#app',
    router,
    render: h => h(Index)
  }
);
