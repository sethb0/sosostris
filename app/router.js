import Vue from 'vue/dist/vue.runtime.esm';
import VueRouter from 'vue-router/dist/vue-router.esm';
Vue.use(VueRouter);

import About from './about.vue';
import NotFound from './not-found.vue';
import Spread from './spread.vue';

const router = new VueRouter({
  mode: 'history',
  routes: [
    {
      path: '/spread/:layout',
      component: Spread,
    },
    {
      path: '/about',
      alias: '/',
      component: About,
    },
    {
      path: '*',
      component: NotFound,
    },
  ],
});

export default router;
