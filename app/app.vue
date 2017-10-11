<template>
  <div id="#app">
    <spread-navbar></spread-navbar>
    <div class="container mb-3">
      <router-view></router-view>
    </div>
  </div>
</template>

<script>
import '../server/static/server.css';
import '../server/static/CinzelDecorative.css';

import Navbar from './navbar.vue';

export default {
  components: { 'spread-navbar': Navbar },
};
</script>

<style>
.tall {
  height: 200px;
}
</style>
