/* canvas.js — the main preview canvas + 2D context (shared singleton).
   Module scripts are deferred, so the DOM is ready when this runs. */
export const canvas = document.getElementById('stage');
export const ctx = canvas.getContext('2d');
