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

  // --- Booking Status Option at the end when creating a new booking + display on customer view ---
  const STATUS_KEY_PREFIX = 'nadlan_booking_confirmed_v26_';

  function getCurrentBookingKey() {
    const params = new URLSearchParams(window.location.search || '');
    const rawId =
      params.get('id') ||
      params.get('customer') ||
      params.get('booking') ||
      params.get('pnr') ||
      params.get('code') ||
      '';
    if (rawId) return STATUS_KEY_PREFIX + rawId.trim();

    // Try extracting booking code/ID from visible page text (e.g. PNR / رقم الحجز / اسم الزبون)
    const bodyTxt = normText(document.body ? document.body.innerText : '');
    const codeMatch = bodyTxt.match(/(?:PNR|كود\s*الحجز|رقم\s*الحجز)\s*[:：#-]?\s*([A-Z0-9]{5,12})/i);
    if (codeMatch && codeMatch[1]) {
      return STATUS_KEY_PREFIX + codeMatch[1].toUpperCase();
    }
    return STATUS_KEY_PREFIX + 'default';
  }

  function loadConfirmedState(key) {
    try {
      const val = localStorage.getItem(key);
      if (val === 'false') return false;
      if (val === 'true') return true;
    } catch (_) {}
    return true; // Default: حجز مؤكد
  }

  function saveConfirmedState(key, isConfirmed) {
    try {
      localStorage.setItem(key, isConfirmed ? 'true' : 'false');
    } catch (_) {}
  }

  function findBookingCreationEndTarget() {
    // Find the main admin/booking form or container near save/create buttons
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
    for (const btn of buttons) {
      if (btn.closest('#nadlan-pax-modal-v15') || btn.closest('#nadlan-booking-status-end-v26')) continue;
      const t = normText(btn.innerText || btn.value || '');
      if (/حفظ|إنشاء|إضافة\s*حجز|إرسال|تأكيد\s*الحجز|حفظ\s*الزبون/i.test(t)) {
        const parent = btn.closest('form') || btn.parentElement;
        if (parent && parent !== document.body) {
          return { container: parent, beforeBtn: btn };
        }
      }
    }
    return null;
  }

  function injectEndOfBookingStatusOption() {
    if (document.getElementById('nadlan-booking-status-end-v26')) return;

    const target = findBookingCreationEndTarget();
    const listEl = document.getElementById('cust-itinerary-list');

    // Only place at the end of booking form if a booking/form target exists; otherwise if admin form is present
    if (!target && !listEl) return;

    const box = document.createElement('div');
    box.id = 'nadlan-booking-status-end-v26';
    box.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin:14px 0;padding:14px 16px;border-radius:16px;background:#f8fafc;border:1px solid #cbd5e1;direction:rtl;';

    const key = getCurrentBookingKey();
    const initialConfirmed = loadConfirmedState(key);

    box.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:3px;">
        <span style="font-size:13px;font-weight:800;color:#0f172a;">حالة الحجز (في نهاية الحجز)</span>
        <span style="font-size:11px;color:#64748b;">اختر هل الحجز مؤكد أو غير مؤكد ليظهر في عرض الزبون</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <select id="nadlan-booking-status-select-v26" style="padding:8px 14px;border-radius:12px;border:1px solid #94a3b8;background:#fff;color:#0f172a;font-size:13px;font-weight:800;cursor:pointer;">
          <option value="true" ${initialConfirmed ? 'selected' : ''}>حجز مؤكد</option>
          <option value="false" ${!initialConfirmed ? 'selected' : ''}>حجز غير مؤكد</option>
        </select>
      </div>
    `;

    if (target && target.container && target.beforeBtn) {
      target.beforeBtn.parentElement.insertBefore(box, target.beforeBtn);
    } else if (listEl && listEl.parentElement) {
      // Place after #cust-itinerary-list (at the end of the booking/itinerary)
      if (listEl.nextSibling) {
        listEl.parentElement.insertBefore(box, listEl.nextSibling);
      } else {
        listEl.parentElement.appendChild(box);
      }
    }

    const sel = document.getElementById('nadlan-booking-status-select-v26');
    if (sel) {
      sel.addEventListener('change', function () {
        const isConf = sel.value === 'true';
        const activeKey = getCurrentBookingKey();
        saveConfirmedState(activeKey, isConf);
        saveConfirmedState(STATUS_KEY_PREFIX + 'default', isConf);
        syncExistingStatusBadge(isConf);
      });
    }
  }

  function styleBadgeContainer(badgeEl, isConfirmed) {
    if (!badgeEl) return;
    if (isConfirmed) {
      badgeEl.style.backgroundColor = '';
      badgeEl.style.color = '';
      badgeEl.style.borderColor = '';
      badgeEl.classList.remove('bg-amber-100', 'text-amber-800', 'border-amber-300', 'bg-yellow-100', 'text-yellow-800', 'bg-red-100', 'text-red-800');
    } else {
      badgeEl.style.backgroundColor = '#fef3c7';
      badgeEl.style.color = '#92400e';
      badgeEl.style.borderColor = '#fcd34d';
    }
  }

  function syncExistingStatusBadge(explicitConfirmed) {
    const key = getCurrentBookingKey();
    let isConfirmed =
      typeof explicitConfirmed === 'boolean'
        ? explicitConfirmed
        : loadConfirmedState(key);

    if (typeof explicitConfirmed !== 'boolean') {
      try {
        if (localStorage.getItem(key) === null && localStorage.getItem(STATUS_KEY_PREFIX + 'default') !== null) {
          isConfirmed = loadConfirmedState(STATUS_KEY_PREFIX + 'default');
        }
      } catch (_) {}
    }

    // Keep select in sync if present
    const sel = document.getElementById('nadlan-booking-status-select-v26');
    if (sel && sel.value !== (isConfirmed ? 'true' : 'false')) {
      sel.value = isConfirmed ? 'true' : 'false';
    }

    // Remove any duplicate banner we might have added earlier
    const oldBanner = document.getElementById('nadlan-customer-status-badge-v26');
    if (oldBanner) oldBanner.remove();

    const targetLabel = isConfirmed ? 'حجز مؤكد' : 'حجز غير مؤكد';

    // Update leaf nodes first
    const leafCandidates = Array.from(document.querySelectorAll('span, div, button, a, p, strong'));
    leafCandidates.forEach((el) => {
      if (el.id === 'nadlan-booking-status-end-v26' || el.closest('#nadlan-booking-status-end-v26')) return;
      if (el.children && el.children.length > 0) return;
      const t = normText(el.innerText || el.textContent || '');
      if (t === 'حجز مؤكد' || t === 'حجز مؤكد ✓' || t === 'حجز غير مؤكد' || t === 'حجز غير مؤكد ✕') {
        el.textContent = targetLabel;
        const pill = el.closest('span, div, button, a') || el;
        styleBadgeContainer(pill, isConfirmed);
      }
    });

    // Also handle badges that contain an icon (like <i> or <svg>) inside them
    const iconBadges = Array.from(document.querySelectorAll('span, div, button, a')).filter((el) => {
      if (el.id === 'nadlan-booking-status-end-v26' || el.closest('#nadlan-booking-status-end-v26')) return false;
      const t = normText(el.innerText || el.textContent || '');
      return (t === 'حجز مؤكد' || t === 'حجز غير مؤكد') && el.querySelector('i, svg');
    });

    iconBadges.forEach((badge) => {
      const textNode = Array.from(badge.childNodes).find(
        (n) => n.nodeType === 3 && /حجز\s*(غير\s*)?مؤكد/.test(normText(n.textContent || ''))
      );
      if (textNode) {
        textNode.textContent = ' ' + targetLabel;
      } else {
        const spanChild = Array.from(badge.querySelectorAll('span')).find((s) =>
          /حجز\s*(غير\s*)?مؤكد/.test(normText(s.textContent || ''))
        );
        if (spanChild) {
          spanChild.textContent = targetLabel;
        }
      }
      styleBadgeContainer(badge, isConfirmed);
    });
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
    clone.querySelectorAll('.nadlan-flight-bar-v15, .nadlan-open-pax-btn, .nadlan-hotel-clean-box-v24, #nadlan-pax-modal-v15').forEach((el) => el.remove());
    return normText(clone.innerText || clone.textContent || '');
  }

  function isHotelCard(card, txt) {
    if (!card) return false;
    if (/إقامة\s*فندقية|نوع\s*الغرفة|العنوان\s*[:：]|تفاصيل\s*الوجبات|سياسة\s*الإلغاء|CXL\s*deadline/i.test(txt)) {
      return true;
    }
    if (card.querySelector('.fa-hotel, .fa-bed')) return true;
    return false;
  }

  function parseHotelDetails(txt) {
    let roomType = '';
    const roomMatch = txt.match(/نوع\s*الغرفة\s*[:：]\s*([^|]+?)(?=\s*\||$)/i);
    if (roomMatch && roomMatch[1]) {
      roomType = normText(roomMatch[1]);
    }

    let address = '';
    const addrMatch = txt.match(/العنوان\s*[:：]\s*([^|]+?)(?=\s*\||$)/i);
    if (addrMatch && addrMatch[1]) {
      address = normText(addrMatch[1]).replace(/\s*\(يبعد[^)]*\)\s*$/g, '').trim();
    }

    return { roomType, address };
  }

  function simplifyHotelCardDisplay(card, txt) {
    if (!card || !isHotelCard(card, txt)) return;
    const { roomType, address } = parseHotelDetails(txt);
    if (!roomType && !address) return;

    const nodes = Array.from(card.querySelectorAll('p, div, span, li'));
    nodes.forEach((el) => {
      if (
        el.classList.contains('nadlan-hotel-clean-box-v24') ||
        el.closest('.nadlan-hotel-clean-box-v24') ||
        el.closest('.nadlan-flight-bar-v15') ||
        el.closest('#nadlan-pax-modal-v15')
      ) return;
      if (el.querySelector('a, button')) return;

      const elTxt = normText(el.innerText || el.textContent || '');
      if (
        (elTxt.indexOf('العنوان:') !== -1 || elTxt.indexOf('نوع الغرفة:') !== -1) &&
        (elTxt.indexOf('تفاصيل الوجبات:') !== -1 || elTxt.indexOf('سياسة الإلغاء:') !== -1 || elTxt.indexOf('CXL deadline:') !== -1 || elTxt.length > 45)
      ) {
        el.style.display = 'none';
      }
    });

    let cleanBox = card.querySelector('.nadlan-hotel-clean-box-v24');
    if (!cleanBox) {
      cleanBox = document.createElement('div');
      cleanBox.className = 'nadlan-hotel-clean-box-v24';
      cleanBox.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:10px;margin-bottom:10px;padding:12px 14px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;text-align:right;';

      const dl = card.querySelector('a[download], a[href^="data:"], a[href^="blob:"]');
      if (dl && dl.parentElement) {
        dl.parentElement.insertBefore(cleanBox, dl);
      } else {
        card.appendChild(cleanBox);
      }
    }

    const lines = [];
    if (roomType) {
      lines.push(`<div style="font-size:13px;font-weight:800;color:#0f172a;line-height:1.5;">نوع الغرفة: <span style="font-weight:700;color:#334155;">${roomType}</span></div>`);
    }
    if (address) {
      lines.push(`<div style="font-size:13px;font-weight:800;color:#0f172a;line-height:1.5;">العنوان: <span style="font-weight:700;color:#334155;">${address}</span></div>`);
    }
    cleanBox.innerHTML = lines.join('');
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

  function enforcePdfOnlyDownloadOnCard(card) {
    if (!card) return;
    const candidates = card.querySelectorAll('a[download], a[href^="data:"], a[href^="blob:"], button, a');
    candidates.forEach((el) => {
      if (el.closest('.nadlan-flight-bar-v15') || el.closest('.nadlan-hotel-clean-box-v24') || el.closest('#nadlan-pax-modal-v15')) return;
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
    injectEndOfBookingStatusOption();
    syncExistingStatusBadge();

    const container = document.getElementById('cust-itinerary-list');
    if (!container) return;

    const directChildren = Array.from(container.children || []);
    window.__NADLAN_FLIGHT_ITEMS_V15__ = [];
    let fIdx = 0;

    directChildren.forEach((card) => {
      if (!card || card.id === 'nadlan-pax-modal-v15') return;

      enforcePdfOnlyDownloadOnCard(card);
      fixMobileLinks(card);

      const txt = getCardSourceText(card);
      simplifyHotelCardDisplay(card, txt);

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

  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(debouncedRun).observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  setInterval(runEnhancer, 1200);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(runEnhancer, 100);
  } else {
    window.addEventListener('DOMContentLoaded', () => setTimeout(runEnhancer, 100));
  }
})();
