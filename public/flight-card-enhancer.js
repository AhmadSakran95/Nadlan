(function () {
  function normText(s) {
    return String(s || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function stripTrailingNoise(nameStr) {
    let s = normText(nameStr);
    const stopMarkers = [
      /\s+تحميل\s+ملف\s+الطيران.*$/i,
      /\s+تحميل\s+ملف\s+الفندق.*$/i,
      /\s+تحميل\s+الفاوتشر.*$/i,
      /\s+E-?ticket\s+Confirmation.*$/i,
      /\s+(?:Airline\s*booking\s*reference|PNR|Flight)\s*[:：#\-]?.*$/i,
      /\s+المسافرون\s*\(?\d*\)?.*$/i,
      /\s+الطيران\s*[:：].*$/i
    ];
    for (const re of stopMarkers) {
      s = s.replace(re, '').trim();
    }
    return s;
  }

  function isValidPassengerName(n) {
    if (!n || n.length < 2 || n.length > 70) return false;
    if (/^(?:PNR|Flight|Airline\s*booking\s*reference|الطيران|المسافرون|تحميل|E-?ticket|Confirmation|Wizz|EL\s*AL)/i.test(n)) return false;
    if (/\.pdf\b/i.test(n)) return false;
    return true;
  }

  function extractAirlineBookingRef(str) {
    const s = normText(str);
    if (!s) return '';
    const m1 = s.match(/Airline\s*booking\s*reference\s*[:：#\-]?\s*([A-Z0-9/_-]{4,18})/i);
    if (m1 && m1[1]) return m1[1].trim().toUpperCase();
    return '';
  }

  function parseFlightText(raw) {
    const t = normText(raw);

    let pnr = extractAirlineBookingRef(t);
    if (!pnr) {
      const pnrMatch = t.match(/PNR(?:\s*الطيران)?\s*[:：#-]?\s*([A-Z0-9/_-]{5,14})/i);
      if (pnrMatch && pnrMatch[1]) {
        pnr = pnrMatch[1].trim().toUpperCase();
      }
    }

    let flightNo = '';
    const fnMatch = t.match(/Flight(?:\s*(?:No\.?|Number))?\s*[:：#-]?\s*([A-Z0-9]{1,3}\s*\d{2,5})/i);
    if (fnMatch && fnMatch[1]) {
      flightNo = fnMatch[1].replace(/\s+/g, ' ').trim().toUpperCase();
    }

    let passengers = [];
    const paxMatch = t.match(/المسافرون\s*[:：]\s*(.+)$/i);
    if (paxMatch && paxMatch[1]) {
      const cleanedTail = stripTrailingNoise(paxMatch[1]);
      passengers = cleanedTail
        .split(/،|,/)
        .map((part, idx, arr) => {
          let item = normText(part);
          if (idx === arr.length - 1) {
            item = stripTrailingNoise(item);
          }
          item = item.replace(/\s*\([^)]*\)\s*$/g, '').trim();
          return item;
        })
        .filter(isValidPassengerName);
    }

    return { pnr, flightNo, passengers };
  }

  function ensurePopup() {
    let popup = document.getElementById('nadlan-pax-modal-v15');
    if (popup) return popup;

    popup = document.createElement('div');
    popup.id = 'nadlan-pax-modal-v15';
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.72);backdrop-filter:blur(2px);z-index:999999;display:none;align-items:center;justify-content:center;padding:16px;touch-action:manipulation;';
    popup.innerHTML = `
      <div style="background:#fff;border-radius:24px;max-width:440px;width:100%;padding:24px;box-shadow:0 24px 48px rgba(0,0,0,0.35);">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:16px;">
          <div>
            <div style="font-size:18px;font-weight:800;color:#0f172a;">قائمة المسافرون</div>
            <div id="nadlan-pax-sub-v15" style="font-size:12px;color:#64748b;margin-top:4px;"></div>
          </div>
          <button id="nadlan-pax-x-v15" type="button" style="width:38px;height:38px;border-radius:10px;border:none;background:#f1f5f9;color:#0f172a;font-weight:800;cursor:pointer;touch-action:manipulation;">✕</button>
        </div>
        <div id="nadlan-pax-list-v15" style="display:flex;flex-direction:column;gap:10px;max-height:260px;overflow-y:auto;"></div>
        <button id="nadlan-pax-close-v15" type="button" style="margin-top:18px;width:100%;padding:12px;border-radius:14px;border:none;background:#0f172a;color:#fff;font-weight:800;font-size:14px;cursor:pointer;touch-action:manipulation;">إغلاق</button>
      </div>
    `;
    document.body.appendChild(popup);

    const close = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      popup.style.display = 'none';
    };
    popup.addEventListener('click', (e) => {
      if (e.target === popup) close(e);
    });
    document.getElementById('nadlan-pax-x-v15').addEventListener('click', close);
    document.getElementById('nadlan-pax-close-v15').addEventListener('click', close);
    return popup;
  }

  window.openNadlanPaxPopup = function (idx) {
    const items = window.__NADLAN_FLIGHT_ITEMS_V15__ || [];
    const meta = items[idx] || { pnr: '', flightNo: '', passengers: [] };
    const popup = ensurePopup();
    const sub = document.getElementById('nadlan-pax-sub-v15');
    const list = document.getElementById('nadlan-pax-list-v15');

    const parts = [];
    if (meta.pnr) parts.push('Airline booking reference: ' + meta.pnr);
    if (meta.flightNo) parts.push('Flight: ' + meta.flightNo);
    sub.textContent = parts.join('  •  ');

    if (!meta.passengers || meta.passengers.length === 0) {
      list.innerHTML = '<div style="padding:14px;border-radius:14px;background:#f8fafc;color:#475569;text-align:center;font-weight:700;">لا توجد أسماء مسافرين مسجلة في هذه الرحلة.</div>';
    } else {
      list.innerHTML = meta.passengers
        .map(
          (p, i) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
            <span style="font-size:14px;font-weight:800;color:#0f172a;">${p}</span>
            <span style="width:26px;height:26px;border-radius:8px;background:#0f172a;color:#fbbf24;font-size:12px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;">${i + 1}</span>
          </div>
        `
        )
        .join('');
    }

    popup.style.display = 'flex';
  };

  function getCardSourceText(card) {
    const clone = card.cloneNode(true);
    clone.querySelectorAll('.nadlan-flight-bar-v15, .nadlan-open-pax-btn, #nadlan-pax-modal-v15').forEach((el) => el.remove());
    return normText(clone.innerText || clone.textContent || '');
  }

  function isPdfAttachment(el) {
    if (!el) return false;
    const href = String(el.getAttribute('href') || '').trim();
    const dlName = String(el.getAttribute('download') || '').trim();
    const txt = normText(el.innerText || el.textContent || '');
    const dataMime = String(el.getAttribute('data-mime') || el.getAttribute('type') || '').toLowerCase();

    if (/^data:application\/pdf\b/i.test(href)) return true;
    if (/\.pdf(\?|#|$)/i.test(href)) return true;
    if (/\.pdf$/i.test(dlName)) return true;
    if (/\.pdf\b/i.test(txt)) return true;
    if (dataMime.indexOf('pdf') !== -1) return true;

    return false;
  }

  function isImageAttachment(el) {
    if (!el) return false;
    const href = String(el.getAttribute('href') || '').trim();
    const dlName = String(el.getAttribute('download') || '').trim();
    const dataMime = String(el.getAttribute('data-mime') || el.getAttribute('type') || '').toLowerCase();

    if (/^data:image\//i.test(href)) return true;
    if (/\.(png|jpe?g|webp|gif|bmp|heic)(\?|#|$)/i.test(href)) return true;
    if (/\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(dlName)) return true;
    if (dataMime.indexOf('image/') !== -1) return true;

    return false;
  }

  // Applies to ALL itinerary cards (flights, hotels, vouchers, etc.) in customer view
  // Upload inputs (<input type="file">) are untouched so admin can still upload images or PDFs freely
  function enforcePdfOnlyDownloadOnCard(card) {
    if (!card) return;
    const candidates = card.querySelectorAll('a[download], a[href^="data:"], a[href^="blob:"], button, a');
    candidates.forEach((el) => {
      if (el.closest('.nadlan-flight-bar-v15') || el.closest('#nadlan-pax-modal-v15')) return;
      if (el.tagName === 'INPUT' && el.type === 'file') return;

      const txt = normText(el.innerText || el.textContent || '');
      const isDownloadControl =
        el.hasAttribute('download') ||
        /تحميل\s*(ملف\s*)?(الطيران|التذكرة|الفاوتشر|الفندق|الحجز|الملف)?/i.test(txt) ||
        /voucher|e-?ticket|confirmation|download/i.test(txt);

      if (!isDownloadControl) return;

      const pdfOk = isPdfAttachment(el);
      const imgDetected = isImageAttachment(el);

      if (pdfOk && !imgDetected) {
        el.style.display = '';
        el.dataset.nadlanPdfAllowed = '1';
      } else {
        // Hide download option when attachment is an image or not confirmed as PDF
        el.style.display = 'none';
        el.dataset.nadlanPdfAllowed = '0';
      }
    });
  }

  function triggerMobileFriendlyDownload(linkEl) {
    if (!linkEl || linkEl.dataset.nadlanPdfAllowed === '0') return;
    const href = linkEl.getAttribute('href') || '';
    const dlName = linkEl.getAttribute('download') || 'voucher.pdf';

    if (href.startsWith('data:')) {
      try {
        const commaIdx = href.indexOf(',');
        if (commaIdx !== -1) {
          const meta = href.slice(5, commaIdx);
          const payload = href.slice(commaIdx + 1);
          const mime = (meta.split(';')[0] || 'application/pdf').trim();
          let bytes;
          if (meta.indexOf('base64') !== -1) {
            const bin = atob(payload);
            bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          } else {
            const decoded = decodeURIComponent(payload);
            bytes = new TextEncoder().encode(decoded);
          }
          const blob = new Blob([bytes], { type: mime });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = dlName.toLowerCase().endsWith('.pdf') ? dlName : dlName + '.pdf';
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
            a.remove();
          }, 4000);
          return;
        }
      } catch (_) {}
    }

    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }

  function fixMobileLinks(card) {
    if (!card) return;
    const links = card.querySelectorAll('a[download], a[href^="data:"]');
    links.forEach((a) => {
      if (a.dataset.nadlanMobileFixed === '1') return;
      a.dataset.nadlanMobileFixed = '1';
      a.style.touchAction = 'manipulation';
      a.addEventListener(
        'click',
        function (e) {
          if (a.dataset.nadlanPdfAllowed === '0') {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          const href = a.getAttribute('href') || '';
          if (href.startsWith('data:')) {
            e.preventDefault();
            e.stopPropagation();
            triggerMobileFriendlyDownload(a);
          }
        },
        true
      );
    });
  }

  function renderCardBar(card, meta, currentIndex) {
    let bar = card.querySelector('.nadlan-flight-bar-v15');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'nadlan-flight-bar-v15';
      bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px;margin-bottom:8px;position:relative;z-index:5;touch-action:manipulation;';

      const dl = card.querySelector('a[download], a[href^="data:"], a[href^="blob:"]');
      if (dl && dl.parentElement) {
        dl.parentElement.insertBefore(bar, dl);
      } else {
        card.appendChild(bar);
      }
    }

    bar.innerHTML = '';

    if (meta.pnr) {
      const b1 = document.createElement('span');
      b1.style.cssText = 'background:#0f172a;color:#fbbf24;padding:6px 12px;border-radius:10px;font-size:12px;font-weight:800;font-family:monospace;';
      b1.textContent = 'Airline booking reference: ' + meta.pnr;
      bar.appendChild(b1);
    }

    if (meta.flightNo) {
      const b2 = document.createElement('span');
      b2.style.cssText = 'background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe;padding:6px 12px;border-radius:10px;font-size:12px;font-weight:800;font-family:monospace;';
      b2.textContent = 'Flight: ' + meta.flightNo;
      bar.appendChild(b2);
    }

    const paxBtn = document.createElement('button');
    paxBtn.type = 'button';
    paxBtn.style.cssText = 'background:#f59e0b;color:#0f172a;border:none;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;touch-action:manipulation;position:relative;z-index:6;';
    paxBtn.textContent = 'المسافرون' + (meta.passengers.length ? ' (' + meta.passengers.length + ')' : '');
    const onOpen = function (e) {
      e.preventDefault();
      e.stopPropagation();
      window.openNadlanPaxPopup(currentIndex);
    };
    paxBtn.addEventListener('click', onOpen);
    bar.appendChild(paxBtn);
  }

  function runEnhancer() {
    const container = document.getElementById('cust-itinerary-list');
    if (!container) return;

    const directChildren = Array.from(container.children || []);
    window.__NADLAN_FLIGHT_ITEMS_V15__ = [];
    let fIdx = 0;

    directChildren.forEach((card) => {
      if (!card || card.id === 'nadlan-pax-modal-v15') return;

      // Enforce PDF-only download on every card (hotels, flights, vouchers) in customer itinerary view
      enforcePdfOnlyDownloadOnCard(card);
      fixMobileLinks(card);

      const txt = getCardSourceText(card);
      const isFlight =
        txt.indexOf('طيران:') !== -1 ||
        txt.indexOf('Flight:') !== -1 ||
        txt.indexOf('Airline booking reference') !== -1 ||
        txt.indexOf('PNR') !== -1 ||
        Boolean(card.querySelector('.fa-plane, .fa-plane-departure'));

      if (!isFlight) return;

      const meta = parseFlightText(txt);
      const currentIndex = fIdx++;
      window.__NADLAN_FLIGHT_ITEMS_V15__[currentIndex] = meta;
      renderCardBar(card, meta, currentIndex);
    });
  }

  let t = null;
  function debouncedRun() {
    clearTimeout(t);
    t = setTimeout(runEnhancer, 100);
  }

  const listEl = document.getElementById('cust-itinerary-list');
  if (listEl && typeof MutationObserver !== 'undefined') {
    new MutationObserver(debouncedRun).observe(listEl, { childList: true, subtree: true });
  }

  setInterval(runEnhancer, 1200);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(runEnhancer, 100);
  } else {
    window.addEventListener('DOMContentLoaded', () => setTimeout(runEnhancer, 100));
  }
})();
