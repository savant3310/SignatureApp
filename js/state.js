/* state.js — the single mutable app state. Every module imports this object. */
import { ACCENTS } from './config.js';

export const state = {
  name: 'Jessica Brooks',
  title: 'Head of Partnerships',
  company: 'Opraah',
  linkedin: 'linkedin.com/in/jessicabrooks',
  website: 'www.opraah.in',
  phone: '',
  accent: ACCENTS[0],
  photoImg: null,
  photoOriginalImg: null,
  avatarImg: null,
  photoAdjust: { zoom: 1, ox: 0, oy: 0 },
  logoImg: null,
  websiteIconImg: null,
  badge: true
};
