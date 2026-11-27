// =======================================================================
// الثوابت وحالة التطبيق
// =======================================================================
const STORAGE_KEY = "ndl_bookings_v1";
const DEST_CACHE_PREFIX = "ndl_dest_info_v1_";
const GEMINI_MODEL = "gemini-3-flash-preview";
const ADMIN_CODE = "NADLAN0105"; // غيّر هذا الكود إلى كود الإدارة الخاص بك

const AIRPORT_TO_CITY = {
  BUS: "باتومي",
  TBS: "تبليسي",
  IST: "إسطنبول",
  SAW: "إسطنبول",
  AYT: "أنطاليا",
  TZX: "طرابزون",
  DXB: "دبي",
  DWC: "دبي",
  AUH: "أبوظبي",
  SHJ: "الشارقة",
  AMM: "عمّان",
  CAI: "القاهرة",
  DOH: "الدوحة",
  JED: "جدة",
  RUH: "الرياض",
  TLV: "تل أبيب",
  LCA: "لارنكا",
  ATH: "أثينا",
  CDG: "باريس",
  LHR: "لندن",
  AMS: "أمستردام",
  FRA: "فرانكفورت",
  FCO: "روما",
  MXP: "ميلانو",
  BCN: "برشلونة",
  MAD: "مدريد",
  VIE: "فيينا",
  ZRH: "زيورخ",
  PRG: "براغ",
  BUD: "بودابست",
  OTP: "بوخارست",
  SOF: "صوفيا",
  BEG: "بلغراد",
  TIA: "تيرانا",
  JFK: "نيويورك",
  LAX: "لوس أنجلوس"
};

const AIRLINE_CHECKIN_DIRECTORY = {
  KL: { name: "KLM", url: "https://www.klm.com/check-in" },
  AF: { name: "Air France", url: "https://www.airfrance.com/check-in" },
  TK: { name: "Turkish Airlines", url: "https://www.turkishairlines.com/en-int/flights/manage-booking/" },
  EK: { name: "Emirates", url: "https://www.emirates.com/ae/arabic/manage-booking/online-check-in/" },
  QR: { name: "Qatar Airways", url: "https://www.qatarairways.com/en/services-activities/check-in-online.html" },
  EY: { name: "Etihad Airways", url: "https://www.etihad.com/en/manage/check-in" },
  RJ: { name: "Royal Jordanian", url: "https://www.rj.com/en/online-check-in" },
  LH: { name: "Lufthansa", url: "https://www.lufthansa.com/xx/en/online-check-in" },
  BA: { name: "British Airways", url: "https://www.britishairways.com/travel/olci/public/en_gb" },
  FZ: { name: "flydubai", url: "https://www.flydubai.com/en/plan/check-in" },
  G9: { name: "Air Arabia", url: "https://www.airarabia.com/en/online-check-in" },
  MS: { name: "EgyptAir", url: "https://www.egyptair.com/en/fly/Pages/Check-In.aspx" },
  SV: { name: "Saudia", url: "https://www.saudia.com/before-flying/check-in-information" },
  PC: { name: "Pegasus Airlines", url: "https://www.flypgs.com/en/online-check-in" },
  W6: { name: "Wizz Air", url: "https://wizzair.com/en-gb/check-in" },
  FR: { name: "Ryanair", url: "https://www.ryanair.com/gb/en/check-in" },
  U2: { name: "easyJet", url: "https://www.easyjet.com/en/check-in" },
  LY: { name: "El Al", url: "https://www.elal.com/eng/flightinfo/checkin" },
  IZ: { name: "Arkia", url: "https://www.arkia.com/check-in" },
  "6H": { name: "Israir", url: "https://www.israir.co.il/check-in" }
};

let bookings = [];
let currentStations = [];
let activeCustomerBooking = null;
let extractTargetType = "flight";
let aiChatHistory = [];
let adminUnlocked = false;

// =======================================================================
// أدوات مساعدة عامة
// =======================================================================
function showToast(msg) {
  const banner = document.getElementById("toast-banner");
  const textEl = document.getElementById("toast-message");
  if (!banner || !textEl) return;
  textEl.textContent = msg;
  banner.classList.remove("hidden");
  banner.classList.add("flex");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(hideToast, 4000);
}

