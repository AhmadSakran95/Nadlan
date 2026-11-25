(function () {
  const AIRLINE_CHECKIN_LINKS = [
    { match: ['turkish', 'التركية', 'tk'], name: 'Turkish Airlines', url: 'https://www.turkishairlines.com/en-int/flights/manage-booking/' },
    { match: ['el al', 'إل عال', 'العال', 'ly'], name: 'El Al', url: 'https://www.elal.com/en/Passengers-Info/Check-in/Pages/default.aspx' },
    { match: ['ryanair', 'رايان', 'fr'], name: 'Ryanair', url: 'https://www.ryanair.com/gb/en/trip-manager' },
    { match: ['wizz', 'ويز', 'w4', 'w6', 'w9'], name: 'Wizz Air', url: 'https://wizzair.com/en-gb/check-in-and-booking' },
    { match: ['aegean', 'إيجة', 'ايجة', 'a3'], name: 'Aegean Airlines', url: 'https://en.aegeanair.com/plan/check-in/' },
    { match: ['flydubai', 'فلاي دبي', 'fz'], name: 'flydubai', url: 'https://www.flydubai.com/en/manage-booking/check-in' },
    { match: ['emirates', 'الإمارات', 'ek'], name: 'Emirates', url: 'https://www.emirates.com/english/manage-booking/' },
    { match: ['qatar', 'القطرية', 'qr'], name: 'Qatar Airways', url: 'https://www.qatarairways.com/en/hia-online-check-in.html' },
    { match: ['lufthansa', 'لوفتهانزا', 'lh'], name: 'Lufthansa', url: 'https://www.lufthansa.com/xx/en/online-check-in' },
    { match: ['pegasus', 'بيغاسوس', 'pc'], name: 'Pegasus', url: 'https://www.flypgs.com/en/check-in' },
    { match: ['arkia', 'أركيا', 'اركيا', 'iz'], name: 'Arkia', url: 'https://www.arkia.com/' },
    { match: ['israir', 'إسرائير', 'اسرائير', '6h'], name: 'Israir', url: 'https://www.israir.co.il/' },
    { match: ['royal jordanian', 'الملكية الأردنية', 'rj'], name: 'Royal Jordanian', url: 'https://www.rj.com/en/manage-my-booking' },
    { match: ['egyptair', 'مصر للطيران', 'ms'], name: 'EgyptAir', url: 'https://www.egyptair.com/en/fly/check-in' },
    { match: ['saudia', 'السعودية', 'sv'], name: 'Saudia', url: 'https://www.saudia.com/before-you-fly/check-in-information/online-check-in' },
    { match: ['british airways', 'البريطانية', 'ba'], name: 'British Airways', url: 'https://www.britishairways.com/travel/olci/public/en_gb/' },
    { match: ['air france', 'الفرنسية', 'af'], name: 'Air France', url: 'https://wwws.airfrance.in/check-in' },
    { match: ['klm'], name: 'KLM', url: 'https://www.klm.com/check-in' },
    { match: ['swiss'], name: 'SWISS', url: 'https://www.swiss.com/xx/en/fly/check-in' },
    { match: ['iberia', 'إيبيريا', 'ib'], name: 'Iberia', url: 'https://www.iberia.com/gb/online-check-in/' }
  ];

  function parseFlightDate(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const cleaned = raw
      .replace(/صباحاً|صباحا|ص/g, 'AM')
      .replace(/مساءً|مساءا|م/g, 'PM')
      .replace(/[|،]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const iso = cleaned.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    const dmy = !iso ? cleaned.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/) : null;
    const ymd = iso
      ? `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`
      : dmy
      ? `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`
      : null;

    if (!ymd) return null;

    let hh = 12, mm = 0;
    const tMatch = cleaned.match(/(?<!\d{4})(?:\b|:)(\d{1,2}:\d{2})(?:\s*(AM|PM))?/i);
    if (tMatch) {
      let [h, m] = tMatch[1].split(':').map(Number);
      const mer = (tMatch[2] || '').toUpperCase();
      if (mer === 'PM' && h < 12) h += 12;
      if (mer === 'AM' && h === 12) h = 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        hh = h;
        mm = m;
      }
    }

    const dt = new Date(`${ymd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function getAirlineCheckInInfo(flightStep, booking) {
    const rawAirline = String(
      flightStep?.airlineName ||
      flightStep?.airline ||
      ''
    ).trim();

    const searchText = `${rawAirline} ${flightStep?.notes || ''} ${booking?.notes || ''}`.toLowerCase();

    for (const item of AIRLINE_CHECKIN_LINKS) {
      const matched = item.match.some((k) => {
        const key = k.toLowerCase();
        if (key.length <= 2) {
          return new RegExp(`(?:^|[^a-z0-9])${key}(?:\\s*\\d|\\s*$|[^a-z0-9])`, 'i').test(searchText);
        }
        return searchText.includes(key);
      });
      if (matched) {
        return {
          airlineName: rawAirline || item.name,
          url: item.url
        };
      }
    }

    const fallbackName = rawAirline || (flightStep?.notes || '').split('|')[0].trim() || 'شركة الطيران';
    return {
      airlineName: fallbackName,
      url: `https://www.google.com/search?q=${encodeURIComponent(fallbackName + ' online check-in')}`
    };
  }

  function getNextFlightData(booking) {
    const steps = Array.isArray(booking?.itinerary) ? booking.itinerary : [];
    const flights = steps.filter(
      (s) => s && (s.type === 'flight' || /طيران|flight/i.test(String(s.type || '')))
    );

    const now = Date.now();
    const upcoming = flights
      .map((f) => ({ step: f, dt: parseFlightDate(f.date || f.travel_date || f.notes || '') }))
      .filter((item) => item.dt && item.dt.getTime() > now)
      .sort((a, b) => a.dt.getTime() - b.dt.getTime());

    return upcoming[0] || null;
  }

  function renderTripCountdown(booking, containerId = 'nadlan-trip-countdown-box') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const nextFlight = getNextFlightData(booking);
    if (!nextFlight) {
      container.innerHTML = '';
      return;
    }

    const diffMs = nextFlight.dt.getTime() - Date.now();
    const hoursLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    const daysLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const under24Hours = diffMs <= 24 * 60 * 60 * 1000;

    if (under24Hours) {
      const airline = getAirlineCheckInInfo(nextFlight.step, booking);
      container.innerHTML = `
        <div class="bg-amber-400 text-slate-950 rounded-2xl p-4 shadow border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="text-sm font-extrabold">
            متبقي على الرحلة أقل من 24 ساعة (${hoursLeft} ساعة) — شركة الطيران: ${airline.airlineName}
          </div>
          <a href="${airline.url}" target="_blank" rel="noopener noreferrer"
             class="bg-slate-950 text-amber-400 hover:bg-slate-800 font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl inline-flex items-center justify-center gap-2 shrink-0">
            <span>رابط شيك إن ${airline.airlineName}</span>
            <span>↗</span>
          </a>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="bg-slate-900 text-white rounded-2xl p-4 shadow flex items-center justify-between gap-3">
          <div class="text-sm font-extrabold">
            باقي على الرحلة <span class="text-amber-400">${daysLeft}</span> ${daysLeft === 1 ? 'يوم' : 'أيام'}
          </div>
          <div class="text-xs text-slate-300 font-semibold">
            ${nextFlight.step.from || ''} ← ${nextFlight.step.to || ''}
          </div>
        </div>
      `;
    }
  }

  window.NadlanTripCountdown = {
    render: renderTripCountdown
  };
})();
