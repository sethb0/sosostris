<template>
  <b-card variant="info" class="w-75 mx-auto mb-3 text-center">
    <header slot="header">
      <h1>About</h1>
      <h1 class="display-4 brand-font">{{ title }}</h1>
    </header>
    <img :src="CARDS[1].img" :width="width" class="mr-4 mb-4 float-md-left">
    <img :src="CARDS[2].img" :width="width" class="ml-4 mb-4 float-md-right">
    <br class="clearboth hidden-md-up">
    <p class="card-text lead">Another joyful frobnitz from Metal Fatigue LLC!</p>
    <h1 class="card-text">How to Use:</h1>
    <p class="card-text">Select a layout from the navigation bar at the top of the screen.
      Tapping "Extra Card" deals one card at a time from the remainder of the deck. Tapping
      "Start Over" reshuffles the deck and deals a new spread.</p>
    <p class="card-text"><a href="http://www.lunarbistro.com/games/8-bit-tarot/">The 8-Bit
      Tarot</a> was designed by Indigo Kelleigh based on the artwork of Pamela Colman Smith from
      the Rider-Waite deck, rendered in the style of classic console video games.</p>
  </b-card>
</template>

<style>
br.clearboth { clear: both; }
</style>

<script>
/* eslint no-process-env: off */
/* global process: false */
import { default as CARDS, WIDTH } from './cards';

export default {
  data () {
    return {
      CARDS,
      width: WIDTH / 2,
      title: process.env.TITLE,
    };
  },
};
</script>
