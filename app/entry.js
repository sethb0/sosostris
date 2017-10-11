/* eslint no-new: off */
import Vue from 'vue/dist/vue.runtime.esm';

import router from './router';
import App from './app.vue';

new Vue({
  el: '#app',
  router,
  render (h) {
    return h(App);
  },
});
