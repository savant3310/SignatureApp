/* state.js — the single mutable app state. Every module imports this object. */
import { ACCENTS } from './config.js';

export const state = {
  name: 'Jessica Brooks',
  title: 'Head of Partnerships',
  company: 'Zapier',
  email: 'j.brooks@company.com',
  website: 'www.company.com',
  phone: '',
  accent: ACCENTS[0],
  photoImg: null,
  photoAdjust: { zoom: 1, ox: 0, oy: 0 },
  logo: { type: 'wordmark', src: null, img: null, frames: null, totalDelay: 0, adjust: { zoom: 1, ox: 0, oy: 0 } },
  socials: ['linkedin','instagram','youtube'],
  badge: true
};
