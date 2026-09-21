/* ── 5. WORLD CLOCK CYCLE ──────────────
   Rotates through global timezones every 7s
   — shows clients in any region that you're
   available in their time. Both the clock
   and the city label swap together with a
   quick fade so the transition feels smooth.
══════════════════════════════════════ */
(function(){
  const timeEl  = document.getElementById('tz-time');
  const labelEl = document.getElementById('tz-label');
  if (!timeEl || !labelEl) return;

  // Zones ordered: PH first (home), then major client markets
  const zones = [
    { tz: 'Asia/Manila',        flag: '🇵🇭', city: 'PH Time'  },
    { tz: 'America/New_York',   flag: '🇺🇸', city: 'New York' },
    { tz: 'Europe/London',      flag: '🇬🇧', city: 'London'   },
    { tz: 'America/Los_Angeles',flag: '🇺🇸', city: 'LA Time'  },
    { tz: 'Australia/Sydney',   flag: '🇦🇺', city: 'Sydney'   },
    { tz: 'Asia/Dubai',         flag: '🇦🇪', city: 'Dubai'    },
    { tz: 'Asia/Ho_Chi_Minh',  flag: '🇻🇳', city: 'Vietnam'  },
  ];

  let zoneIdx = 0;
  let seconds = 0; // counts up each tick; zone rotates every ZONE_SECS ticks
  const ZONE_SECS = 7;

  function getTime(tz) {
    const d    = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
    const h    = d.getHours();
    const m    = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${(h % 12) || 12}:${m} ${ampm}`;
  }

  function switchZone() {
    // Fade out → swap content → fade in
    timeEl.style.transition  = labelEl.style.transition = 'opacity .3s';
    timeEl.style.opacity     = labelEl.style.opacity    = '0';
    setTimeout(() => {
      const z = zones[zoneIdx];
      timeEl.textContent  = getTime(z.tz);
      labelEl.textContent = `${z.flag} ${z.city}`;
      timeEl.style.opacity = labelEl.style.opacity = '1';
    }, 320);
  }

  // Single interval does everything — no timer leaks
  const z0 = zones[0];
  timeEl.textContent  = getTime(z0.tz);
  labelEl.textContent = `${z0.flag} ${z0.city}`;

  let clockId = setInterval(tick, 1000);

  function tick() {
    seconds++;
    // Rotate zone every ZONE_SECS seconds
    if (seconds % ZONE_SECS === 0) {
      zoneIdx = (zoneIdx + 1) % zones.length;
      switchZone();
    } else {
      // Just update the clock for the current zone — no fade needed
      timeEl.textContent = getTime(zones[zoneIdx].tz);
    }
  }

  // Pause the clock when the tab is hidden — saves CPU/battery on background tabs
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(clockId);
    } else {
      // Sync immediately on return so the time isn't stale
      timeEl.textContent = getTime(zones[zoneIdx].tz);
      clockId = setInterval(tick, 1000);
    }
  });
})();


