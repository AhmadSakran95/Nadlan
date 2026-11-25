(function () {
  function cleanText(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function parseFlightMeta(text) {
    const t = cleanText(text);

    // Extract airline/ticket PNR (e.g. PNR: KV13VE or PNR الطيران: KV13VE or Booking Ref: ABC123)
    let pnr = '';
    const pnrRe = /(?:PNR(?:\s*الطيران)?|Booking\s*Ref(?:erence)?|رمز\s*الحجز|رقم\s*حجز\s*الطيران)\s*[:：#-]?\s*([A-Z0-9]{5,8})/i;
    const pnrM = t.match(pnrRe);
    if (pnrM && pnrM[1]) {
      pnr = pnrM[1].toUpperCase();
    }

    // Extract Flight number (e.g. Flight: W4 6406)
    let flightNo = '';
    const fnRe = /(?:Flight(?:\s*No\.?|Number)?|رقم\s*(?:الرحلة|الطيران))\s*[:：#-]?\s*([A-Z0-9]{2,3}\s*\d{2,4})/i;
    const fnM = t.match(fnRe);
    if (fnM && fnM[1]) {
      flightNo = fnM[1].replace(/\s+/g, ' ').toUpperCase();
    }

    // Extract Passengers after المسافرون: or Passengers:
    let passengers = [];
    const paxRe = /(?:المسافرون|Passengers?)\s*[:：]\s*([^|]+?)(?=\s*\||$)/i;
    const paxM = t.match(paxRe);
    if (paxM && paxM[1]) {
      passengers = paxM[1]
        .split(/،|,|\/|
/)
        .map((name) => name.replace(/^(?:MR\.?|MRS\.?|MS\.?|MISS\.?|DR\.?)\s+/i, '').trim())
        .filter((name) => name.length > 1 && !/^(?:PNR|Flight|الطيران|تحميل)/i.test(name));
    }

    return { pnr, flightNo, passengers };
  }

  function getOrCreatePopup() {
    let el = document.getElementById('nadlan-pax-popup');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'nadlan-pax-popup';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,0.72);backdrop-filter:blur(3px);z-index:9999;display:none;align-items:center;justify-content:center;padding:16px;';
    el.innerHTML = `
      <div style="background:#ffffff;border-radius:24px;max-width:440px;width:100%;padding:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.45);font-family:inherit;">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:16px;">
          <div>
            <div id="nadlan-pax-popup-title" style="font-size:18px;font-weight:800;color:#0f172a;">قائمة المسافرون</div>
            <div id="nadlan-pax-popup-sub" style="font-size:12px;color:#64748b;margin-top:2px;"></div>
          </div>
          <button type="button" id="nadlan-pax-popup-x" style="width:36px;height:36px;border-radius:12px;border:none;background:#f1f5f9;color:#0f172a;font-weight:800;cursor:pointer;">✕</button>
        </div>
        <div id="nadlan-pax-popup-body" style="display:flex;flex-direction:column;gap:10px;max-height:280px;overflow-y:auto;"></div>
        <button type="button" id="nadlan-pax-popup-close" style="margin-top:18px;width:100%;padding:12px;border-radius:14px;border:none;background:#0f172a;color:#ffffff;font-weight:800;font-size:14px;cursor:pointer;">إغلاق</button>
      </div>
    `;
    document.body.appendChild(el);

    const closePopup = () => {
      el.style.display = 'none';
    };
    el.addEventListener('click', (ev) => {
      if (ev.target === el) closePopup();
    });
    document.getElementById('nadlan-pax-popup-x').addEventListener('click', closePopup);
    document.getElementById('nadlan-pax-popup-close').addEventListener('click', closePopup);
    return el;
  }

  window.showNadlanPassengersPopup = function (idx) {
    const list = window.__NADLAN_FLIGHT_CARDS_DATA__ || [];
    const meta = list[idx] || { pnr: '', flightNo: '', passengers: [] };
    const popup = getOrCreatePopup();
    const titleEl = document.getElementById('nadlan-pax-popup-title');
    const subEl = document.getElementById('nadlan-pax-popup-sub');
    const bodyEl = document.getElementById('nadlan-pax-popup-body');

    titleEl.textContent = 'قائمة المسافرون';
    const infoBits = [];
    if (meta.pnr) infoBits.push('PNR: ' + meta.pnr);
    if (meta.flightNo) infoBits.push('Flight: ' + meta.flightNo);
    subEl.textContent = infoBits.join('  •  ');

    const pax = Array.isArray(meta.passengers) ? meta.passengers : [];
    if (pax.length === 0) {
      bodyEl.innerHTML = '<div style="padding:16px;border-radius:16px;background:#f8fafc;color:#475569;text-align:center;font-size:14px;font-weight:700;">لا توجد أسماء مسافرين مسجلة في هذه الرحلة.</div>';
    } else {
      bodyEl.innerHTML = pax
        .map(
          (name, i) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">
            <span style="font-size:14px;font-weight:800;color:#0f172a;">${name}</span>
            <span style="width:26px;height:26px;border-radius:9px;background:#0f172a;color:#fbbf24;font-size:12px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;">${i + 1}</span>
          </div>
        `
        )
        .join('');
    }

    popup.style.display = 'flex';
  };

  function findFlightContainers() {
    const root = document.getElementById('cust-itinerary-list') || document.getElementById('customer-dashboard-view');
    if (!root) return [];
    const listContainer = document.getElementById('cust-itinerary-list');
    if (listContainer && listContainer.children.length > 0) {
      return Array.from(listContainer.children);
    }
    return [];
  }

  function applyFlightEnhancements() {
    const cards = findFlightContainers();
    if (cards.length === 0) return;

    window.__NADLAN_FLIGHT_CARDS_DATA__ = [];
    let flightIndex = 0;

    cards.forEach((card) => {
      if (!card || card.id === 'nadlan-pax-popup') return;
      const text = cleanText(card.innerText || card.textContent || '');
      const looksLikeFlight =
        text.includes('طيران:') ||
        text.includes('Flight:') ||
        text.includes('إقلاع') ||
        Boolean(card.querySelector('.fa-plane, .fa-plane-departure'));

      if (!looksLikeFlight) return;

      const meta = parseFlightMeta(text);
      const bookingFlights = Array.isArray(window.__NADLAN_CURRENT_BOOKING__?.itinerary)
        ? window.__NADLAN_CURRENT_BOOKING__.itinerary.filter((s) => s && s.type === 'flight')
        : [];
      const stepObj = bookingFlights[flightIndex] || null;
      if (stepObj) {
        if (!meta.pnr && stepObj.flightPnr) meta.pnr = String(stepObj.flightPnr).toUpperCase().trim();
        if (meta.passengers.length === 0 && Array.isArray(stepObj.passengers)) {
          meta.passengers = stepObj.passengers.filter(Boolean);
        }
        if (meta.passengers.length === 0 && stepObj.notes) {
          const fromNotes = parseFlightMeta(stepObj.notes);
          if (fromNotes.passengers.length > 0) meta.passengers = fromNotes.passengers;
          if (!meta.pnr && fromNotes.pnr) meta.pnr = fromNotes.pnr;
          if (!meta.flightNo && fromNotes.flightNo) meta.flightNo = fromNotes.flightNo;
        }
      }

      const idx = flightIndex++;
      window.__NADLAN_FLIGHT_CARDS_DATA__[idx] = meta;

      const oldBar = card.querySelector('.nadlan-flight-bar-v14');
      if (oldBar) oldBar.remove();

      const bar = document.createElement('div');
      bar.className = 'nadlan-flight-bar-v14';
      bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px;margin-bottom:8px;';

      if (meta.pnr) {
        const pnrTag = document.createElement('span');
        pnrTag.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:#0f172a;color:#fbbf24;padding:7px 14px;border-radius:12px;font-size:12px;font-weight:800;font-family:monospace;';
        pnrTag.textContent = 'PNR: ' + meta.pnr;
        bar.appendChild(pnrTag);
      }

      if (meta.flightNo) {
        const fnTag = document.createElement('span');
        fnTag.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe;padding:7px 14px;border-radius:12px;font-size:12px;font-weight:800;font-family:monospace;';
        fnTag.textContent = 'Flight: ' + meta.flightNo;
        bar.appendChild(fnTag);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nadlan-open-pax-btn';
      btn.setAttribute('data-flight-idx', String(idx));
      btn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:#f59e0b;color:#0f172a;border:none;padding:8px 16px;border-radius:12px;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 2px 6px rgba(245,158,11,0.3);';
      btn.textContent = 'المسافرون' + (meta.passengers.length ? ' (' + meta.passengers.length + ')' : '');
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        window.showNadlanPassengersPopup(idx);
      });
      bar.appendChild(btn);

      const dlBtn = card.querySelector('a[download], a[href^="data:"], a[href^="blob:"]');
      if (dlBtn && dlBtn.parentElement) {
        dlBtn.parentElement.insertBefore(bar, dlBtn);
      } else {
        card.appendChild(bar);
      }
    });
  }

  let timer = null;
  function scheduleRun() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(applyFlightEnhancements, 100);
  }

  const dash = document.getElementById('customer-dashboard-view');
  if (dash && typeof MutationObserver !== 'undefined') {
    const obs = new MutationObserver(scheduleRun);
    obs.observe(dash, { childList: true, subtree: true, attributes: true });
  }

  setInterval(applyFlightEnhancements, 1200);
  window.addEventListener('load', () => setTimeout(applyFlightEnhancements, 200));
})();
