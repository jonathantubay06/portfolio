/* ── 5. MANILA CLOCK ───────────────────
   Hero stat #4. Was a world clock that cycled through seven cities every
   7s ("7:41 PM · London"), which told a visitor nothing about Jonathan
   and showed flag emoji that Windows renders as two letters ("GB").

   Now it answers the question a remote client actually has, "if I write
   now, when will he see it?":
     2:41 PM
     ● Manila · Online now
       7h ahead of you
   The status is green inside working hours and grey outside them; the
   last line is worked out from the visitor's own timezone.

   Manila is UTC+8 all year (no daylight saving), so the offset is a
   constant rather than something to look up.
══════════════════════════════════════ */
(function(){
  const timeEl  = document.getElementById('tz-time');
  const labelEl = document.getElementById('tz-label');
  if (!timeEl || !labelEl) return;

  const TZ = 'Asia/Manila';
  const MANILA_UTC_OFFSET_H = 8;
  // Working hours, Manila time, Monday to Friday. Edit here if they change.
  const WORK = { start: 9, end: 18 };

  const fmtTime  = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  const fmtParts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23', weekday: 'short' });

  function relative() {
    // getTimezoneOffset is minutes BEHIND UTC, hence the minus.
    const diff = MANILA_UTC_OFFSET_H - (-new Date().getTimezoneOffset() / 60);
    if (diff === 0) return 'Same time as you';
    const abs = Math.abs(diff);
    const h = Math.floor(abs), m = Math.round((abs - h) * 60);
    const amount = (h ? h + 'h' : '') + (m ? (h ? ' ' : '') + m + 'm' : '');
    return amount + (diff > 0 ? ' ahead of you' : ' behind you');
  }

  // Built once; tick() only swaps text and one class.
  labelEl.textContent = '';
  const status = document.createElement('span');
  status.className = 'tz-status';
  const dot = document.createElement('span');
  dot.className = 'tz-dot';
  dot.setAttribute('aria-hidden', 'true');
  const statusText = document.createElement('span');
  status.append(dot, statusText);
  const rel = document.createElement('span');
  rel.className = 'tz-rel';
  rel.textContent = relative();
  labelEl.append(status, rel);

  function tick() {
    const now = new Date();
    timeEl.textContent = fmtTime.format(now);
    const p = {};
    fmtParts.formatToParts(now).forEach(x => { p[x.type] = x.value; });
    const hour = parseInt(p.hour, 10);
    const weekday = p.weekday !== 'Sat' && p.weekday !== 'Sun';
    const online = weekday && hour >= WORK.start && hour < WORK.end;
    status.classList.toggle('is-online', online);
    statusText.textContent = online ? 'Manila · Online now' : 'Manila · Away';
  }

  tick();
  // Align to the minute boundary, then tick once a minute.
  setTimeout(() => { tick(); setInterval(tick, 60000); }, (60 - new Date().getSeconds()) * 1000);
})();
