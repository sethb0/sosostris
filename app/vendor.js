/* eslint no-process-env: off */
/* globals require: false, process: false */
require(`${process.env.BOOTSTRAP}/bootstrap.css`);
import 'bootstrap-vue/dist/bootstrap-vue.css';

import 'babel-polyfill';

import Vue from 'vue/dist/vue.runtime.esm';
import BootstrapVue from 'bootstrap-vue/dist/bootstrap-vue.esm';
Vue.use(BootstrapVue);
