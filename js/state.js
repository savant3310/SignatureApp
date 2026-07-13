/* state.js — the single mutable app state. Every module imports this object. */
import { ACCENTS } from './config.js';
import { DEFAULT_TEMPLATE_ID } from './templates/index.js';

export const state = {
  template: DEFAULT_TEMPLATE_ID,
  name: 'Jessica Brooks',
  title: 'Head of Partnerships',
  company: 'Opraah',
  linkedin: 'linkedin.com/in/jessicabrooks',
  phone: '',
  accent: ACCENTS[0],
  photoImg: null,
  photoOriginalImg: null,
  avatarImg: null,
  photoAdjust: { zoom: 1, ox: 0, oy: 0 },
  logoImg: null,
  linkedinIconImg: null,
  instagramIconImg: null,
  websiteIconImg: null,
  badge: true
};
