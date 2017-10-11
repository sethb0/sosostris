<template>
  <b-navbar variant="inverse" type="inverse" fixed="top" toggleable toggle-breakpoint="sm">
    <b-nav-toggle target="nav_collapse"></b-nav-toggle>

    <b-link class="navbar-brand" to="/about">
      <img :src="brandImage" :alt="navbarAlt">
      <span class="ml-3 brand-font">{{ title }}</span>
    </b-link>

    <b-collapse is-nav id="nav_collapse">
      <b-nav is-nav-bar>
        <b-nav-item v-for="layout in LAYOUTS" :key="layout.slug" :to="`/spread/${layout.slug}`">
          {{ layout.name }}
        </b-nav-item>
      </b-nav>
    </b-collapse>
  </b-navbar>
</template>

<script>
/* eslint no-process-env: off */
/* global process: false */
import brandImage from '../server/static/navbar-brand.png';
import LAYOUTS from './layouts';

export default {
  data () {
    return {
      brandImage,
      title: process.env.TITLE,
      navbarAlt: process.env.NAVBAR_ALT,
      LAYOUTS,
    };
  },
};
</script>