function hideToast() {
  const banner = document.getElementById("toast-banner");
  if (!banner) return;
  banner.classList.add("hidden");
  banner.classList.remove("flex");
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getTodayFormatted() {
  const now = new Date();
  return now.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function mapAirportCodeToCity(codeOrText) {
  const clean = String(codeOrText || "").trim().toUpperCase();
  const match = clean.match(/\b([A-Z]{3})\b/);
  const code = match ? match[1] : clean;
  return AIRPORT_TO_CITY[code] || "";
}

function generateNextNdlCode() {
  let maxNum = 9;
  for (const b of bookings) {
    const m = String(b.pnr || "").toUpperCase().match(/^NDL(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return `NDL${maxNum + 1}`;
}

function copyTextToClipboard(text, successMsg = "تم النسخ بنجاح") {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast(successMsg);
  } catch (err) {
    showToast("تعذر النسخ تلقائياً");
  }
}

// =======================================================================
// استدعاء Gemini مع إعادة محاولة (Exponential Backoff)
// =======================================================================
async function callGeminiApi(payload, maxRetries = 3) {
  let delay = 1000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          continue;
        }
        throw new Error(`Gemini API HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  return null;
}

function extractGeminiText(result) {
  const parts = result?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("\n").trim();
}

function parseJsonLoose(rawText) {
  if (!rawText) return null;
  const cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch (__) {
        return null;
      }
    }
    return null;
  }
}

// =======================================================================
// إدارة الحجوزات عبر قاعدة بيانات Railway PostgreSQL
// =======================================================================
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `تعذر الاتصال بالخادم (${response.status})`);
  }
  return payload;
}

async function loadBookings() {
  try {
    let result = await apiRequest("/api/bookings");
    bookings = Array.isArray(result.bookings) ? result.bookings : [];

    const legacyRaw = localStorage.getItem(STORAGE_KEY);
    if (bookings.length === 0 && legacyRaw) {
      let legacyBookings = [];
      try { legacyBookings = JSON.parse(legacyRaw); } catch (_) {}
      if (Array.isArray(legacyBookings) && legacyBookings.length) {
        for (const booking of legacyBookings) {
          await apiRequest("/api/bookings", {
            method: "POST",
            body: JSON.stringify(booking)
          });
        }
        result = await apiRequest("/api/bookings");
        bookings = Array.isArray(result.bookings) ? result.bookings : [];
      }
    }

    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    bookings = [];
    console.error("Bookings database load failed:", err);
    showToast("تعذر تحميل الحجوزات من قاعدة البيانات. تأكدي من ربط PostgreSQL في Railway.");
  }
}

// =======================================================================
// حماية قسم الإدارة بكود والتنقل بين قسم الزبون والإدارة
// =======================================================================
function openAdminCodeModal() {
  if (adminUnlocked) {
    switchPortal("admin");
    return;
  }
  const modal = document.getElementById("admin-code-modal");
  const input = document.getElementById("admin-code-input");
  const errEl = document.getElementById("admin-code-error");
  if (errEl) errEl.classList.add("hidden");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 50);
  }
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeAdminCodeModal() {
  const modal = document.getElementById("admin-code-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function submitAdminCode(event) {
  event.preventDefault();
  const input = document.getElementById("admin-code-input");
  const errEl = document.getElementById("admin-code-error");
  const entered = (input?.value || "").trim();

  if (entered === ADMIN_CODE) {
    adminUnlocked = true;
    closeAdminCodeModal();
    switchPortal("admin");
    showToast("تم فتح قسم الإدارة");
  } else if (errEl) {
    errEl.classList.remove("hidden");
  }
}

function switchPortal(portal) {
  if (portal === "admin" && !adminUnlocked) {
    openAdminCodeModal();
    return;
  }

  const adminSec = document.getElementById("admin-section");
  const custSec = document.getElementById("customer-section");
  const adminBtn = document.getElementById("tab-admin-btn");
  const custBtn = document.getElementById("tab-customer-btn");

  if (portal === "admin") {
    adminSec.classList.remove("hidden");
    custSec.classList.add("hidden");
    adminBtn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition bg-amber-400 text-slate-950 shadow cursor-pointer";
    custBtn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition text-slate-200 hover:bg-white/10 cursor-pointer";
    renderBookingsList();
  } else {
    adminSec.classList.add("hidden");
    custSec.classList.remove("hidden");
    custBtn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition bg-amber-400 text-slate-950 shadow cursor-pointer";
    adminBtn.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition text-slate-200 hover:bg-white/10 cursor-pointer";
    renderQuickDemoBookings();
    if (activeCustomerBooking) {
      renderCustomerDashboard(activeCustomerBooking);
    }
  }
}

// =======================================================================
// محطات الرحلة في قسم الإدارة (إضافة، حذف، تحريك، قالب قياسي)
// =======================================================================
function createStationObject(type) {
  const id = "st-" + Math.random().toString(36).slice(2, 9);
  if (type === "flight") {
    return {
      id,
      type: "flight",
      fromAirport: "",
      toAirport: "",
      flightNumber: "",
      airlinePnr: "",
      baggage: "",
      departureText: "",
      notes: ""
    };
  }
  if (type === "hotel") {
    return {
      id,
      type: "hotel",
      name: "",
      stars: "5 نجوم",
      checkIn: "",
      checkOut: "",
      nights: "",
      notes: ""
    };
  }
  if (type === "transfer") {
    return {
      id,
      type: "transfer",
      fromLocation: "",
      toLocation: "",
      pickupTime: "",
      notes: ""
    };
  }
  return {
    id,
    type: "tour",
    title: "",
    dateText: "",
    notes: ""
  };
}

function addStation(type) {
  syncStationsFromDom();
  currentStations.push(createStationObject(type));
  renderStationsEditor();
}

function removeStation(index) {
  syncStationsFromDom();
  currentStations.splice(index, 1);
  renderStationsEditor();
}

function moveStation(index, direction) {
  syncStationsFromDom();
  const target = index + direction;
  if (target < 0 || target >= currentStations.length) return;
  const temp = currentStations[index];
  currentStations[index] = currentStations[target];
  currentStations[target] = temp;
  renderStationsEditor();
}

function applyStandardTemplate() {
  syncStationsFromDom();
  currentStations = [
    createStationObject("transfer"),
    createStationObject("flight"),
    createStationObject("transfer"),
    createStationObject("hotel"),
    createStationObject("tour"),
    createStationObject("transfer"),
    createStationObject("flight")
  ];
  renderStationsEditor();
  showToast("تم تطبيق القالب القياسي لمحطات الرحلة");
}

function syncStationsFromDom() {
  for (let i = 0; i < currentStations.length; i++) {
    const st = currentStations[i];
    if (!st) continue;
    if (st.type === "flight") {
      st.fromAirport = document.getElementById(`st-${i}-from`)?.value.trim().toUpperCase() || "";
      st.toAirport = document.getElementById(`st-${i}-to`)?.value.trim().toUpperCase() || "";
      st.flightNumber = document.getElementById(`st-${i}-flightno`)?.value.trim().toUpperCase() || "";
      st.airlinePnr = document.getElementById(`st-${i}-apnr`)?.value.trim().toUpperCase() || "";
      st.baggage = document.getElementById(`st-${i}-baggage`)?.value.trim() || "";
      st.departureText = document.getElementById(`st-${i}-dep`)?.value.trim() || "";
      st.notes = document.getElementById(`st-${i}-notes`)?.value.trim() || "";
    } else if (st.type === "hotel") {
      st.name = document.getElementById(`st-${i}-name`)?.value.trim() || "";
      st.stars = document.getElementById(`st-${i}-stars`)?.value.trim() || "";
      st.checkIn = document.getElementById(`st-${i}-checkin`)?.value.trim() || "";
      st.checkOut = document.getElementById(`st-${i}-checkout`)?.value.trim() || "";
      st.nights = document.getElementById(`st-${i}-nights`)?.value.trim() || "";
      st.notes = document.getElementById(`st-${i}-notes`)?.value.trim() || "";
    } else if (st.type === "transfer") {
      st.fromLocation = document.getElementById(`st-${i}-fromloc`)?.value.trim() || "";
      st.toLocation = document.getElementById(`st-${i}-toloc`)?.value.trim() || "";
      st.pickupTime = document.getElementById(`st-${i}-time`)?.value.trim() || "";
      st.notes = document.getElementById(`st-${i}-notes`)?.value.trim() || "";
    } else if (st.type === "tour") {
      st.title = document.getElementById(`st-${i}-title`)?.value.trim() || "";
      st.dateText = document.getElementById(`st-${i}-date`)?.value.trim() || "";
      st.notes = document.getElementById(`st-${i}-notes`)?.value.trim() || "";
    }
  }
}

function renderStationsEditor() {
  const container = document.getElementById("stations-container");
  if (!container) return;

  if (!currentStations.length) {
    container.innerHTML = `<div class="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">لا توجد محطات بعد. اضغط على (+ طيران / + فندق / + توصيل / + جولة) أو (القالب القياسي).</div>`;
    return;
  }

  container.innerHTML = currentStations
    .map((st, idx) => {
      const badgeMap = {
        flight: { label: "✈️ محطة طيران", cls: "bg-sky-100 text-sky-900" },
        hotel: { label: "🏨 محطة فندق", cls: "bg-indigo-100 text-indigo-900" },
        transfer: { label: "🚐 محطة توصيل", cls: "bg-amber-100 text-amber-900" },
        tour: { label: "🗺️ جولة سياحية", cls: "bg-emerald-100 text-emerald-900" }
      };
      const badge = badgeMap[st.type] || { label: "محطة", cls: "bg-slate-100 text-slate-800" };

      let fieldsHtml = "";
      if (st.type === "flight") {
        fieldsHtml = `
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">من مطار (رمز)</label>
              <input id="st-${idx}-from" type="text" value="${escapeHtml(st.fromAirport)}" placeholder="TLV" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-extrabold uppercase" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">إلى مطار (رمز)</label>
              <input id="st-${idx}-to" type="text" value="${escapeHtml(st.toAirport)}" onchange="onFlightToAirportChange(${idx})" placeholder="BUS" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-extrabold uppercase" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">تاريخ السفر</label>
              <input id="st-${idx}-dep" type="text" value="${escapeHtml(st.departureText)}" placeholder="2026-11-26 10:30" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">رقم الطيران</label>
              <input id="st-${idx}-flightno" type="text" value="${escapeHtml(st.flightNumber)}" placeholder="KL 462" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-extrabold uppercase" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">PNR شركة الطيران</label>
              <input id="st-${idx}-apnr" type="text" value="${escapeHtml(st.airlinePnr)}" placeholder="ABC123" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-extrabold uppercase" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">الحقائب</label>
              <input id="st-${idx}-baggage" type="text" value="${escapeHtml(st.baggage)}" placeholder="23 كجم + حقيبة يد" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
            </div>
          </div>
          <div class="mt-2.5">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">ملاحظات / تفاصيل العودة</label>
            <input id="st-${idx}-notes" type="text" value="${escapeHtml(st.notes)}" placeholder="مثال: ذهاب وعودة" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
          </div>
        `;
      } else if (st.type === "hotel") {
        fieldsHtml = `
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">اسم الفندق</label>
              <input id="st-${idx}-name" type="text" value="${escapeHtml(st.name)}" placeholder="اسم الفندق" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">تصنيف الفندق (كم نجمة)</label>
              <select id="st-${idx}-stars" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white">
                <option value="5 نجوم" ${st.stars === "5 نجوم" ? "selected" : ""}>5 نجوم (★★★★★)</option>
                <option value="4 نجوم" ${st.stars === "4 نجوم" ? "selected" : ""}>4 نجوم (★★★★)</option>
                <option value="3 نجوم" ${st.stars === "3 نجوم" ? "selected" : ""}>3 نجوم (★★★)</option>
                <option value="نجمتان" ${st.stars === "نجمتان" ? "selected" : ""}>نجمتان (★★)</option>
                <option value="نجمة واحدة" ${st.stars === "نجمة واحدة" ? "selected" : ""}>نجمة واحدة (★)</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">عدد الليالي</label>
              <input id="st-${idx}-nights" type="text" value="${escapeHtml(st.nights)}" placeholder="مثال: 5 ليالي" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">تاريخ الدخول</label>
              <input id="st-${idx}-checkin" type="text" value="${escapeHtml(st.checkIn)}" placeholder="2026-11-26" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">تاريخ الخروج</label>
              <input id="st-${idx}-checkout" type="text" value="${escapeHtml(st.checkOut)}" placeholder="2026-12-01" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">ملاحظات الفندق</label>
              <input id="st-${idx}-notes" type="text" value="${escapeHtml(st.notes)}" placeholder="إفطار / رقم الحجز" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
            </div>
          </div>
        `;
      } else if (st.type === "transfer") {
        fieldsHtml = `
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">من</label>
              <input id="st-${idx}-fromloc" type="text" value="${escapeHtml(st.fromLocation)}" placeholder="المطار / الفندق" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">إلى</label>
              <input id="st-${idx}-toloc" type="text" value="${escapeHtml(st.toLocation)}" placeholder="الفندق / المطار" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">الوقت / السيارة</label>
              <input id="st-${idx}-time" type="text" value="${escapeHtml(st.pickupTime)}" placeholder="وقت الاستقبال" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
            </div>
          </div>
          <div class="mt-2.5">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">ملاحظات التوصيل</label>
            <input id="st-${idx}-notes" type="text" value="${escapeHtml(st.notes)}" placeholder="ملاحظات إضافية" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
          </div>
        `;
      } else {
        fieldsHtml = `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">عنوان الجولة / النشاط</label>
              <input id="st-${idx}-title" type="text" value="${escapeHtml(st.title)}" placeholder="جولة في المدينة" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">التاريخ</label>
              <input id="st-${idx}-date" type="text" value="${escapeHtml(st.dateText)}" placeholder="2026-11-28" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
            </div>
          </div>
          <div class="mt-2.5">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">ملاحظات الجولة</label>
            <input id="st-${idx}-notes" type="text" value="${escapeHtml(st.notes)}" placeholder="تفاصيل إضافية" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
          </div>
        `;
      }

      return `
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div class="flex items-center justify-between gap-2 mb-3">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center">${idx + 1}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold ${badge.cls}">${badge.label}</span>
            </div>
            <div class="flex items-center gap-1">
              <button type="button" onclick="moveStation(${idx}, -1)" class="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold cursor-pointer" title="تحريك لأعلى">↑</button>
              <button type="button" onclick="moveStation(${idx}, 1)" class="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold cursor-pointer" title="تحريك لأسفل">↓</button>
              <button type="button" onclick="removeStation(${idx})" class="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer" title="حذف">✕</button>
            </div>
          </div>
          ${fieldsHtml}
        </div>
      `;
    })
    .join("");
}

function onFlightToAirportChange(idx) {
  const toVal = document.getElementById(`st-${idx}-to`)?.value.trim().toUpperCase() || "";
  const mappedCity = mapAirportCodeToCity(toVal);
  const destInput = document.getElementById("main-destination");
  if (mappedCity && destInput && !destInput.value.trim()) {
    destInput.value = mappedCity;
  }
}

// =======================================================================
// استخراج تلقائي من ملف PDF أو صورة (طيران / فندق / توصيل)
// =======================================================================
function triggerExtract(targetType) {
  extractTargetType = targetType;
  const fileInput = document.getElementById("extract-file-input");
  if (fileInput) {
    fileInput.value = "";
    fileInput.click();
  }
}

function fileToBase64Data(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || "");
      const base64 = res.includes(",") ? res.split(",")[1] : res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleExtractFileSelected(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  syncStationsFromDom();
  const statusBox = document.getElementById("extract-status");
  const statusText = document.getElementById("extract-status-text");
  if (statusBox) statusBox.classList.remove("hidden");
  if (statusText) statusText.textContent = `جاري تحليل "${file.name}" واستخراج البيانات...`;

  try {
    const base64Data = await fileToBase64Data(file);
    const mimeType = file.type || "application/pdf";

    let prompt = "";
    if (extractTargetType === "flight") {
      prompt = `استخرج بيانات تذكرة الطيران بدقة وأرجع JSON فقط بدون أي نص إضافي بالشكل التالي:
{
  "passengers": ["اسم المسافر 1", "اسم المسافر 2"],
  "fromAirport": "رمز مطار الذهاب مثل TLV",
  "toAirport": "رمز مطار الوصول مثل BUS",
  "flightNumber": "رقم رحلة الذهاب مثل KL 462",
  "airlinePnr": "رمز PNR الذهاب",
  "baggage": "تفاصيل الحقائب",
  "departureText": "تاريخ ووقت إقلاع الذهاب",
  "isRoundTrip": true,
  "returnFromAirport": "رمز مطار العودة إن وجد",
  "returnToAirport": "رمز مطار الوصول للعودة إن وجد",
  "returnFlightNumber": "رقم رحلة العودة إن وجد",
  "returnAirlinePnr": "رمز PNR العودة إن وجد",
  "returnDepartureText": "تاريخ ووقت إقلاع العودة إن وجد",
  "returnBaggage": "حقائب العودة إن وجدت"
}`;
    } else if (extractTargetType === "hotel") {
      prompt = `استخرج بيانات حجز الفندق بدقة وأرجع JSON فقط بدون أي نص إضافي بالشكل التالي:
{
  "hotelName": "اسم الفندق",
  "city": "المدينة",
  "checkIn": "تاريخ الدخول",
  "checkOut": "تاريخ الخروج",
  "nights": "عدد الليالي",
  "notes": "ملاحظات مثل الإفطار أو رقم الحجز"
}`;
    } else {
      prompt = `استخرج بيانات حجز التوصيل أو المواصلات بدقة وأرجع JSON فقط بدون أي نص إضافي بالشكل التالي:
{
  "fromLocation": "نقطة الانطلاق",
  "toLocation": "نقطة الوصول",
  "pickupTime": "التاريخ والوقت أو نوع السيارة",
  "notes": "ملاحظات إضافية"
}`;
    }

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const result = await callGeminiApi(payload);
    const rawText = extractGeminiText(result);
    const data = parseJsonLoose(rawText);

    if (!data) {
      showToast("لم يتمكن النظام من قراءة البيانات من الملف، يمكنك إدخالها يدوياً");
      return;
    }

    if (extractTargetType === "flight") {
      applyExtractedFlightData(data);
    } else if (extractTargetType === "hotel") {
      applyExtractedHotelData(data);
    } else {
      applyExtractedTransferData(data);
    }

    renderStationsEditor();
    showToast("تم استخراج البيانات وتعبئتها بنجاح");
  } catch (err) {
    showToast("حدث خطأ أثناء استخراج البيانات من الملف");
  } finally {
    if (statusBox) statusBox.classList.add("hidden");
    event.target.value = "";
  }
}

function applyExtractedFlightData(data) {
  if (Array.isArray(data.passengers) && data.passengers.length > 0) {
    const cleanPassengers = data.passengers.map((p) => String(p || "").trim()).filter(Boolean);
    if (cleanPassengers.length > 0) {
      const paxInput = document.getElementById("passengers-list-input");
      if (paxInput) paxInput.value = cleanPassengers.join("\n");

      const firstInput = document.getElementById("customer-first-name");
      const lastInput = document.getElementById("customer-last-name");
      const mainNameParts = cleanPassengers[0].split(/\s+/).filter(Boolean);
      if (firstInput && !firstInput.value.trim() && mainNameParts.length > 0) {
        firstInput.value = mainNameParts[0];
      }
      if (lastInput && !lastInput.value.trim() && mainNameParts.length > 1) {
        lastInput.value = mainNameParts.slice(1).join(" ");
      }
    }
  }

  const toCode = String(data.toAirport || "").trim().toUpperCase();
  const mappedCity = mapAirportCodeToCity(toCode);
  const destInput = document.getElementById("main-destination");
  if (mappedCity && destInput) {
    destInput.value = mappedCity;
  }

  let flightIdx = currentStations.findIndex((s) => s.type === "flight");
  if (flightIdx === -1) {
    currentStations.unshift(createStationObject("flight"));
    flightIdx = 0;
  }

  const st = currentStations[flightIdx];
  st.fromAirport = String(data.fromAirport || st.fromAirport || "").trim().toUpperCase();
  st.toAirport = toCode || st.toAirport;
  st.flightNumber = String(data.flightNumber || st.flightNumber || "").trim().toUpperCase();
  st.airlinePnr = String(data.airlinePnr || st.airlinePnr || "").trim().toUpperCase();
  st.baggage = String(data.baggage || st.baggage || "").trim();
  st.departureText = String(data.departureText || st.departureText || "").trim();

  const hasReturn = Boolean(
    data.isRoundTrip ||
      data.returnFlightNumber ||
      data.returnDepartureText ||
      data.returnFromAirport ||
      data.returnToAirport
  );

  if (hasReturn) {
    st.notes = st.notes ? `${st.notes} • ذهاب وعودة` : "ذهاب وعودة";

    let lastFlightIdx = -1;
    for (let i = currentStations.length - 1; i > flightIdx; i--) {
      if (currentStations[i].type === "flight") {
        lastFlightIdx = i;
        break;
      }
    }

    if (lastFlightIdx === -1) {
      currentStations.push(createStationObject("flight"));
      lastFlightIdx = currentStations.length - 1;
    }

    const retSt = currentStations[lastFlightIdx];
    retSt.fromAirport = String(data.returnFromAirport || toCode || retSt.fromAirport || "").trim().toUpperCase();
    retSt.toAirport = String(data.returnToAirport || data.fromAirport || retSt.toAirport || "").trim().toUpperCase();
    retSt.flightNumber = String(data.returnFlightNumber || retSt.flightNumber || "").trim().toUpperCase();
    retSt.airlinePnr = String(data.returnAirlinePnr || data.airlinePnr || retSt.airlinePnr || "").trim().toUpperCase();
    retSt.baggage = String(data.returnBaggage || data.baggage || retSt.baggage || "").trim();
    retSt.departureText = String(data.returnDepartureText || retSt.departureText || "").trim();
    retSt.notes = retSt.notes ? `${retSt.notes} • رحلة العودة` : "رحلة العودة";
  }
}

function applyExtractedHotelData(data) {
  let hotelIdx = currentStations.findIndex((s) => s.type === "hotel" && !s.name);
  if (hotelIdx === -1) {
    currentStations.push(createStationObject("hotel"));
    hotelIdx = currentStations.length - 1;
  }
  const st = currentStations[hotelIdx];
  st.name = String(data.hotelName || "").trim();
  const rawStars = String(data.stars || data.starRating || "").trim();
  if (rawStars) {
    st.stars = rawStars.includes("نجم") ? rawStars : `${rawStars} نجوم`;
  } else if (!st.stars) {
    st.stars = "5 نجوم";
  }
  st.checkIn = String(data.checkIn || "").trim();
  st.checkOut = String(data.checkOut || "").trim();
  st.nights = String(data.nights || "").trim();
  st.notes = String(data.notes || "").trim();

  const destInput = document.getElementById("main-destination");
  if (data.city && destInput && !destInput.value.trim()) {
    destInput.value = String(data.city).trim();
  }
}

function applyExtractedTransferData(data) {
  let trIdx = currentStations.findIndex((s) => s.type === "transfer" && !s.fromLocation && !s.toLocation);
  if (trIdx === -1) {
    currentStations.push(createStationObject("transfer"));
    trIdx = currentStations.length - 1;
  }
  const st = currentStations[trIdx];
  st.fromLocation = String(data.fromLocation || "").trim();
  st.toLocation = String(data.toLocation || "").trim();
  st.pickupTime = String(data.pickupTime || "").trim();
  st.notes = String(data.notes || "").trim();
}

// =======================================================================
// حفظ وتعديل وعرض الحجوزات في قسم الإدارة
// =======================================================================
async function saveBooking() {
  syncStationsFromDom();

  const firstName = document.getElementById("customer-first-name")?.value.trim() || "";
  const lastName = document.getElementById("customer-last-name")?.value.trim() || "";
  const destInput = document.getElementById("main-destination");
  let destination = destInput?.value.trim() || "";

  if (!destination) {
    const firstFlight = currentStations.find((s) => s.type === "flight" && s.toAirport);
    if (firstFlight) {
      destination = mapAirportCodeToCity(firstFlight.toAirport) || firstFlight.toAirport;
      if (destInput) destInput.value = destination;
    }
  }

  if (!firstName || !lastName) {
    showToast("يرجى إدخال الاسم الأول واسم العائلة للزبون الرئيسي");
    return;
  }

  const rawPax = document.getElementById("passengers-list-input")?.value || "";
  let passengers = rawPax
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const mainFullName = `${firstName} ${lastName}`.trim();
  if (!passengers.length) {
    passengers = [mainFullName];
  }

  const notes = document.getElementById("booking-notes-input")?.value.trim() || "";

  const editingId = document.getElementById("editing-booking-id")?.value.trim() || "";
  let pnr = document.getElementById("booking-pnr")?.value.trim().toUpperCase() || "";
  if (!pnr) {
    pnr = generateNextNdlCode();
  }

  const bookingObj = {
    id: editingId || "b-" + Date.now(),
    pnr,
    firstName,
    lastName,
    destination: destination || "وجهة السفر",
    passengers,
    notes,
    stations: JSON.parse(JSON.stringify(currentStations))
  };

  try {
    await apiRequest("/api/bookings", {
      method: "POST",
      body: JSON.stringify(bookingObj)
    });
    const idx = bookings.findIndex((b) => b.id === editingId);
    if (idx !== -1) bookings[idx] = bookingObj;
    else bookings.unshift(bookingObj);

    showToast(editingId
      ? `تم تحديث حجز ${mainFullName} (${pnr}) في قاعدة البيانات`
      : `تم حفظ الحجز باسم ${mainFullName} برمز ${pnr} في قاعدة البيانات`);
    renderBookingsList();
    renderGeneratedMessage(bookingObj);
    resetAdminForm();
  } catch (err) {
    console.error("Booking save failed:", err);
    showToast(err.message || "تعذر حفظ الحجز في قاعدة البيانات");
  }
}

function editBooking(bookingId) {
  const b = bookings.find((item) => item.id === bookingId);
  if (!b) return;

  document.getElementById("editing-booking-id").value = b.id;
  document.getElementById("customer-first-name").value = b.firstName || "";
  document.getElementById("customer-last-name").value = b.lastName || "";
  document.getElementById("main-destination").value = b.destination || "";
  document.getElementById("booking-pnr").value = b.pnr || "";
  document.getElementById("passengers-list-input").value = (b.passengers || []).join("\n");
  const notesInput = document.getElementById("booking-notes-input");
  if (notesInput) notesInput.value = b.notes || "";

  currentStations = JSON.parse(JSON.stringify(b.stations || []));
  renderStationsEditor();

  document.getElementById("form-heading").textContent = `تعديل حجز: ${b.firstName} ${b.lastName} (${b.pnr})`;
  document.getElementById("btn-cancel-edit").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  showToast(`تم تحميل بيانات حجز ${b.firstName} ${b.lastName} للتعديل`);
}

function cancelEditBooking() {
  resetAdminForm();
  showToast("تم إلغاء وضع التعديل");
}

function resetAdminForm() {
  document.getElementById("editing-booking-id").value = "";
  document.getElementById("customer-first-name").value = "";
  document.getElementById("customer-last-name").value = "";
  document.getElementById("main-destination").value = "";
  document.getElementById("booking-pnr").value = "";
  document.getElementById("passengers-list-input").value = "";
  const notesInput = document.getElementById("booking-notes-input");
  if (notesInput) notesInput.value = "";
  currentStations = [];
  renderStationsEditor();
  document.getElementById("form-heading").textContent = "إضافة حجز جديد";
  document.getElementById("btn-cancel-edit").classList.add("hidden");
}

async function deleteBooking(bookingId) {
  try {
    await apiRequest(`/api/bookings/${encodeURIComponent(bookingId)}`, { method: "DELETE" });
    bookings = bookings.filter((b) => b.id !== bookingId);
    renderBookingsList();
    showToast("تم حذف الحجز من قاعدة البيانات");
  } catch (err) {
    console.error("Booking delete failed:", err);
    showToast(err.message || "تعذر حذف الحجز من قاعدة البيانات");
  }
}

function renderGeneratedMessage(b) {
  const box = document.getElementById("generated-message-box");
  const pre = document.getElementById("generated-message-text");
  if (!box || !pre) return;

  const lines = [
    `مرحباً ${b.firstName} ${b.lastName}، أهلاً بك في ندلان تورز (Nadlantours) ✈️`,
    `تم تأكيد حجز رحلتك إلى: ${b.destination}`,
    `رمز الدخول / PNR: ${b.pnr}`,
    `اسم العائلة للدخول: ${b.lastName}`,
    `عدد المسافرين: ${(b.passengers || []).length}`,
    ...(b.notes ? [`ملاحظات: ${b.notes}`] : [])
  ];

  pre.textContent = lines.join("\n");
  box.classList.remove("hidden");
}

function copyGeneratedMessage() {
  const pre = document.getElementById("generated-message-text");
  if (!pre?.textContent) return;
  copyTextToClipboard(pre.textContent, "تم نسخ رسالة الزبون");
}

function renderBookingsList() {
  const listEl = document.getElementById("bookings-list");
  const badgeEl = document.getElementById("bookings-count-badge");
  const searchQuery = (document.getElementById("bookings-search-input")?.value || "")
    .trim()
    .toLowerCase();
  if (!listEl) return;

  const filtered = searchQuery
    ? bookings.filter((b) => {
        const haystack = [
          b.firstName,
          b.lastName,
          `${b.firstName || ""} ${b.lastName || ""}`,
          b.pnr,
          b.destination,
          b.notes
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(searchQuery);
      })
    : bookings;

  if (badgeEl) {
    badgeEl.textContent = searchQuery
      ? `${filtered.length} من ${bookings.length}`
      : `${bookings.length} ${bookings.length === 1 ? "حجز" : "حجوزات"}`;
  }

  if (!filtered.length) {
    const emptyMsg = searchQuery
      ? "لا توجد نتائج مطابقة للبحث"
      : "لا توجد حجوزات محفوظة حالياً";
    listEl.innerHTML = `<div class="text-xs text-slate-400 text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">${emptyMsg}</div>`;
    return;
  }

  listEl.innerHTML = filtered
    .map((b) => {
      const paxCount = (b.passengers || []).length;
      const notesHtml = b.notes
        ? `<p class="text-xs text-amber-900 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2 font-bold">📝 ${escapeHtml(b.notes)}</p>`
        : "";

      return `
        <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white transition space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-black text-slate-900">${escapeHtml(b.firstName)} ${escapeHtml(b.lastName)}</span>
                <span class="px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 text-xs font-black">${escapeHtml(b.pnr)}</span>
              </div>
              <p class="text-xs text-slate-600 mt-0.5">الوجهة: <strong class="text-slate-900">${escapeHtml(b.destination)}</strong> • المسافرون: <strong>${paxCount}</strong></p>
            </div>
          </div>
          ${notesHtml}
          <div class="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onclick="editBooking('${escapeHtml(b.id)}')"
              class="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-extrabold cursor-pointer"
            >
              ✏️ تعديل الحجز
            </button>
            <button
              type="button"
              onclick="openBookingInCustomerPortal('${escapeHtml(b.id)}')"
              class="px-3 py-1.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-extrabold cursor-pointer"
            >
              🧳 فتح بوابة الزبون
            </button>
            <button
              type="button"
              onclick="deleteBooking('${escapeHtml(b.id)}')"
              class="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
            >
              حذف
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

// =======================================================================
// بوابة الزبون والشيك إن (24 ساعة أو أقل + شركة الطيران من رقم الرحلة)
// =======================================================================
function renderQuickDemoBookings() {
  const box = document.getElementById("quick-demo-bookings");
  if (!box) return;
  if (!bookings.length) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = bookings
    .slice(0, 4)
    .map(
      (b) => `
      <button
        type="button"
        onclick="openBookingInCustomerPortal('${escapeHtml(b.id)}')"
        class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-brand-100 text-slate-800 hover:text-brand-900 text-xs font-extrabold border border-slate-200 transition cursor-pointer"
      >
        ${escapeHtml(b.firstName)} ${escapeHtml(b.lastName)} (${escapeHtml(b.pnr)})
      </button>
    `
    )
    .join("");
}

function loginCustomerPortal() {
  const pnrInput = document.getElementById("login-pnr")?.value.trim().toUpperCase() || "";
  const lastInput = document.getElementById("login-last-name")?.value.trim() || "";
  const errBox = document.getElementById("login-error-msg");

  if (!pnrInput || !lastInput) {
    if (errBox) {
      errBox.textContent = "يرجى إدخال رمز PNR واسم العائلة معاً.";
      errBox.classList.remove("hidden");
    }
    return;
  }

  const found = bookings.find(
    (b) =>
      String(b.pnr || "").trim().toUpperCase() === pnrInput &&
      String(b.lastName || "").trim().toLowerCase() === lastInput.toLowerCase()
  );

  if (!found) {
    if (errBox) {
      errBox.textContent = "لم يتم العثور على حجز مطابق لرمز PNR واسم العائلة.";
      errBox.classList.remove("hidden");
    }
    return;
  }

  if (errBox) errBox.classList.add("hidden");
  openBookingInCustomerPortal(found.id);
}

function openBookingInCustomerPortal(bookingId) {
  const found = bookings.find((b) => b.id === bookingId);
  if (!found) return;

  activeCustomerBooking = found;
  switchPortal("customer");
  document.getElementById("customer-login-card").classList.add("hidden");
  document.getElementById("customer-dashboard").classList.remove("hidden");

  renderCustomerDashboard(found);
  renderCustomerNotesCard(found);
  initAiChatForBooking(found);
  fetchDestinationIntelligence(found.destination);
}

function logoutCustomerPortal() {
  activeCustomerBooking = null;
  document.getElementById("customer-dashboard").classList.add("hidden");
  document.getElementById("customer-login-card").classList.remove("hidden");
  document.getElementById("login-pnr").value = "";
  document.getElementById("login-last-name").value = "";
}

function resolveAirlineCheckinInfo(flightNumber, notesOrCarrier) {
  const numStr = String(flightNumber || "").trim().toUpperCase();
  const extraStr = String(notesOrCarrier || "").trim().toUpperCase();

  const codeMatch = numStr.match(/^([A-Z0-9]{2})\s*\d+/);
  if (codeMatch && AIRLINE_CHECKIN_DIRECTORY[codeMatch[1]]) {
    return AIRLINE_CHECKIN_DIRECTORY[codeMatch[1]];
  }

  for (const [code, info] of Object.entries(AIRLINE_CHECKIN_DIRECTORY)) {
    const nameUpper = info.name.toUpperCase();
    if (
      numStr.startsWith(code) ||
      extraStr.includes(nameUpper) ||
      new RegExp(`\\b${code}\\b`).test(extraStr)
    ) {
      return info;
    }
  }

  const fallbackQuery = encodeURIComponent(`${flightNumber || notesOrCarrier || "airline"} online check in`);
  const label = flightNumber || notesOrCarrier || "شركة الطيران";
  return {
    name: label,
    url: `https://www.google.com/search?q=${fallbackQuery}`
  };
}

function getCheckinFlightCodes(booking) {
  const flightStations = (booking.stations || []).filter((s) => s.type === "flight");
  const outboundStop = flightStations[0] || null;
  const returnStop = flightStations.length > 1 ? flightStations[flightStations.length - 1] : null;

  const outboundPnr = (outboundStop?.airlinePnr || booking.pnr || "").trim().toUpperCase();
  let returnPnr = "";
  if (returnStop) {
    const rCode = (returnStop.airlinePnr || "").trim().toUpperCase();
    if (rCode && rCode !== outboundPnr) {
      returnPnr = rCode;
    }
  }

  return {
    outboundStop,
    returnStop,
    outboundPnr,
    returnPnr,
    lastName: booking.lastName || ""
  };
}

function parseDepartureDateToTimestamp(departureText) {
  if (!departureText) return null;
  const raw = String(departureText).trim();

  const monthsMap = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12"
  };

  const timeMatch = raw.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  const hh = timeMatch ? String(timeMatch[1]).padStart(2, "0") : "09";
  const mm = timeMatch ? String(timeMatch[2]).padStart(2, "0") : "00";
  const ss = timeMatch && timeMatch[3] ? String(timeMatch[3]).padStart(2, "0") : "00";

  const monthNameMatch = raw.match(/\b(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?\b/);
  if (monthNameMatch) {
    const day = String(monthNameMatch[1]).padStart(2, "0");
    const monthKey = monthNameMatch[2].toLowerCase();
    const month = monthsMap[monthKey];
    if (month) {
      let year = monthNameMatch[3];
      if (!year) {
        const now = new Date();
        year = String(now.getFullYear());
        const candidate = new Date(`${year}-${month}-${day}T${hh}:${mm}:${ss}`);
        if (candidate.getTime() < now.getTime() - 7 * 24 * 3600 * 1000) {
          year = String(now.getFullYear() + 1);
        }
      }
      const ts = new Date(`${year}-${month}-${day}T${hh}:${mm}:${ss}`).getTime();
      if (!Number.isNaN(ts)) return ts;
    }
  }

  const ymdMatch = raw.match(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = String(ymdMatch[2]).padStart(2, "0");
    const day = String(ymdMatch[3]).padStart(2, "0");
    const ts = new Date(`${year}-${month}-${day}T${hh}:${mm}:${ss}`).getTime();
    if (!Number.isNaN(ts)) return ts;
  }

  const dmyMatch = raw.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (dmyMatch) {
    const day = String(dmyMatch[1]).padStart(2, "0");
    const month = String(dmyMatch[2]).padStart(2, "0");
    const year = dmyMatch[3];
    const ts = new Date(`${year}-${month}-${day}T${hh}:${mm}:${ss}`).getTime();
    if (!Number.isNaN(ts)) return ts;
  }

  const directTs = Date.parse(raw);
  return Number.isNaN(directTs) ? null : directTs;
}

function renderCheckinAlertBanner(booking) {
  const banner = document.getElementById("checkin-alert-banner");
  const badgeEl = document.getElementById("checkin-alert-badge");
  const titleEl = document.getElementById("checkin-alert-title");
  const descEl = document.getElementById("checkin-alert-desc");
  const codesEl = document.getElementById("checkin-alert-codes");
  const checkinLinkBtn = document.getElementById("btn-airline-checkin-link");
  const checkinNameSpan = document.getElementById("btn-airline-checkin-name");
  const copyCheckinBtn = document.getElementById("btn-copy-checkin-info");
  if (!banner || !booking) return;

  const codes = getCheckinFlightCodes(booking);
  const airlineInfo = resolveAirlineCheckinInfo(
    codes.outboundStop?.flightNumber,
    codes.outboundStop?.notes
  );

  const depTs = parseDepartureDateToTimestamp(codes.outboundStop?.departureText);
  const hoursLeft = depTs !== null ? (depTs - Date.now()) / (1000 * 3600) : null;

  if (hoursLeft !== null && hoursLeft <= 24) {
    banner.classList.remove("hidden");
    banner.className = "bg-gradient-to-l from-amber-400 via-amber-300 to-yellow-300 text-slate-950 rounded-3xl p-4 sm:p-5 shadow-lg border-2 border-amber-500 flex flex-wrap items-center justify-between gap-4";
    if (badgeEl) badgeEl.textContent = "🔥 فتح الشيك إن!";
    if (titleEl) titleEl.textContent = "رحلتك اقتربت وبوابة الشيك إن مفتوحة الآن!";
    if (descEl) {
      descEl.textContent = `أتمم تسجيل الدخول (Check-in) الآن باستخدام رمز PNR واسم العائلة (${codes.lastName}) لتأكيد مقعدك.`;
    }
    if (codesEl) {
      const badges = [
        `<span class="px-3 py-1 rounded-xl bg-slate-950 text-amber-300">PNR الذهاب: ${escapeHtml(codes.outboundPnr)}</span>`,
        `<span class="px-3 py-1 rounded-xl bg-white text-slate-900 border border-amber-500">اسم العائلة: ${escapeHtml(codes.lastName)}</span>`
      ];
      if (codes.returnPnr) {
        badges.push(
          `<span class="px-3 py-1 rounded-xl bg-brand-900 text-white">PNR العودة: ${escapeHtml(codes.returnPnr)}</span>`
        );
      }
      codesEl.innerHTML = badges.join("");
    }
    if (copyCheckinBtn) copyCheckinBtn.classList.remove("hidden");
    if (checkinLinkBtn && airlineInfo?.url) {
      checkinLinkBtn.href = airlineInfo.url;
      checkinLinkBtn.classList.remove("hidden");
      checkinLinkBtn.classList.add("inline-flex");
      if (checkinNameSpan) checkinNameSpan.textContent = `(${airlineInfo.name})`;
    }
    return;
  }

  if (hoursLeft !== null && hoursLeft > 24) {
    const daysLeft = Math.max(1, Math.ceil(hoursLeft / 24));
    const dayWord = daysLeft === 1 ? "يوم" : daysLeft <= 10 ? "أيام" : "يوماً";

    banner.classList.remove("hidden");
    banner.className = "bg-gradient-to-l from-brand-800 via-brand-700 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-md border border-brand-600 flex flex-wrap items-center justify-between gap-4";
    if (badgeEl) badgeEl.textContent = "⏳ العد التنازلي للرحلة";
    if (titleEl) titleEl.textContent = `متبقي على رحلتك ${daysLeft} ${dayWord}!`;
    if (descEl) {
      descEl.textContent = `باقي على موعد إقلاع رحلتك ${daysLeft} ${dayWord} (${codes.outboundStop?.departureText || "الموعد المحدد"}) — سيُفتح الشيك إن قبل الرحلة بـ 24 ساعة أو أقل.`;
    }
    if (codesEl) {
      codesEl.innerHTML = `
        <span class="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-black">⏳ باقي ${daysLeft} ${dayWord}</span>
        <span class="px-3 py-1 rounded-xl bg-white/15 text-amber-300 border border-white/20">الوجهة: ${escapeHtml(booking.destination)}</span>
      `;
    }
    if (copyCheckinBtn) copyCheckinBtn.classList.add("hidden");
    if (checkinLinkBtn) {
      checkinLinkBtn.classList.add("hidden");
      checkinLinkBtn.classList.remove("inline-flex");
    }
    return;
  }

  banner.classList.add("hidden");
}

function copyCheckinCodesInfo() {
  if (!activeCustomerBooking) return;
  const codes = getCheckinFlightCodes(activeCustomerBooking);
  const lines = [
    `بيانات الشيك إن — ندلان تورز:`,
    `PNR الذهاب: ${codes.outboundPnr}`,
    `اسم العائلة: ${codes.lastName}`
  ];
  if (codes.returnPnr) {
    lines.push(`PNR العودة: ${codes.returnPnr}`);
  }
  copyTextToClipboard(lines.join("\n"), "تم نسخ بيانات الشيك إن");
}

function renderCustomerNotesCard(booking) {
  const notesCard = document.getElementById("customer-notes-card");
  const notesTextEl = document.getElementById("customer-notes-text");
  if (!notesCard || !notesTextEl) return;

  const cleanNotes = String((booking && booking.notes) || "").trim();
  if (cleanNotes) {
    notesTextEl.textContent = cleanNotes;
    notesCard.classList.remove("hidden");
    notesCard.classList.add("block");
  } else {
    notesTextEl.textContent = "";
    notesCard.classList.add("hidden");
    notesCard.classList.remove("block");
  }
}

function renderCustomerDashboard(booking) {
  document.getElementById("customer-welcome-name").textContent = `${booking.firstName} ${booking.lastName}`;
  document.getElementById("customer-pnr-badge").textContent = `PNR: ${booking.pnr}`;

  const destBadge = document.getElementById("customer-dest-badge");
  destBadge.innerHTML = `
    <span>الوجهة: <strong>${escapeHtml(booking.destination)}</strong></span>
    <span id="dest-loading-dots" class="inline-flex items-center gap-0.5 text-brand-700 mr-1">
      <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
    </span>
  `;

  renderCheckinAlertBanner(booking);
  renderCustomerNotesCard(booking);

  const notesCard = document.getElementById("customer-notes-card");
  const notesTextEl = document.getElementById("customer-notes-text");
  if (notesCard && notesTextEl) {
    const cleanNotes = String(booking.notes || "").trim();
    if (cleanNotes) {
      notesTextEl.textContent = cleanNotes;
      notesCard.classList.remove("hidden");
    } else {
      notesTextEl.textContent = "";
      notesCard.classList.add("hidden");
    }
  }

  const stagesList = document.getElementById("customer-stages-list");
  const countEl = document.getElementById("customer-stages-count");
  const stations = booking.stations || [];

  if (countEl) {
    countEl.textContent = `${stations.length} ${stations.length === 1 ? "محطة" : "محطات"}`;
  }

  if (!stations.length) {
    stagesList.innerHTML = `<div class="bg-white rounded-3xl p-6 text-center text-xs text-slate-500 border border-slate-200">لا توجد محطات مسجلة في هذا الحجز حالياً.</div>`;
    return;
  }

  stagesList.innerHTML = stations
    .map((st, idx) => {
      if (st.type === "flight") {
        const checkinInfo = resolveAirlineCheckinInfo(st.flightNumber, st.notes);
        const fromCode = st.fromAirport || "—";
        const toCode = st.toAirport || "—";
        const fromCity = mapAirportCodeToCity(fromCode);
        const toCity = mapAirportCodeToCity(toCode);

        const isReturnFlight =
          idx > 0 ||
          /عود[ةه]|return/i.test(String(st.notes || ""));

        const routeBadgeHtml = isReturnFlight
          ? `
            <div class="flex flex-col items-end gap-1 bg-indigo-50/70 px-3.5 py-2 rounded-2xl border border-indigo-200">
              <div class="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-900">
                <span class="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 text-[11px] font-black">عودة</span>
                <span>${escapeHtml(fromCode)}${fromCity ? ` (${escapeHtml(fromCity)})` : ""}</span>
              </div>
              <div class="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-900">
                <span class="text-indigo-600 font-black">⬅ ➔</span>
                <span>${escapeHtml(toCode)}${toCity ? ` (${escapeHtml(toCity)})` : ""}</span>
              </div>
            </div>
          `
          : `
            <div class="flex flex-col items-end gap-1 bg-sky-50/70 px-3.5 py-2 rounded-2xl border border-sky-200">
              <div class="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-900">
                <span class="px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 text-[11px] font-black">ذهاب</span>
                <span>${escapeHtml(fromCode)}${fromCity ? ` (${escapeHtml(fromCity)})` : ""}</span>
              </div>
              <div class="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-900">
                <span class="text-sky-600 font-black">➔</span>
                <span>${escapeHtml(toCode)}${toCity ? ` (${escapeHtml(toCity)})` : ""}</span>
              </div>
            </div>
          `;

        return `
          <div class="bg-white rounded-3xl border border-sky-200/90 p-5 space-y-4 shadow-2xs">
            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="w-7 h-7 rounded-xl bg-sky-900 text-white text-xs font-black flex items-center justify-center">${idx + 1}</span>
                <span class="text-xs font-black text-sky-900 bg-sky-100 px-3 py-1 rounded-full">✈️ رحلة طيران${isReturnFlight ? " (عودة)" : " (ذهاب)"}</span>
              </div>
              ${routeBadgeHtml}
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
                <span class="block text-[11px] font-bold text-slate-500">رقم الطيران</span>
                <span class="text-xs sm:text-sm font-black text-slate-900">${escapeHtml(st.flightNumber || "غير محدد")}</span>
              </div>
              <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
                <span class="block text-[11px] font-bold text-slate-500">رمز PNR الطيران</span>
                <span class="text-xs sm:text-sm font-black text-brand-800">${escapeHtml(st.airlinePnr || booking.pnr || "—")}</span>
              </div>
              <div class="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
                <span class="block text-[11px] font-bold text-slate-500">موعد الإقلاع</span>
                <span class="text-xs sm:text-sm font-black text-slate-900">${escapeHtml(st.departureText || "غير محدد")}</span>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div class="bg-sky-50/70 border border-sky-100 rounded-2xl p-3">
                <span class="block text-[11px] font-bold text-sky-800">🧳 الحقائب المسموحة</span>
                <span class="text-xs font-extrabold text-slate-900">${escapeHtml(st.baggage || "حسب تذكرة الطيران")}</span>
              </div>
              <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
                <span class="block text-[11px] font-bold text-slate-500">📌 ملاحظات الرحلة</span>
                <span class="text-xs font-bold text-slate-800">${escapeHtml(st.notes || "رحلة مؤكدة")}</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onclick="openPassengersModal()"
                  class="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black transition cursor-pointer"
                >
                  👥 المسافرين
                </button>
                ${
                  checkinInfo?.url
                    ? `<a href="${escapeHtml(checkinInfo.url)}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-extrabold transition inline-flex items-center gap-1.5">✈️ شيك إن (${escapeHtml(checkinInfo.name)})</a>`
                    : ""
                }
              </div>
            </div>
          </div>
        `;
      }

      if (st.type === "hotel") {
        const starsText = st.stars || "5 نجوم";
        const starsCountMatch = starsText.match(/(\d)/);
        const starsNum = starsCountMatch ? Math.min(5, Math.max(1, parseInt(starsCountMatch[1], 10))) : 5;
        const starsVisual = "★".repeat(starsNum);

        return `
          <div class="bg-white rounded-3xl border border-indigo-200/90 p-5 space-y-4 shadow-2xs">
            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="w-7 h-7 rounded-xl bg-indigo-900 text-white text-xs font-black flex items-center justify-center">${idx + 1}</span>
                <span class="text-xs font-black text-indigo-900 bg-indigo-100 px-3 py-1 rounded-full">🏨 إقامة فندقية</span>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black" title="${escapeHtml(starsText)}">${escapeHtml(starsText)} (${starsVisual})</span>
                ${
                  st.nights
                    ? `<span class="px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-black">${escapeHtml(st.nights)}</span>`
                    : ""
                }
              </div>
            </div>

            <div>
              <span class="block text-[11px] font-bold text-slate-500 mb-0.5">اسم الفندق</span>
              <h4 class="text-base font-black text-slate-900">${escapeHtml(st.name || "فندق")}</h4>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div class="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3">
                <span class="block text-[11px] font-bold text-indigo-800">📥 تاريخ الدخول (Check-in)</span>
                <span class="text-xs sm:text-sm font-black text-slate-900">${escapeHtml(st.checkIn || "غير محدد")}</span>
              </div>
              <div class="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3">
                <span class="block text-[11px] font-bold text-indigo-800">📤 تاريخ الخروج (Check-out)</span>
                <span class="text-xs sm:text-sm font-black text-slate-900">${escapeHtml(st.checkOut || "غير محدد")}</span>
              </div>
            </div>

            <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
              <span class="block text-[11px] font-bold text-slate-500">📝 تفاصيل وملاحظات الإقامة</span>
              <span class="text-xs font-bold text-slate-800">${escapeHtml(st.notes || "إقامة مؤكدة")}</span>
            </div>
          </div>
        `;
      }

      if (st.type === "transfer") {
        return `
          <div class="bg-white rounded-3xl border border-amber-200/90 p-5 space-y-3 shadow-2xs">
            <div class="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">${idx + 1}</span>
                <span class="text-xs font-black text-amber-950 bg-amber-100 px-3 py-1 rounded-full">🚐 توصيل ومواصلات</span>
              </div>
              ${st.pickupTime ? `<span class="text-xs font-extrabold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">${escapeHtml(st.pickupTime)}</span>` : ""}
            </div>
            <p class="text-sm font-black text-slate-900">${escapeHtml(st.fromLocation || "—")} <span class="text-amber-600 mx-1">➔</span> ${escapeHtml(st.toLocation || "—")}</p>
            ${st.notes ? `<p class="text-xs text-slate-600 font-bold bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">${escapeHtml(st.notes)}</p>` : ""}
          </div>
        `;
      }

      return `
        <div class="bg-white rounded-3xl border border-emerald-200/90 p-5 space-y-3 shadow-2xs">
          <div class="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-xl bg-emerald-700 text-white text-xs font-black flex items-center justify-center">${idx + 1}</span>
              <span class="text-xs font-black text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full">🗺️ جولة سياحية</span>
            </div>
            ${st.dateText ? `<span class="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">${escapeHtml(st.dateText)}</span>` : ""}
          </div>
          <p class="text-sm font-black text-slate-900">${escapeHtml(st.title || "جولة سياحية")}</p>
          ${st.notes ? `<p class="text-xs text-slate-600 font-bold bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">${escapeHtml(st.notes)}</p>` : ""}
        </div>
      `;
    })
    .join("");
}

// =======================================================================
// نافذة المسافرين (Popup)
// =======================================================================
function openPassengersModal() {
  const modal = document.getElementById("passengers-modal");
  const listEl = document.getElementById("passengers-modal-list");
  if (!modal || !listEl || !activeCustomerBooking) return;

  const pax = activeCustomerBooking.passengers || [];
  if (!pax.length) {
    listEl.innerHTML = `<div class="text-xs text-slate-500 text-center py-4">لا توجد أسماء مسافرين مسجلة</div>`;
  } else {
    listEl.innerHTML = pax
      .map(
        (name, i) => `
        <div class="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200">
          <span class="text-sm font-black text-slate-900">${escapeHtml(name)}</span>
          <span class="text-xs font-extrabold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full">مسافر #${i + 1}</span>
        </div>
      `
      )
      .join("");
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closePassengersModal() {
  const modal = document.getElementById("passengers-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// =======================================================================
// معلومات الوجهة التلقائية بالذكاء الاصطناعي (الطقس 5 أيام، 4 مناطق، 5 مطاعم حلال، الفيوز)
// =======================================================================
async function fetchDestinationIntelligence(city) {
  const cleanCity = String(city || "").trim();
  if (!cleanCity) return;

  const dots = document.getElementById("dest-loading-dots");
  if (dots) dots.classList.remove("hidden");

  document.getElementById("weather-city-label").textContent = cleanCity;

  const todayStr = getTodayFormatted();
  const prompt = `ابحث عن معلومات دقيقة ومحدثة لمدينة "${cleanCity}" بدءاً من تاريخ اليوم (${todayStr}) وأرجع JSON فقط بالشكل التالي:
{
  "weather5Days": [
    { "day": "اليوم / التاريخ", "temp": "درجة الحرارة مثل 18°C", "condition": "حالة الطقس بالعربية", "icon": "☀️ أو ⛅ أو 🌧️" }
  ],
  "attractions4": [
    { "name": "اسم المنطقة السياحية الحقيقية في ${cleanCity}", "desc": "وصف مختصر مفيد بالعربية" }
  ],
  "halalRestaurants5": [
    { "name": "اسم المطعم الحلال الحقيقي في ${cleanCity}", "rating": "التقييم مثل 4.7 ★", "cuisine": "نوع الأكل أو المنطقة" }
  ],
  "power": {
    "voltage": "الجهد والتردد مثل 230V / 50Hz",
    "plugType": "نوع القابس مثل Type C / F أو Type G أو Type A / B",
    "category": "EU أو UK أو US",
    "notes": "ملاحظة مختصرة عن الفيش والفيوز في ${cleanCity}"
  }
}
تأكد أن weather5Days تحتوي 5 أيام، و attractions4 تحتوي 4 مناطق، و halalRestaurants5 تحتوي 5 مطاعم.`;

  try {
    // 1) المحاولة مع تفعيل البحث المباشر (google_search)
    let parsed = null;
    try {
      const searchResult = await callGeminiApi({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }]
      });
      parsed = parseJsonLoose(extractGeminiText(searchResult));
    } catch (_) {
      parsed = null;
    }

    // 2) إذا لم يرجع JSON مع البحث، نطلب JSON مباشر من Gemini بدون البحث أو responseMimeType متعارض
    if (!parsed) {
      const directResult = await callGeminiApi({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      });
      parsed = parseJsonLoose(extractGeminiText(directResult));
    }

    if (parsed) {
      renderDestinationSections(cleanCity, parsed);
    } else {
      renderFallbackDestinationSections(cleanCity);
    }
  } catch (_) {
    renderFallbackDestinationSections(cleanCity);
  } finally {
    if (dots) dots.classList.add("hidden");
  }
}

function renderFallbackDestinationSections(city) {
  renderDestinationSections(city, {
    weather5Days: [
      { day: "اليوم 1", temp: "17°C", condition: "غائم جزئياً", icon: "⛅" },
      { day: "اليوم 2", temp: "18°C", condition: "مشمس لطيف", icon: "☀️" },
      { day: "اليوم 3", temp: "16°C", condition: "زخات خفيفة", icon: "🌧️" },
      { day: "اليوم 4", temp: "19°C", condition: "صافٍ", icon: "☀️" },
      { day: "اليوم 5", temp: "18°C", condition: "معتدل", icon: "⛅" }
    ],
    attractions4: [
      { name: `كورنيش وواجهة ${city} البحرية`, desc: "ممشى رائع للتنزه والاستمتاع بالإطلالات." },
      { name: `البلدة القديمة والأسواق في ${city}`, desc: "تجربة ثقافية وتسوق محلي مميز." },
      { name: `المرتفعات والإطلالات البانورامية`, desc: "أفضل نقطة لمشاهدة المدينة من الأعلى." },
      { name: `الحدائق والمتنزهات العامة`, desc: "مكان مثالي للعائلات والاسترخاء." }
    ],
    halalRestaurants5: [
      { name: "مطعم الياسمين الحلال", rating: "4.8 ★", cuisine: "مأكولات شرق أوسطية ومشاوي" },
      { name: "بيت الشام الحلال", rating: "4.7 ★", cuisine: "مشاوي ومقبلات" },
      { name: "مطبخ الأناضول الحلال", rating: "4.6 ★", cuisine: "أطباق محلية ومشوية" },
      { name: "سفرة الخليج الحلال", rating: "4.7 ★", cuisine: "أرز ولحوم" },
      { name: "واحة النكهات الحلال", rating: "4.5 ★", cuisine: "مأكولات متنوعة" }
    ],
    power: {
      voltage: "230V / 50Hz",
      plugType: "Type C / F",
      category: "EU",
      notes: "يُنصح باصطحاب محول سفر عالمي للأجهزة ذات القوابس المختلفة."
    }
  });
}

function getPlugSvgIllustration(category) {
  const cat = String(category || "EU").toUpperCase();
  if (cat === "UK") {
    return `
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center space-y-2">
          <svg viewBox="0 0 120 100" class="w-24 h-20 mx-auto">
            <rect x="20" y="10" width="80" height="80" rx="14" fill="#f1f5f9" stroke="#334155" stroke-width="3"/>
            <rect x="55" y="22" width="10" height="18" rx="2" fill="#0f172a"/>
            <rect x="34" y="54" width="16" height="8" rx="2" fill="#0f172a"/>
            <rect x="70" y="54" width="16" height="8" rx="2" fill="#0f172a"/>
          </svg>
          <p class="text-[11px] font-black text-slate-700">الفيش الجداري (Type G)</p>
        </div>
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center space-y-2">
          <svg viewBox="0 0 120 100" class="w-24 h-20 mx-auto">
            <path d="M25 25 L95 25 L82 85 L38 85 Z" fill="#e2e8f0" stroke="#0f766e" stroke-width="3"/>
            <rect x="56" y="12" width="8" height="14" rx="2" fill="#0f766e"/>
            <rect x="36" y="42" width="14" height="7" rx="2" fill="#0f766e"/>
            <rect x="70" y="42" width="14" height="7" rx="2" fill="#0f766e"/>
            <rect x="46" y="60" width="28" height="10" rx="3" fill="#f59e0b"/>
          </svg>
          <p class="text-[11px] font-black text-slate-700">القابس والفيوز الداخلي</p>
        </div>
      </div>
    `;
  }

  if (cat === "US") {
    return `
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center space-y-2">
          <svg viewBox="0 0 120 100" class="w-24 h-20 mx-auto">
            <rect x="22" y="12" width="76" height="76" rx="14" fill="#f1f5f9" stroke="#334155" stroke-width="3"/>
            <rect x="42" y="30" width="6" height="22" rx="2" fill="#0f172a"/>
            <rect x="72" y="30" width="6" height="22" rx="2" fill="#0f172a"/>
            <circle cx="60" cy="66" r="6" fill="#0f172a"/>
          </svg>
          <p class="text-[11px] font-black text-slate-700">الفيش الجداري (Type A/B)</p>
        </div>
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center space-y-2">
          <svg viewBox="0 0 120 100" class="w-24 h-20 mx-auto">
            <rect x="30" y="34" width="60" height="44" rx="10" fill="#e2e8f0" stroke="#0f766e" stroke-width="3"/>
            <rect x="42" y="14" width="6" height="20" rx="2" fill="#0f766e"/>
            <rect x="72" y="14" width="6" height="20" rx="2" fill="#0f766e"/>
            <rect x="44" y="50" width="32" height="10" rx="3" fill="#f59e0b"/>
          </svg>
          <p class="text-[11px] font-black text-slate-700">رأس القابس والفيوز</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center space-y-2">
        <svg viewBox="0 0 120 100" class="w-24 h-20 mx-auto">
          <circle cx="60" cy="50" r="36" fill="#f1f5f9" stroke="#334155" stroke-width="3"/>
          <circle cx="46" cy="50" r="6" fill="#0f172a"/>
          <circle cx="74" cy="50" r="6" fill="#0f172a"/>
          <line x1="60" y1="16" x2="60" y2="24" stroke="#0f766e" stroke-width="3"/>
          <line x1="60" y1="76" x2="60" y2="84" stroke="#0f766e" stroke-width="3"/>
        </svg>
        <p class="text-[11px] font-black text-slate-700">الفيش الجداري (Type C/F)</p>
      </div>
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center space-y-2">
        <svg viewBox="0 0 120 100" class="w-24 h-20 mx-auto">
          <circle cx="52" cy="54" r="26" fill="#e2e8f0" stroke="#0f766e" stroke-width="3"/>
          <rect x="76" y="42" width="24" height="6" rx="3" fill="#0f172a"/>
          <rect x="76" y="58" width="24" height="6" rx="3" fill="#0f172a"/>
          <rect x="38" y="49" width="28" height="10" rx="3" fill="#f59e0b"/>
        </svg>
        <p class="text-[11px] font-black text-slate-700">رأس القابس والفيوز</p>
      </div>
    </div>
  `;
}

function renderDestinationSections(city, data) {
  const weatherGrid = document.getElementById("weather-5days-grid");
  const days = Array.isArray(data.weather5Days) ? data.weather5Days.slice(0, 5) : [];
  if (weatherGrid && days.length) {
    weatherGrid.innerHTML = days
      .map(
        (d) => `
        <div class="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 text-center space-y-1.5">
          <p class="text-xs font-extrabold text-slate-600">${escapeHtml(d.day || "")}</p>
          <div class="text-2xl">${escapeHtml(d.icon || "🌤️")}</div>
          <p class="text-base font-black text-slate-900">${escapeHtml(d.temp || "")}</p>
          <p class="text-xs font-bold text-brand-800">${escapeHtml(d.condition || "")}</p>
        </div>
      `
      )
      .join("");
  }

  const attrGrid = document.getElementById("attractions-4-grid");
  const attrs = Array.isArray(data.attractions4) ? data.attractions4.slice(0, 4) : [];
  if (attrGrid && attrs.length) {
    attrGrid.innerHTML = attrs
      .map(
        (a, idx) => `
        <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
          <span class="w-7 h-7 rounded-xl bg-brand-700 text-white text-xs font-black flex items-center justify-center shrink-0">${idx + 1}</span>
          <div>
            <h4 class="text-sm font-black text-slate-900">${escapeHtml(a.name || "")}</h4>
            <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">${escapeHtml(a.desc || "")}</p>
          </div>
        </div>
      `
      )
      .join("");
  }

  const halalGrid = document.getElementById("halal-5-grid");
  const restaurants = Array.isArray(data.halalRestaurants5) ? data.halalRestaurants5.slice(0, 5) : [];
  if (halalGrid && restaurants.length) {
    halalGrid.innerHTML = restaurants
      .map(
        (r, idx) => `
        <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">${idx + 1}</span>
            <div>
              <h4 class="text-sm font-black text-slate-900">${escapeHtml(r.name || "")}</h4>
              <p class="text-xs text-slate-500 font-bold">${escapeHtml(r.cuisine || "")}</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 text-xs font-black shrink-0">${escapeHtml(r.rating || "★")}</span>
        </div>
      `
      )
      .join("");
  }

  const power = data.power || {};
  const badgeEl = document.getElementById("plug-voltage-badge");
  const cardEl = document.getElementById("power-info-card");
  if (badgeEl) {
    badgeEl.textContent = `${power.voltage || "230V / 50Hz"} • ${power.plugType || "Type C/F"}`;
  }
  if (cardEl) {
    cardEl.innerHTML = `
      <div class="md:col-span-6 space-y-2">
        <p class="text-sm font-black text-slate-900">مواصفات الكهرباء في ${escapeHtml(city)}:</p>
        <ul class="text-xs sm:text-sm text-slate-700 font-bold space-y-1.5">
          <li>• الجهد والتردد: <strong>${escapeHtml(power.voltage || "230V / 50Hz")}</strong></li>
          <li>• نوع القابس / الفيش: <strong>${escapeHtml(power.plugType || "Type C / F")}</strong></li>
        </ul>
        <p class="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200 leading-relaxed">
          ${escapeHtml(power.notes || "")}
        </p>
      </div>
      <div class="md:col-span-6">
        ${getPlugSvgIllustration(power.category)}
      </div>
    `;
  }
}

// =======================================================================
// شات مساعد ندلان تورز الذكي (Gemini + تاريخ اليوم + Bold للكلمات المهمة)
// =======================================================================
function formatAiMarkdownBold(text) {
  const normalized = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/([^\n])\s*([•\-–])\s+/g, "$1\n• ")
    .replace(/([^\n])\s*(\d+[.)])\s+/g, "$1\n$2 ");
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);
  const formattedLines = lines.map((line) => {
    const escaped = escapeHtml(line).replace(/\*\*(.+?)\*\*/g, "<strong class='font-black text-slate-950'>$1</strong>");
    if (escaped.startsWith("• ")) {
      return `<div class="flex items-start gap-1.5 pr-1"><span class="text-brand-700 font-black">•</span><span>${escaped.slice(2)}</span></div>`;
    }
    return `<div>${escaped}</div>`;
  });
  return `<div class="space-y-1.5">${formattedLines.join("")}</div>`;
}

function sendQuickAiQuestion(questionText) {
  const input = document.getElementById("ai-chat-input");
  if (!input || !activeCustomerBooking) return;
  input.value = questionText;
  const form = input.closest("form");
  if (form) {
    form.requestSubmit();
  }
}

function appendAiBubble(role, rawText) {
  const container = document.getElementById("ai-chat-messages");
  if (!container) return;

  const isUser = role === "user";
  const bubble = document.createElement("div");
  bubble.className = isUser
    ? "mr-auto max-w-[85%] bg-brand-700 text-white px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-xs sm:text-sm font-bold shadow-xs"
    : "ml-auto max-w-[88%] bg-white text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-xs sm:text-sm leading-relaxed shadow-2xs";

  if (isUser) {
    bubble.textContent = rawText;
  } else {
    bubble.innerHTML = formatAiMarkdownBold(rawText);
  }

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function initAiChatForBooking(booking) {
  aiChatHistory = [];
  const container = document.getElementById("ai-chat-messages");
  if (container) container.innerHTML = "";

  const greeting = `أهلاً بك **${booking.firstName} ${booking.lastName}** في مكتب **ندلان تورز (Nadlantours)**! رحلتك إلى **${booking.destination}** برمز **${booking.pnr}** جاهزة. كيف يمكنني مساعدتك اليوم؟`;
  appendAiBubble("assistant", greeting);
}

function resetAiChat() {
  if (activeCustomerBooking) {
    initAiChatForBooking(activeCustomerBooking);
  }
}

async function handleAiChatSubmit(event) {
  event.preventDefault();
  const input = document.getElementById("ai-chat-input");
  const question = input?.value.trim() || "";
  if (!question || !activeCustomerBooking) return;

  input.value = "";
  appendAiBubble("user", question);

  const container = document.getElementById("ai-chat-messages");
  const loadingBubble = document.createElement("div");
  loadingBubble.className = "ml-auto bg-white border border-slate-200 px-4 py-3 rounded-2xl text-brand-700 inline-flex items-center gap-1";
  loadingBubble.innerHTML = `<span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>`;
  container.appendChild(loadingBubble);
  container.scrollTop = container.scrollHeight;

  const todayStr = getTodayFormatted();
  const codes = getCheckinFlightCodes(activeCustomerBooking);
  const stationsSummary = (activeCustomerBooking.stations || [])
    .map((s, idx) => {
      if (s.type === "flight") {
        return `محطة ${idx + 1} (طيران): من ${s.fromAirport} إلى ${s.toAirport}، رقم الرحلة ${s.flightNumber || "—"}، PNR ${s.airlinePnr || activeCustomerBooking.pnr}، الموعد ${s.departureText || "—"}، الحقائب ${s.baggage || "—"}`;
      }
      if (s.type === "hotel") {
        return `محطة ${idx + 1} (فندق): ${s.name}، الدخول ${s.checkIn || "—"}، الخروج ${s.checkOut || "—"}`;
      }
      if (s.type === "transfer") {
        return `محطة ${idx + 1} (توصيل): من ${s.fromLocation} إلى ${s.toLocation} (${s.pickupTime || ""})`;
      }
      return `محطة ${idx + 1} (جولة): ${s.title} (${s.dateText || ""})`;
    })
    .join(" | ");

  const systemPrompt = `أنت مساعد ذكي رسمي لمكتب السفر **ندلان تورز (Nadlantours)**.
تاريخ اليوم الفعلي هو: **${todayStr}**.
بيانات حجز الزبون الحالي:
- اسم الزبون: **${activeCustomerBooking.firstName} ${activeCustomerBooking.lastName}**
- رمز الدخول / PNR: **${activeCustomerBooking.pnr}**
- الوجهة: **${activeCustomerBooking.destination}**
- PNR الذهاب: **${codes.outboundPnr}**${codes.returnPnr ? `، PNR العودة: **${codes.returnPnr}**` : ""}
- المسافرون: ${(activeCustomerBooking.passengers || []).join("، ")}
- ملاحظات الحجز: ${activeCustomerBooking.notes || "لا توجد"}
- المحطات: ${stationsSummary}

قواعد الإجابة:
1. أجب باللغة العربية بأسلوب ودود ومختصر واحترافي ومنظم في نقاط واضحة عند وجود أكثر من معلومة.
2. ابدأ الإجابة بجملة مباشرة وواضحة، ثم رتّب التفاصيل في نقاط قصيرة يسهل قراءتها على الجوال.
3. استخدم **الخط العريض (**...**)** للكلمات المهمة مثل اسم الزبون، اسم المكتب (**ندلان تورز**)، رمز الـ **PNR**، الوجهة، التواريخ والمواعيد المهمة.
4. إذا سأل الزبون "متى رحلتي" أو "وينتا رحلتي"، قارن تاريخ اليوم (${todayStr}) مع موعد إقلاع الرحلة واحسب الأيام/الساعات بدقة.`;
  const contentsPayload = [
    ...aiChatHistory.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }]
    })),
    {
      role: "user",
      parts: [{ text: question }]
    }
  ];

  try {
    const result = await callGeminiApi({
      contents: contentsPayload,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    });
    loadingBubble.remove();
    const reply = extractGeminiText(result) || "عذراً، لم أتمكن من صياغة رد الآن. حاول مرة أخرى.";
    aiChatHistory.push({ role: "user", text: question });
    aiChatHistory.push({ role: "model", text: reply });
    appendAiBubble("assistant", reply);
  } catch (_) {
    loadingBubble.remove();
    appendAiBubble("assistant", "تعذر الاتصال بالمساعد الذكي حالياً، يرجى المحاولة بعد قليل.");
  }
}

// =======================================================================
// تهيئة التطبيق عند التحميل (الصفحة الرئيسية: دخول الزبون بـ PNR واسم العائلة)
// =======================================================================
window.addEventListener("DOMContentLoaded", async () => {
  renderStationsEditor();
  await loadBookings();
  renderBookingsList();
  renderQuickDemoBookings();
  switchPortal("customer");
});
