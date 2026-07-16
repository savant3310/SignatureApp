/* templates/index.js — the template registry. Add a new design by writing
   templates/<id>.js (see classic.js for the shape every template must
   export: id, name, linkTable, photoBox, drawFrame) and listing it here. */
import classic from './classic.js';
import orbit from './orbit.js';

export const TEMPLATE_LIST = [classic, orbit];
export const TEMPLATES = Object.fromEntries(TEMPLATE_LIST.map(t => [t.id, t]));
export const DEFAULT_TEMPLATE_ID = classic.id;
