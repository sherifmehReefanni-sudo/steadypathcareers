/* Steady Path Careers: the one place the site's backend address lives (Nov 24, 2026, cutover switch).
   Every page that talks to the backend loads this file before its own script and reads window.SP_BACKEND:
   the portal (portal/index.html), the email answer page (assets/answer.js), the intake (assets/intake2.js, on /start/ and
   /start/v2/) and the Ghost Job Checker (free/ghost-check/ghost-check.js). No page has the address anywhere else.
   SP_BACKEND is a frozen {url, kind}, already checked here: kind 'apps-script' with exactly APPS_SCRIPT below, or kind
   'supabase' with exactly SUPABASE below (https://<20 lowercase letters>.supabase.co/functions/v1/api); otherwise url and kind
   are ''. When this file runs, it defines SP_BACKEND as a non-writable, non-configurable property of window. If SP_BACKEND,
   SPBackendUrl or SP_BACKEND_REFUSED already exists at that moment, it defines SP_BACKEND_REFUSED instead (or finds it there),
   and every caller then sends nothing. This guards against stray or malformed values, not against a script that runs before
   this file and is written to defeat it; the private cutover doc says what is out of reach and what would close it.
     'apps-script': the Google Apps Script web app (live today). The portal reads its data with GET ?action=me&t=...
     'supabase': the Supabase Edge Function api. Every action, me included, is a POST with the token in the body (M2).
   Each caller reads SP_BACKEND once, when it loads, through the same one-line check (the descriptor, the frozen value, the two
   exact address shapes and a matching kind), and keeps only that result. With url '' every caller refuses to send anything,
   to any host, and shows its usual connection error.
   The flip at cutover changes the LIVE line below, and the /answer/ page's connect-src in the same commit; the private cutover
   doc lists the exact lines and how to undo it. This file is loaded without a ?v= on purpose, and the service worker always
   asks the network for it first, so a flip reaches every open page on its next load. */
(function () {
  'use strict';
  var APPS_SCRIPT = 'https://script.google.com/macros/s/AKfycbywIXNDqOMhCuyNx9px8cKGQy4zsuDwxihOF_jMr_jTxv8QOy2OxBrlXC9WffPWZcU/exec';
  /* the production project's ref (20 lowercase letters). It stays 'production-ref-not-set' until the production project exists,
     and it is never the dev project's ref (the site checks refuse both once LIVE is SUPABASE). */
  var PRODUCTION_REF = 'production-ref-not-set';
  var SUPABASE = 'https://' + PRODUCTION_REF + '.supabase.co/functions/v1/api';
  var LIVE = APPS_SCRIPT;
  var API_URL = /^https:\/\/[a-z]{20}\.supabase\.co\/functions\/v1\/api$/;
  var VALUE = Object.freeze({ url: LIVE, kind: LIVE === SUPABASE ? 'supabase' : 'apps-script' });
  /* only this file's own object, and only its own two addresses */
  function check(b) {
    if (b !== VALUE) return '';
    if (b.kind === 'apps-script' && b.url === APPS_SCRIPT) return b.url;
    if (b.kind === 'supabase' && b.url === SUPABASE && API_URL.test(b.url)) return b.url;
    return '';
  }
  var url = check(VALUE);
  var RESULT = Object.freeze({ url: url, kind: url ? VALUE.kind : '' });
  function refuse() { try { Object.defineProperty(window, 'SP_BACKEND_REFUSED', { value: true }); } catch (e) { /* it exists already: callers refuse */ } }
  var own = Object.prototype.hasOwnProperty;
  if (own.call(window, 'SP_BACKEND') || own.call(window, 'SPBackendUrl') || own.call(window, 'SP_BACKEND_REFUSED')) { refuse(); return; }
  try { Object.defineProperty(window, 'SP_BACKEND', { value: RESULT, enumerable: true, writable: false, configurable: false }); } catch (e) { refuse(); }
})();
