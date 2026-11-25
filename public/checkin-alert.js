// Nadlantours 24h Pre-Departure Check-In Notification & Auto-Fill Helper
(function () {
  function parseFlightDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const normalized = dateStr
      .replace(/صباحاً|صباحا|ص/g, 'AM')
      .replace(/مساءً|مساءا|م/g, 'PM')
      .replace(/ظهراً|ظهرا/g, 'PM')
      .replace(/[|،]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const dMatch = normalized.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dMatch) return null;
    const tMatch = normalized.match(/(\d{1,2}:\d{2})(?:\s*(AM|PM))?/i);
    let hh = 0, mm = 0;
    if (tMatch) {
      let [hStr, mStr] = tMatch[1].split(':');
      let h = parseInt(hStr, 10);
      mm = parseInt(mStr, 10);
      const mer = (tMatch[2] || '').toUpperCase();
      if (mer === 'PM' && h < 12) h += 12;
      if (mer === 'AM' && h === 12) h = 0;
      hh = h;
    }
    const dt = new Date(`${dMatch[1]}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function isWithin24HoursBeforeDeparture(flightDateStr) {
    const dep = parseFlightDate(flightDateStr);
    if (!dep) return false;
    const now = new Date();
    const diffMs = dep.getTime() - now.getTime();
    // Open within 24 hours before departure (up to flight time)
    return diffMs <= 24 * 60 * 60 * 1000 && diffMs >= -2 * 60 * 60 * 1000;
  }

  function autoFillCheckInInputs(flightPnr, lastName) {
    // Store in window.name & localStorage so airline / check-in page or browser extension/bookmarklet can read it
    const payload = { flightPnr: flightPnr || '', lastName: lastName || '', ts: Date.now() };
    try {
      localStorage.setItem('nadlan_last_checkin', JSON.stringify(payload));
    } catch (_) {}

    // Also try filling any matching input fields on the current page if present
    const inputs = Array.from(document.querySelectorAll('input'));
    for (const inp of inputs) {
      const hint = `${inp.name || ''} ${inp.id || ''} ${inp.placeholder || ''} ${inp.getAttribute('aria-label') || ''}`.toLowerCase();
      if (flightPnr && (hint.includes('pnr') || hint.includes('booking') || hint.includes('reference') || hint.includes('code') || hint.includes('حجز'))) {
        inp.value = flightPnr;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (lastName && (hint.includes('last') || hint.includes('surname') || hint.includes('family') || hint.includes('عائلة') || hint.includes('اللقب'))) {
        inp.value = lastName;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  window.NadlanCheckIn = {
    renderCheckInBanner: function (booking, containerId) {
      const container = document.getElementById(containerId);
      if (!container || !booking || !Array.isArray(booking.itinerary)) return;

      const outbound = booking.itinerary.find((s) => s.type === 'flight');
      if (!outbound || !outbound.date) return;

      if (!isWithin24HoursBeforeDeparture(outbound.date)) {
        container.innerHTML = '';
        return;
      }

      const flightPnr = (outbound.flightPnr || booking.pnr || '').trim().toUpperCase();
      const lastName = (outbound.passengerLastName || booking.lastName || '').trim();
      const checkInUrl = (outbound.checkInUrl || '').trim();
      const airlineName = (outbound.airlineName || 'شركة الطيران').trim();

      container.innerHTML = `
        <div id="nadlan-checkin-alert" dir="rtl" style="background:linear-gradient(135deg,#0f766e,#0284c7);color:#fff;padding:16px 20px;border-radius:14px;margin:14px 0;box-shadow:0 8px 24px rgba(2,132,199,0.25);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">
          <div>
            <div style="font-weight:800;font-size:16px;margin-bottom:4px;">✈️ فتح Check-in لرحلتك (${airlineName})</div>
            <div style="font-size:13px;opacity:0.95;">
              بقي أقل من 24 ساعة على موعد الذهاب (${outbound.date}) — رقم حجز الطيران: <b>${flightPnr}</b> | اسم العائلة: <b>${lastName}</b>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <button id="nadlan-checkin-btn" type="button" style="background:#facc15;color:#0f172a;font-weight:800;border:none;padding:10px 18px;border-radius:10px;cursor:pointer;font-size:14px;">
              شيك ان
            </button>
          </div>
        </div>
      `;

      const btn = document.getElementById('nadlan-checkin-btn');
      if (btn) {
        btn.addEventListener('click', async function () {
          autoFillCheckInInputs(flightPnr, lastName);
          const copyText = `PNR: ${flightPnr} | Last Name: ${lastName}`;
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(copyText);
            }
          } catch (_) {}

          const targetUrl =
            checkInUrl ||
            `https://www.google.com/search?q=${encodeURIComponent(airlineName + ' online check in')}`;
          window.location.href = targetUrl;
        });
      }
    }
  };
})();
