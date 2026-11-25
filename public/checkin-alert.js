(function () {
  const AIRLINE_URLS = [
    { match: ['turkish', 'الخطوط التركية', 'التركية'], url: 'https://www.turkishairlines.com/en-int/flights/manage-booking/', label: 'Turkish Airlines' },
    { match: ['el al', 'إل عال', 'العال'], url: 'https://www.elal.com/en/Passengers-Info/Check-in/Pages/default.aspx', label: 'El Al' },
    { match: ['ryanair', 'رايان إير', 'رايان'], url: 'https://www.ryanair.com/gb/en/trip-manager', label: 'Ryanair' },
    { match: ['wizz', 'ويز إير', 'ويز'], url: 'https://wizzair.com/en-gb/check-in-and-booking', label: 'Wizz Air' },
    { match: ['aegean', 'إيجة', 'ايجة'], url: 'https://en.aegeanair.com/plan/check-in/', label: 'Aegean Airlines' },
    { match: ['flydubai', 'فلاي دبي'], url: 'https://www.flydubai.com/en/manage-booking/check-in', label: 'flydubai' },
    { match: ['emirates', 'طيران الإمارات', 'الإمارات'], url: 'https://www.emirates.com/english/manage-booking/', label: 'Emirates' },
    { match: ['qatar', 'القطرية', 'طيران قطر'], url: 'https://www.qatarairways.com/en/hia-online-check-in.html', label: 'Qatar Airways' },
    { match: ['lufthansa', 'لوفتهانزا'], url: 'https://www.lufthansa.com/xx/en/online-check-in', label: 'Lufthansa' },
    { match: ['pegasus', 'بيغاسوس'], url: 'https://www.flypgs.com/en/check-in', label: 'Pegasus' }
  ];

  const MONTHS = {
    january: '01', jan: '01',
    february: '02', feb: '02',
    march: '03', mar: '03',
    april: '04', apr: '04',
    may: '05',
    june: '06', jun: '06',
    july: '07', jul: '07',
    august: '08', aug: '08',
    september: '09', sep: '09', sept: '09',
    october: '10', oct: '10',
    november: '11', nov: '11',
    december: '12', dec: '12'
  };

  function extractYmd(text) {
    // 1. YYYY-MM-DD or YYYY/MM/DD
    const iso = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (iso) {
      return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
    }
    // 2. DD/MM/YYYY or DD-MM-YYYY
    const dmy = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
    if (dmy) {
      return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
    }
    // 3. "25 November 2026" or "November 25, 2026" or "25 Nov 2026"
    const mDayFirst = text.match(/\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{4})\b/i);
    if (mDayFirst) {
      const mm = MONTHS[mDayFirst[2].toLowerCase()];
      if (mm) return `${mDayFirst[3]}-${mm}-${String(mDayFirst[1]).padStart(2, '0')}`;
    }
    const mMonthFirst = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i);
    if (mMonthFirst) {
      const mm = MONTHS[mMonthFirst[1].toLowerCase()];
      if (mm) return `${mMonthFirst[3]}-${mm}-${String(mMonthFirst[2]).padStart(2, '0')}`;
    }
    return null;
  }

  function parseDateTime(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const normalized = raw
      .replace(/صباحاً|صباحا|ص/g, 'AM')
      .replace(/مساءً|مساءا|م/g, 'PM')
      .replace(/ظهراً|ظهرا/g, 'PM')
      .replace(/[|،]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const ymd = extractYmd(normalized);
    if (!ymd) return null;

    // Match HH:MM excluding YYYY:MM
    const tMatch = normalized.match(/(?<!\d{4})(?:\b|:)(\d{1,2}:\d{2})(?:\s*(AM|PM))?/i);
    let hh = 12, mm = 0;
    if (tMatch) {
      const [hStr, mStr] = tMatch[1].split(':');
      let h = parseInt(hStr, 10);
      mm = parseInt(mStr, 10);
      const mer = (tMatch[2] || '').toUpperCase();
      if (mer === 'PM' && h < 12) h += 12;
      if (mer === 'AM' && h === 12) h = 0;
      if (h >= 0 && h <= 23 && mm >= 0 && mm <= 59) hh = h;
    }
    const dt = new Date(`${ymd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function detectAirlineUrl(text, explicitUrl) {
    if (explicitUrl && /^https?:\/\//i.test(explicitUrl.trim())) {
      return { url: explicitUrl.trim(), label: 'صفحة الشيك إن' };
    }
    const low = String(text || '').toLowerCase();
    for (const item of AIRLINE_URLS) {
      if (item.match.some((k) => low.includes(k.toLowerCase()))) {
        return { url: item.url, label: item.label };
      }
    }
    return { url: '', label: 'شركة الطيران' };
  }

  function extractPnrAndLastName(step, booking) {
    const combined = `${step.flightPnr || ''} ${step.notes || ''} ${booking?.notes || ''}`;
    // Avoid matching flight numbers like W4 6406 or LY 282; look for explicit PNR or 6-char uppercase code not following W4/LY/TK/etc.
    const explicitPnr = combined.match(/PNR[:\s#-]*([A-Z0-9]{5,7})/i);
    let pnr = (step.flightPnr || (explicitPnr ? explicitPnr[1] : '') || '').toUpperCase();
    if (!pnr && booking?.pnr) pnr = String(booking.pnr).toUpperCase();

    let lastName = (step.passengerLastName || booking?.lastName || '').trim();
    if (!lastName && step.notes) {
      const paxMatch = step.notes.match(/المسافرون:\s*([^|]+)/);
      if (paxMatch) {
        const firstPax = paxMatch[1].split('،')[0].trim();
        const parts = firstPax.split(/\s+/);
        lastName = parts[parts.length - 1] || '';
      }
    }
    return { pnr, lastName };
  }

  function getActiveCheckInFlights(booking) {
    const steps = Array.isArray(booking?.itinerary) ? booking.itinerary : [];
    const flights = steps.filter((s) => s && (s.type === 'flight' || /طيران|مطار|flight/i.test(String(s.type || '') + ' ' + String(s.notes || ''))));
    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const alerts = [];

    flights.forEach((flight, idx) => {
      const dt = parseDateTime(flight.date || flight.travel_date || flight.notes || '');
      if (!dt) return;
      const diffMs = dt.getTime() - now;
      if (diffMs <= twentyFourHoursMs && diffMs >= -twentyFourHoursMs) {
        const hoursLeft = Math.max(0, Math.round(diffMs / (60 * 60 * 1000)));
        const legLabel = flight.legType === 'return' || /عودة|return/i.test(`${flight.from || ''} ${flight.notes || ''}`) || (flights.length > 1 && idx > 0)
          ? 'طيران العودة'
          : 'طيران الذهاب';
        const airlineInfo = detectAirlineUrl(`${flight.airlineName || ''} ${flight.notes || ''}`, flight.checkInUrl);
        const creds = extractPnrAndLastName(flight, booking);
        alerts.push({
          legLabel,
          flight,
          dt,
          hoursLeft,
          isDeparted: diffMs < 0,
          airlineInfo,
          pnr: creds.pnr,
          lastName: creds.lastName
        });
      }
    });

    return alerts;
  }

  function openCheckIn(url, pnr, lastName) {
    const infoText = `PNR: ${pnr || '-'} | اسم العائلة: ${lastName || '-'}`;
    if (navigator.clipboard && (pnr || lastName)) {
      navigator.clipboard.writeText(`${pnr} ${lastName}`.trim()).catch(() => {});
    }
    const toast = document.getElementById('checkin-copy-toast');
    if (toast) {
      toast.textContent = `تم تجهيز بيانات الشيك إن (${infoText}) — جاري فتح صفحة شركة الطيران...`;
      toast.classList.remove('hidden');
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert(`بيانات الشيك إن جاهزة:\n${infoText}\nافتح موقع شركة الطيران لإتمام الشيك إن.`);
    }
  }

  function renderCheckInBanner(booking, containerId = 'nadlan-checkin-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const alerts = getActiveCheckInFlights(booking);
    if (!alerts || alerts.length === 0) {
      container.innerHTML = '';
      return;
    }

    window.__NADLAN_CHECKIN_ALERTS__ = alerts;

    const cardsHtml = alerts.map((a, index) => {
      const routeText = `${a.flight.from || 'المغادرة'} ➔ ${a.flight.to || 'الوصول'}`;
      const timeText = a.isDeparted
        ? 'موعد الإقلاع قريب أو بدأ للتو — تحقق من حالة الرحلة فوراً'
        : a.hoursLeft <= 1
          ? 'متبقي أقل من ساعة على موعد الإقلاع!'
          : `متبقي حوالي ${a.hoursLeft} ساعة على موعد الإقلاع`;

      return `
        <div class="bg-gradient-to-l from-amber-500 via-amber-400 to-yellow-300 text-slate-950 rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-amber-300 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center text-2xl shrink-0 shadow-md">
              <i class="fa-solid fa-plane-circle-check"></i>
            </div>
            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="bg-slate-950 text-amber-400 text-xs font-extrabold px-3 py-0.5 rounded-full">
                  ${a.legLabel} — خلال 24 ساعة أو أقل
                </span>
                <span class="text-xs font-extrabold text-slate-900">${a.airlineInfo.label}</span>
              </div>
              <h3 class="text-lg sm:text-xl font-extrabold text-slate-950">
                حان موعد الشيك إن (Check-in) لـ ${a.legLabel}: ${routeText}
              </h3>
              <p class="text-xs sm:text-sm font-bold text-slate-900/90">
                ${timeText} • ${a.flight.date || ''}
                ${a.pnr ? ` • PNR: <span class="font-mono bg-white/80 px-2 py-0.5 rounded">${a.pnr}</span>` : ''}
                ${a.lastName ? ` • العائلة: <span class="bg-white/80 px-2 py-0.5 rounded">${a.lastName}</span>` : ''}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2.5 w-full lg:w-auto">
            <button type="button" onclick="window.NadlanCheckIn.triggerAlert(${index})" class="flex-1 lg:flex-initial bg-slate-950 hover:bg-slate-800 text-amber-400 font-extrabold px-6 py-3 rounded-2xl text-sm shadow-lg transition flex items-center justify-center gap-2">
              <i class="fa-solid fa-check-to-slot"></i>
              <span>شيك إن (${a.legLabel})</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-3">
        ${cardsHtml}
        <div id="checkin-copy-toast" class="hidden bg-emerald-900 text-emerald-100 text-xs font-bold px-4 py-2.5 rounded-2xl shadow"></div>
      </div>
    `;
  }

  function triggerAlert(index) {
    const alerts = window.__NADLAN_CHECKIN_ALERTS__ || [];
    const item = alerts[index];
    if (!item) return;
    openCheckIn(item.airlineInfo.url, item.pnr, item.lastName);
  }

  window.NadlanCheckIn = {
    renderCheckInBanner,
    getActiveCheckInFlights,
    triggerAlert
  };
})();
