(function () {
  const AIRLINE_CHECKIN_MAP = [
    { match: ['turkish', 'الخطوط التركية', 'التركية', 'tk'], url: 'https://www.turkishairlines.com/en-int/flights/manage-booking/', label: 'Turkish Airlines' },
    { match: ['el al', 'إل عال', 'العال', 'ly'], url: 'https://www.elal.com/en/Passengers-Info/Check-in/Pages/default.aspx', label: 'El Al' },
    { match: ['ryanair', 'رايان إير', 'رايان', 'fr'], url: 'https://www.ryanair.com/gb/en/trip-manager', label: 'Ryanair' },
    { match: ['wizz', 'ويز إير', 'ويز', 'w4', 'w6', 'w9'], url: 'https://wizzair.com/en-gb/check-in-and-booking', label: 'Wizz Air' },
    { match: ['aegean', 'إيجة', 'ايجة', 'a3'], url: 'https://en.aegeanair.com/plan/check-in/', label: 'Aegean Airlines' },
    { match: ['flydubai', 'فلاي دبي', 'fz'], url: 'https://www.flydubai.com/en/manage-booking/check-in', label: 'flydubai' },
    { match: ['emirates', 'طيران الإمارات', 'الإمارات', 'ek'], url: 'https://www.emirates.com/english/manage-booking/', label: 'Emirates' },
    { match: ['qatar', 'القطرية', 'طيران قطر', 'qr'], url: 'https://www.qatarairways.com/en/hia-online-check-in.html', label: 'Qatar Airways' },
    { match: ['lufthansa', 'لوفتهانزا', 'lh'], url: 'https://www.lufthansa.com/xx/en/online-check-in', label: 'Lufthansa' },
    { match: ['pegasus', 'بيغاسوس', 'pc'], url: 'https://www.flypgs.com/en/check-in', label: 'Pegasus' },
    { match: ['arkia', 'أركيا', 'اركيا', 'iz'], url: 'https://www.arkia.com/', label: 'Arkia' },
    { match: ['israir', 'إسرائير', 'اسرائير', '6h'], url: 'https://www.israir.co.il/', label: 'Israir' },
    { match: ['royal jordanian', 'الملكية الأردنية', 'rj'], url: 'https://www.rj.com/en/manage-my-booking', label: 'Royal Jordanian' },
    { match: ['egyptair', 'مصر للطيران', 'ms'], url: 'https://www.egyptair.com/en/fly/check-in', label: 'EgyptAir' },
    { match: ['saudia', 'السعودية', 'sv'], url: 'https://www.saudia.com/before-you-fly/check-in-information/online-check-in', label: 'Saudia' },
    { match: ['british airways', 'الخطوط البريطانية', 'ba'], url: 'https://www.britishairways.com/travel/olci/public/en_gb/', label: 'British Airways' },
    { match: ['air france', 'الخطوط الفرنسية', 'af'], url: 'https://wwws.airfrance.in/check-in', label: 'Air France' },
    { match: ['klm'], url: 'https://www.klm.com/check-in', label: 'KLM' },
    { match: ['swiss'], url: 'https://www.swiss.com/xx/en/fly/check-in', label: 'SWISS' },
    { match: ['iberia', 'إيبيريا', 'ib'], url: 'https://www.iberia.com/gb/online-check-in/', label: 'Iberia' }
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
    const iso = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;

    const dmy = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
    if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;

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

  function resolveAirlineCheckIn(flight, booking) {
    const rawAirline = String(
      flight.airlineName ||
      flight.airline ||
      ''
    ).trim();
    const combinedText = `${rawAirline} ${flight.notes || ''} ${booking?.notes || ''}`.trim();
    const low = combinedText.toLowerCase();

    for (const item of AIRLINE_CHECKIN_MAP) {
      if (item.match.some((k) => {
        const key = k.toLowerCase();
        if (key.length <= 2) {
          return new RegExp(`(?:^|[^a-z0-9])${key}(?:\s*\d|\s*$|[^a-z0-9])`, 'i').test(low);
        }
        return low.includes(key);
      })) {
        return {
          url: item.url,
          airlineName: rawAirline || item.label
        };
      }
    }

    // Fallback: dynamic Google search for the airline's official online check-in page using airline name from ticket
    const queryAirline = rawAirline || combinedText.split('|')[0].trim() || 'airline';
    return {
      url: `https://www.google.com/search?q=${encodeURIComponent(queryAirline + ' official online check-in')}`,
      airlineName: queryAirline
    };
  }

  // Strictly extract PNR from the uploaded flight ticket data (never system booking PNR fallback)
  function extractTicketPnr(step) {
    if (!step) return '';
    if (step.flightPnr && String(step.flightPnr).trim()) {
      return String(step.flightPnr).trim().toUpperCase();
    }
    const text = String(step.notes || '');
    const explicit = text.match(/(?:PNR|Booking\s*Ref(?:erence)?|رمز\s*الحجز)[:\s#-]*([A-Z0-9]{5,7})\b/i);
    if (explicit) return explicit[1].toUpperCase();
    return '';
  }

  function extractLastName(step, booking) {
    let lastName = (step?.passengerLastName || booking?.lastName || '').trim();
    if (!lastName && step?.notes) {
      const paxMatch = step.notes.match(/المسافرون:\s*([^|]+)/);
      if (paxMatch) {
        const firstPax = paxMatch[1].split('،')[0].trim();
        const parts = firstPax.split(/\s+/);
        lastName = parts[parts.length - 1] || '';
      }
    }
    return lastName;
  }

  function buildCheckInUrlWithParams(baseUrl, pnr, lastName) {
    try {
      const u = new URL(baseUrl);
      if (pnr) {
        u.searchParams.set('pnr', pnr);
        u.searchParams.set('bookingRef', pnr);
      }
      if (lastName) {
        u.searchParams.set('lastName', lastName);
      }
      return u.toString();
    } catch (_) {
      return baseUrl;
    }
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
      if (diffMs <= twentyFourHoursMs && diffMs > 0) {
        const hoursLeft = Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));
        const legLabel = flight.legType === 'return' || /عودة|return/i.test(`${flight.from || ''} ${flight.notes || ''}`) || (flights.length > 1 && idx > 0)
          ? 'طيران العودة'
          : 'طيران الذهاب';
        const airlineInfo = resolveAirlineCheckIn(flight, booking);
        const ticketPnr = extractTicketPnr(flight);
        const lastName = extractLastName(flight, booking);

        alerts.push({
          legLabel,
          hoursLeft,
          airlineName: airlineInfo.airlineName,
          checkInUrl: airlineInfo.url,
          pnr: ticketPnr,
          lastName
        });
      }
    });

    return alerts;
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (_) {}
  }

  function triggerAlert(index) {
    const alerts = window.__NADLAN_CHECKIN_ALERTS__ || [];
    const item = alerts[index] || alerts[0];
    if (!item) return;

    const targetUrl = buildCheckInUrlWithParams(
      item.checkInUrl || 'https://www.google.com/search?q=' + encodeURIComponent((item.airlineName || 'airline') + ' online check-in'),
      item.pnr,
      item.lastName
    );

    // Open tab immediately inside direct user click handler
    const win = window.open(targetUrl, '_blank');
    if (!win) {
      window.location.href = targetUrl;
    }

    const copyPayload = [item.pnr, item.lastName].filter(Boolean).join(' ');
    if (copyPayload) {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(copyPayload).catch(() => fallbackCopy(copyPayload));
      } else {
        fallbackCopy(copyPayload);
      }
    }

    const toast = document.getElementById('checkin-copy-toast');
    if (toast) {
      const infoParts = [];
      if (item.pnr) infoParts.push(`PNR: ${item.pnr}`);
      if (item.lastName) infoParts.push(`الاسم: ${item.lastName}`);
      toast.textContent = infoParts.length > 0
        ? `تم نسخ بيانات الكرت (${infoParts.join(' | ')}) وتمريرها لصفحة شيك إن ${item.airlineName || ''}...`
        : `جاري فتح صفحة شيك إن ${item.airlineName || ''}...`;
      toast.classList.remove('hidden');
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
      const hypeSentence = `يلا استعد للمغامرة! رحلة ${a.legLabel} على وشك الإقلاع وباقيلها ${a.hoursLeft} ساعة — اعمل شيك إن الآن وانطلق براحة بال!`;
      return `
        <div class="bg-gradient-to-l from-amber-500 via-amber-400 to-yellow-300 text-slate-950 rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center text-xl shrink-0 shadow">
              <i class="fa-solid fa-plane-departure"></i>
            </div>
            <p class="text-base sm:text-lg font-extrabold text-slate-950 leading-snug">
              ${hypeSentence}
            </p>
          </div>
          <button type="button" data-checkin-index="${index}" onclick="window.NadlanCheckIn.triggerAlert(${index}); return false;" class="w-full sm:w-auto bg-slate-950 hover:bg-slate-800 text-amber-400 font-extrabold px-6 py-3 rounded-2xl text-sm shadow-lg transition flex items-center justify-center gap-2 shrink-0">
            <i class="fa-solid fa-check-to-slot"></i>
            <span>شيك إن</span>
          </button>
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

  document.addEventListener('click', function (e) {
    const btn = e.target && e.target.closest ? e.target.closest('[data-checkin-index]') : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const idx = parseInt(btn.getAttribute('data-checkin-index'), 10);
    triggerAlert(Number.isNaN(idx) ? 0 : idx);
  });

  window.NadlanCheckIn = {
    renderCheckInBanner,
    getActiveCheckInFlights,
    triggerAlert
  };
})();
