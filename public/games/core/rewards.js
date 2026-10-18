/* Respondent side of a published survey (/s/<code> links): sends the finished record to the server, then shows the
   coupon the survey offers. The code is shown once and nothing is kept on this device. A player can save it to their
   account: signed in, it is saved straight away; otherwise "Sign in to save this coupon" opens sign-in in a new tab,
   so this end screen stays, and the coupon is saved when that tab says the player has signed in. Saving uses the
   one-time claim token only this game was given (POST /api/coupons/claim). */
(function (root) {
  const QP = root.QP = root.QP || {};
  const UI = {
    saving: 'Saving your answers…', saved: 'Your answers are saved. Thank you!', failed: 'We couldn\'t save your answers.',
    retry: 'Try again', rewardKicker: 'Your reward from {company}', copy: 'Copy code', copied: 'Copied!',
    once: 'Copy or note this code now. It is only shown once.', signIn: 'Sign in to save this coupon',
    keeping: 'Saving to your coupons…', kept: 'Saved to your coupons.', allCoupons: 'See my coupons',
    playerOnly: 'Coupons are saved to player accounts, so note this code now.', used: 'This coupon has already been saved to an account.',
    claimFailed: 'We couldn\'t save this coupon. Note the code, then try again.',
    tooFast: 'Coupons go to answers given with a little more time, so this one didn\'t earn a code.',
    limit: 'This device has already collected today\'s coupons for this survey.',
    expired: 'This game session has expired. Please open the survey link again to save your answers.',
    busy: 'Too many answers have come from this device. Please try again later.'
  };

  // The signed-in account on this site (kept by the main app), if any.
  const signedIn = () => { try { const u = JSON.parse(root.localStorage.getItem('qp_cur') || 'null'); return u && u.token ? u : null; } catch (e) { return null; } };

  // playToken comes with the survey when the game loads; the server accepts one saved response per token.
  async function post(code, record, playToken) {
    const res = await fetch(`/api/surveys/${encodeURIComponent(code)}/responses`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ record, playToken })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
    return data;
  }

  /* Called by boot as QP.onComplete for short-link surveys. slot: the selector the reward card goes into. */
  QP.submitResponse = async function (code, record, slot, config, playToken) {
    const ui = QP.copy(UI, config, 'reward'), el = QP.el;
    const box = el('section', { class: 'qp-reward', role: 'status' }, el('p', { class: 'qp-reward-note' }, ui.saving));
    const host = document.querySelector(slot);
    if (host) host.append(box);
    let data, error;
    for (let attempt = 0; attempt < 3 && !data; attempt++) {
      try { data = await post(code, record, playToken); }
      catch (e) {
        error = e;
        // 4xx (an expired token, too many answers) fails the same way on a retry.
        if (e.status >= 400 && e.status < 500) break;
        if (attempt < 2) await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
      }
    }
    box.innerHTML = '';
    if (!data) {
      console.error('Could not save the response:', error && error.message);
      box.classList.add('qp-reward-error');
      const retryable = !(error && error.status >= 400 && error.status < 500);
      box.append(el('p', { class: 'qp-reward-note' }, ({ 403: ui.expired, 429: ui.busy })[error && error.status] || ui.failed),
        retryable ? el('button', { class: 'primary', onclick: () => { box.remove(); QP.submitResponse(code, record, slot, config, playToken); } }, ui.retry) : '');
      return;
    }
    if (!data.coupon) {
      box.append(el('p', { class: 'qp-reward-note' }, ui.saved));
      const why = ({ 'too-fast': ui.tooFast, limit: ui.limit })[data.couponWithheld];
      if (why) box.append(el('p', { class: 'qp-reward-note' }, why));
      return;
    }
    const c = data.coupon;
    const copy = el('button', { class: 'ghost qp-copy', onclick: async () => {
      try { await navigator.clipboard.writeText(c.code); copy.textContent = ui.copied; } catch (e) { /* clipboard blocked: the code is selectable */ }
    } }, ui.copy);
    const status = el('p', { class: 'qp-reward-note', role: 'status' });
    const actions = el('div', { class: 'qp-reward-actions' });
    box.classList.add('qp-reward-coupon');
    box.append(
      el('p', { class: 'qp-reward-kicker' }, QP.fill(ui.rewardKicker, { company: c.company })),
      el('h3', {}, c.title),
      c.detail ? el('p', { class: 'qp-reward-detail' }, c.detail) : '',
      el('div', { class: 'qp-code-row' }, el('code', { class: 'qp-code' }, c.code), copy),
      status, actions);
    if (data.claimToken) keepCoupon(data.claimToken, ui, status, actions);
  };

  function keepCoupon(claimToken, ui, status, actions) {
    let state = 'open';   // open, saving or done
    const done = message => {
      state = 'done'; actions.innerHTML = '';
      status.textContent = message + ' ';
      status.append(QP.el('a', { href: '/#coupons' }, ui.allCoupons));
    };
    async function claim() {
      const user = signedIn();
      if (!user || state !== 'open') return;
      if ((user.role || 'business') !== 'player') { status.textContent = ui.playerOnly; return; }
      state = 'saving'; status.textContent = ui.keeping;
      try {
        const res = await fetch('/api/coupons/claim', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token }, body: JSON.stringify({ claimToken }) });
        const body = await res.json().catch(() => ({}));
        if (res.ok || (res.status === 409 && body.yours)) {
          done(ui.kept);
          // An open My coupons page shows the new coupon straight away.
          if (root.BroadcastChannel) new BroadcastChannel('qp-coupons').postMessage('saved');
        } else if (res.status === 409) { state = 'done'; actions.innerHTML = ''; status.textContent = ui.used; }
        else { state = 'open'; status.textContent = res.status === 403 ? ui.playerOnly : ui.claimFailed; }
      } catch (e) { state = 'open'; status.textContent = ui.claimFailed; }
    }
    const user = signedIn();
    if (user) return claim();
    status.textContent = ui.once;
    actions.append(QP.el('button', { class: 'primary', onclick: () => root.open('/#save-coupon', 'qp-save-coupon') }, ui.signIn));
    // The sign-in tab says when the player has signed in; signing in any other way on this site counts too.
    root.addEventListener('message', e => { if (e.origin === root.location.origin && e.data && e.data.type === 'qp:signed-in') claim(); });
    root.addEventListener('storage', e => { if (e.key === 'qp_cur') claim(); });
  }
})(window);
