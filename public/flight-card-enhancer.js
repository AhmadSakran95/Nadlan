(function () {
  function extractFlightDetailsFromText(rawText) {
    const txt = String(rawText || '').replace(/\s+/g, ' ').trim();

    // 1. PNR: matches PNR: KV13VE, PNR الطيران: KV13VE, Booking Ref: KV13VE, رمز الحجز: KV13VE
    let pnr = '';
    const pnrPatterns = [
      /(?:PNR(?:\s*الطيران)?|Booking\s*Ref(?:erence)?|رمز\s*الحجز|رقم\s*حجز\s*الطيران)[:\s#-]*([A-Z0-9]{5,8})/i,
      /PNR\s*[:\-]?\s*([A-Z0-9]{5,8})/i
    ];
    for (const re of pnrPatterns) {
      const m = txt.match(re);
      if (m && m[1]) {
        pnr = m[1].trim().toUpperCase();
        break;
      }
    }

    // 2. Flight Number: matches Flight: W4 6406, Flight No: W46406, رقم الرحلة: TK815, etc.
    let flightNumber = '';
    const fnPatterns = [
      /(?:Flight(?:\s*No\.?|Number)?|رقم\s*(?:الرحلة|الطيران))[:\s#-]*([A-Z0-9]{2,3}\s*\d{2,4})/i,
      /Flight\s*[:\-]?\s*([A-Z0-9]{2,3}\s*\d{2,4})/i
    ];
    for (const re of fnPatterns) {
      const m = txt.match(re);
      if (m && m[1]) {
        flightNumber = m[1].replace(/\s+/g, ' ').trim().toUpperCase();
        break;
      }
    }

    // 3. Passengers: look after "المسافرون:" or "Passengers:" up to "|" or end of string
    let passengers = [];
    const paxMatch = txt.match(/(?:المسافرون|Passengers?)\s*[:：]\s*([^|]+?)(?=\s*\||$)/i);
    if (paxMatch && paxMatch[1]) {
      passengers = paxMatch[1]
        .split(/،|,|\/|
/)
        .map((s) => s.replace(/^(?:MR\.?|MRS\.?|MS\.?|MISS\.?|DR\.?)\s+/i, '').trim())
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && !/^(?:PNR|Flight|الطيران|تحميل)/i.test(s));
    }

    // Fallback: if no explicit label, look for comma/Arabic-comma separated capitalized names after "الطيران:"
    if (passengers.length === 0) {
      const afterAirline = txt.match(/الطيران:\s*[^|]+(?:\|\s*([^|]+))?/);
      if (afterAirline && afterAirline[1]) {
        const candidate = afterAirline[1].trim();
        if ((candidate.includes('،') || candidate.includes(',')) && !/PNR|Flight/i.test(candidate)) {
          passengers = candidate.split(/،|,/).map((s) => s.trim()).filter(Boolean);
        }
      }
    }

    return { pnr, flightNumber, passengers };
  }

  function ensurePassengersModal() {
    let modal = document.getElementById('nadlan-passengers-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'nadlan-passengers-modal';
    modal.className = 'fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 hidden items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg">
              <i class="fa-solid fa-users"></i>
            </div>
            <div>
              <h4 id="pax-modal-title" class="text-base sm:text-lg font-extrabold text-slate-900">أسماء المسافرون</h4>
              <p id="pax-modal-subtitle" class="text-xs text-slate-500"></p>
            </div>
          </div>
          <button type="button" id="pax-modal-close-x" class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div id="pax-modal-list" class="space-y-2.5 max-h-72 overflow-y-auto"></div>
        <button type="button" id="pax-modal-close-btn" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl text-sm transition cursor-pointer">
          إغلاق
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    function hideModal() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal();
    });
    document.getElementById('pax-modal-close-x').addEventListener('click', hideModal);
    document.getElementById('pax-modal-close-btn').addEventListener('click', hideModal);
    return modal;
  }

  function getMetaForFlight(flightIdx) {
    const store = window.__NADLAN_FLIGHT_META__ || [];
    if (store[flightIdx]) return store[flightIdx];

    // Re-scan DOM on demand in case window store wasn't populated yet
    enhanceFlightCards(true);
    return (window.__NADLAN_FLIGHT_META__ || [])[flightIdx] || { flightNumber: '', pnr: '', passengers: [] };
  }

  window.openFlightPassengersPopup = function (flightIdx) {
    const modal = ensurePassengersModal();
    const meta = getMetaForFlight(flightIdx || 0);
    const titleEl = document.getElementById('pax-modal-title');
    const subEl = document.getElementById('pax-modal-subtitle');
    const listEl = document.getElementById('pax-modal-list');

    titleEl.textContent = 'أسماء المسافرون على الرحلة';
    const subParts = [];
    if (meta.flightNumber) subParts.push(`Flight: ${meta.flightNumber}`);
    if (meta.pnr) subParts.push(`PNR: ${meta.pnr}`);
    subEl.textContent = subParts.length > 0
      ? subParts.join('  •  ')
      : `عدد المسافرين: ${(meta.passengers || []).length}`;

    const paxList = Array.isArray(meta.passengers) ? meta.passengers : [];
    if (paxList.length === 0) {
      listEl.innerHTML = `
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-sm text-slate-500">
          لا توجد أسماء مسافرين مسجلة في هذه الرحلة.
        </div>
      `;
    } else {
      listEl.innerHTML = paxList
        .map(
          (name, idx) => `
          <div class="flex items-center justify-between bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 rounded-2xl px-4 py-3 transition">
            <div class="flex items-center gap-3">
              <span class="w-7 h-7 rounded-xl bg-slate-900 text-amber-400 font-mono text-xs font-extrabold flex items-center justify-center">${idx + 1}</span>
              <span class="text-sm font-extrabold text-slate-900">${name}</span>
            </div>
            <i class="fa-solid fa-passport text-blue-600 text-sm"></i>
          </div>
        `
        )
        .join('');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };

  function buildFlightInfoBar(parsed, flightIdx) {
    const bar = document.createElement('div');
    bar.className = 'nadlan-flight-info-bar mt-3 mb-2 flex flex-wrap items-center gap-2.5';

    if (parsed.pnr) {
      const pnrChip = document.createElement('div');
      pnrChip.className = 'inline-flex items-center gap-2 bg-slate-900 text-amber-400 px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-sm';
      pnrChip.innerHTML = `<i class="fa-solid fa-ticket"></i><span>PNR:</span><span class="font-mono tracking-wider text-white">${parsed.pnr}</span>`;
      bar.appendChild(pnrChip);
    }

    if (parsed.flightNumber) {
      const fnChip = document.createElement('div');
      fnChip.className = 'inline-flex items-center gap-2 bg-blue-50 text-blue-950 border border-blue-200 px-3.5 py-2 rounded-xl text-xs font-extrabold';
      fnChip.innerHTML = `<i class="fa-solid fa-plane text-blue-600"></i><span>Flight:</span><span class="font-mono">${parsed.flightNumber}</span>`;
      bar.appendChild(fnChip);
    }

    const paxBtn = document.createElement('button');
    paxBtn.type = 'button';
    paxBtn.setAttribute('data-pax-flight-index', String(flightIdx));
    paxBtn.className = 'nadlan-pax-btn inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-sm';
    const countText = parsed.passengers.length > 0 ? ` (${parsed.passengers.length})` : '';
    paxBtn.innerHTML = `<i class="fa-solid fa-users"></i><span>المسافرون${countText}</span>`;
    bar.appendChild(paxBtn);

    return bar;
  }

  function enhanceFlightCards(forceReprocess) {
    const listEl = document.getElementById('cust-itinerary-list');
    if (!listEl) return;

    const children = Array.from(listEl.children || []);
    window.__NADLAN_FLIGHT_META__ = [];
    let flightCounter = 0;

    children.forEach((card) => {
      const fullText = (card.innerText || card.textContent || '').replace(/\s+/g, ' ').trim();
      const isFlightCard =
        fullText.includes('طيران:') ||
        fullText.includes('Flight:') ||
        fullText.includes('PNR') ||
        Boolean(card.querySelector('.fa-plane, .fa-plane-departure'));

      if (!isFlightCard) return;

      // Merge any booking object data if available
      const bookingSteps = Array.isArray(window.__NADLAN_CURRENT_BOOKING__?.itinerary)
        ? window.__NADLAN_CURRENT_BOOKING__.itinerary.filter((s) => s && s.type === 'flight')
        : [];
      const matchingStep = bookingSteps[flightCounter] || null;

      let parsed = extractFlightDetailsFromText(fullText);

      if (matchingStep) {
        if (!parsed.pnr && matchingStep.flightPnr) {
          parsed.pnr = String(matchingStep.flightPnr).trim().toUpperCase();
        }
        if (parsed.passengers.length === 0 && Array.isArray(matchingStep.passengers)) {
          parsed.passengers = matchingStep.passengers.filter(Boolean);
        }
        if (parsed.passengers.length === 0 && matchingStep.notes) {
          const stepParsed = extractFlightDetailsFromText(matchingStep.notes);
          if (stepParsed.passengers.length > 0) parsed.passengers = stepParsed.passengers;
          if (!parsed.pnr && stepParsed.pnr) parsed.pnr = stepParsed.pnr;
          if (!parsed.flightNumber && stepParsed.flightNumber) parsed.flightNumber = stepParsed.flightNumber;
        }
      }

      const currentIdx = flightCounter++;
      window.__NADLAN_FLIGHT_META__[currentIdx] = parsed;

      const existingBar = card.querySelector('.nadlan-flight-info-bar');
      if (existingBar && !forceReprocess) return;
      if (existingBar && forceReprocess) existingBar.remove();

      const bar = buildFlightInfoBar(parsed, currentIdx);
      const downloadLink = card.querySelector('a[download], a[href^="data:"], button:not(.nadlan-pax-btn)');
      if (downloadLink && downloadLink.parentElement) {
        downloadLink.parentElement.insertBefore(bar, downloadLink);
      } else {
        card.appendChild(bar);
      }
    });
  }

  // Capture-phase delegation so clicking "المسافرون" or its icon/text always opens the popup
  document.addEventListener(
    'click',
    function (e) {
      const btn = e.target && e.target.closest ? e.target.closest('[data-pax-flight-index], .nadlan-pax-btn') : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const idxAttr = btn.getAttribute('data-pax-flight-index');
      const idx = idxAttr !== null ? parseInt(idxAttr, 10) : 0;
      window.openFlightPassengersPopup(Number.isNaN(idx) ? 0 : idx);
    },
    true
  );

  const listTarget = document.getElementById('cust-itinerary-list');
  if (listTarget && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      setTimeout(() => enhanceFlightCards(true), 60);
    });
    observer.observe(listTarget, { childList: true, subtree: true });
  }

  window.addEventListener('DOMContentLoaded', () => setTimeout(() => enhanceFlightCards(true), 180));
})();
