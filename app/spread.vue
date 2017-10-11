<template>
  <b-card no-block class="w-100 mx-auto" header-tag="header">
    <h1 slot="header" class="brand-font text-center">{{ name }}</h1>
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" class="card-block mx-auto mb-3 cards"
      :viewBox="viewBox" :style="style">
      <image v-for="card in dealt" :xlink:href="card.card.img" width="16" height="28"
        x="-8" y="-14" :transform="`translate(${card.x}, ${card.y}) rotate(${card.rotate})`" />
    </svg>
    <div class="card-block">
      <b-button variant="primary" @click="deal">Start Over</b-button>
      <b-button :disabled="!deck.length" class="ml-4" variant="info" @click="add">
        Extra Card
      </b-button>
    </div>
    <footer slot="footer">
      <ol v-if="dealt.length">
        <li v-for="item in dealt">
          <span v-if="item.name">{{ item.name }}: </span>
          <strong>{{ item.card.name }}</strong>
          <span v-if="item.inverted"> (inverted)</span>
        </li>
      </ol>
    </footer>
  </b-card>
</template>

<style>
svg.cards {
  width: 100%;
  height: auto;
  overflow: scroll;
}
</style>

<script>
import LAYOUTS from './layouts';
import { default as CARDS, UNIT as PIXELS } from './cards';

const DEFAULT_LAYOUT = LAYOUTS[0];

export default {
  data () {
    return {
      dealt: [],
      deck: [],
      slug: '',
    };
  },
  computed: {
    layout () {
      return LAYOUTS.filter((l) => l.slug === this.slug)[0] || DEFAULT_LAYOUT;
    },
    name () {
      return this.layout.name;
    },
    width () {
      return this.layout.width;
    },
    height () {
      return this.layout.height;
    },
    viewBox () {
      return `${this.width / -2} ${this.height / -2} ${this.width} ${this.height}`;
    },
    style () {
      return `max-width: ${this.width * PIXELS / 2}; max-height: ${this.height * PIXELS / 2}`;
    },
  },
  methods: {
    deal () {
      this.deck = shuffle(this.layout.useMinor ? CARDS : CARDS.slice(0, 22));
      this.dealt = [];
      for (let i = 0; i < this.layout.positions.length; i += 1) {
        const inverted = this.layout.useInverted && Math.random() >= 0.5;
        const pos = this.layout.positions[i];
        this.dealt.push({
          card: this.deck.pop(),
          inverted,
          rotate: (pos.tilt || 0) + (inverted ? 180 : 0),
          ...pos,
        });
      }
    },
    add () {
      if (this.deck.length) {
        const card = this.deck.pop();
        const inverted = this.layout.useInverted && Math.random() >= 0.5;
        this.dealt.push({ card, inverted, rotate: inverted ? 180 : 0, ...this.layout.add });
      }
    },
  },
  created () {
    this.slug = this.$route.params.layout || DEFAULT_LAYOUT.slug;
    this.deal();
  },
  beforeRouteUpdate (to, from, next) {
    this.slug = to.params.layout || DEFAULT_LAYOUT.slug;
    this.deal();
    return next();
  },
};

function shuffle (deck) {
  const out = [];
  const remaining = deck.slice();
  while (remaining.length) {
    out.push(remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0]);
  }
  return out;
}
</script>
