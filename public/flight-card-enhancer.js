(function () {
  function parseFlightDetailsFromText(rawText) {
    const txt = String(rawText || '').replace(/\s+/g, ' ').trim();

    // Extract PNR (e.g., PNR: KV13VE or PNR الطيران: KV13VE)
    let pnr = '';
    const pnrMatch = txt.match(/(?:PNR(?:\s*الطيران)?|رمز\s*الحجز)[:\s#-]*([A-Z0-9]{5,8})/i);
    if (pnrMatch) {
      pnr = pnrMatch[1].trim().toUpperCase();
    }

    // Extract Flight Number (e.g., Flight: W4 6406 or رقم الرحلة: TK815)
    let flightNumber = '';
    const fnMatch = txt.match(/(?:Flight(?:\s*No\.?|Number)?|رقم\s*(?:الرحلة|الطيران))[:\s#-]*([A-Z]{1,3}\s*\d{2,4})/i);
    if (fnMatch) {
      flightNumber = fnMatch[1].replace(/\s+/g, ' ').trim().toUpperCase();
    }

    // Extract Passengers list (after "المسافرون:")
    let passengers = [];
    const paxMatch = txt.match(/المسافرون:\s*([^|]+?)(?=\s*\||$)/);
    if (paxMatch) {
      passengers = paxMatch[1]
        .split(/،|,/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // Clean notes text so raw PNR / Flight / المسافرون don't look messy if desired, while keeping other notes
    let cleanNotes = txt
      .replace(/(?:PNR(?:\s*الطيران)?|رمز\s*الحجز)[:\s#-]*[A-Z0-9]{5,8}/gi, '')
      .replace(/(?:Flight(?:\s*No\.?|Number)?|رقم\s*(?:الرحلة|الطيران))[:\s#-]*[A-Z]{1,3}\s*\d{2,4}/gi, '')
      .replace(/المسافرون:\s*[^|]+/g, '')
      .replace(/\|\s*\|/g, '|')
      .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
      .trim();

    return { pnr, flightNumber, passengers, cleanNotes };
  }

  function ensurePassengersModal() {
    if (document.getElementById('nadlan-passengers-modal')) return;
    const modal = document.createElement('div');
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
          <button type="button" id="pax-modal-close-x" class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div id="pax-modal-list" class="space-y-2.5 max-h-72 overflow-y-auto"></div>
        <button type="button" id="pax-modal-close-btn" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl text-sm transition">
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
  }

  window.openFlightPassengersPopup = function (flightIdx) {
    ensurePassengersModal();
    const store = window.__NADLAN_FLIGHT_META__ || [];
    const meta = store[flightIdx] || { flightNumber: '', pnr: '', passengers: [] };
    const modal = document.getElementById('nadlan-passengers-modal');
    const titleEl = document.getElementById('pax-modal-title');
    const subEl = document.getElementById('pax-modal-subtitle');
    const listEl = document.getElementById('pax-modal-list');

    titleEl.textContent = 'أسماء المسافرون على الرحلة';
    const subParts = [];
    if (meta.flightNumber) subParts.push(`Flight: ${meta.flightNumber}`);
    if (meta.pnr) subParts.push(`PNR: ${meta.pnr}`);
    subEl.textContent = subParts.length > 0 ? subParts.join('  •  ') : `عدد المسافرين: ${meta.passengers.length}`;

    if (!meta.passengers || meta.passengers.length === 0) {
      listEl.innerHTML = `
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-sm text-slate-500">
          لا توجد أسماء مسافرين مسجلة في هذه الرحلة.
        </div>
      `;
    } else {
      listEl.innerHTML = meta.passengers
        .map(
          (name, idx) => `
          <div class="flex items-center justify-between bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 rounded-2xl px-4 py-3 transition">
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

  function enhanceFlightCards() {
    const listEl = document.getElementById('cust-itinerary-list');
    if (!listEl) return;

    const children = Array.from(listEl.children || []);
    window.__NADLAN_FLIGHT_META__ = [];
    let flightCounter = 0;

    children.forEach((card) => {
      if (card.dataset && card.dataset.nadlanEnhanced === '1') return;
      const fullText = (card.textContent || '').replace(/\s+/g, ' ').trim();
      const isFlightCard =
        fullText.includes('طيران:') ||
        fullText.includes('Flight:') ||
        card.querySelector('.fa-plane, .fa-plane-departure');

      if (!isFlightCard) return;

      const parsed = parseFlightDetailsFromText(fullText);
      const currentIdx = flightCounter++;
      window.__NADLAN_FLIGHT_META__[currentIdx] = parsed;

      const badgesRow = document.createElement('div');
      badgesRow.className = 'mt-3 flex flex-wrap items-center gap-2';

      if (parsed.pnr) {
        const pnrBadge = document.createElement('span');
        pnrBadge.className = 'inline-flex items-center gap-1.5 bg-slate-900 text-amber-400 font-mono text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-sm';
        pnrBadge.innerHTML = `<i class="fa-solid fa-ticket"></i><span>PNR: ${parsed.pnr}</span>`;
        badgesRow.appendChild(pnrBadge);
      }

      if (parsed.flightNumber) {
        const fnBadge = document.createElement('span');
        fnBadge.className = 'inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 border border-blue-200 font-mono text-xs font-extrabold px-3 py-1.5 rounded-xl';
        fnBadge.innerHTML = `<i class="fa-solid fa-plane text-blue-600"></i><span>Flight: ${parsed.flightNumber}</span>`;
        badgesRow.appendChild(fnBadge);
      }

      const paxBtn = document.createElement('button');
      paxBtn.type = 'button';
      paxBtn.className = 'inline-flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-slate-900 border border-amber-300 text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition cursor-pointer shadow-sm';
      const paxCountLabel = parsed.passengers.length > 0 ? ` (${parsed.passengers.length})` : '';
      paxBtn.innerHTML = `<i class="fa-solid fa-users text-amber-700"></i><span>المسافرون${paxCountLabel}</span>`;
      paxBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.openFlightPassengersPopup(currentIdx);
      });
      badgesRow.appendChild(paxBtn);

      // Insert right before the download/action button if present, or at the end of card content
      const downloadBtn = card.querySelector('a[download], button');
      if (downloadBtn && downloadBtn.parentElement) {
        downloadBtn.parentElement.insertBefore(badgesRow, downloadBtn);
      } else {
        card.appendChild(badgesRow);
      }

      if (card.dataset) {
        card.dataset.nadlanEnhanced = '1';
      }
    });
  }

  const listTarget = document.getElementById('cust-itinerary-list');
  if (listTarget && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      setTimeout(enhanceFlightCards, 40);
    });
    observer.observe(listTarget, { childList: true, subtree: true });
  }

  window.addEventListener('DOMContentLoaded', () => setTimeout(enhanceFlightCards, 150));
})();
