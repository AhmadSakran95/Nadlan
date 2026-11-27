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
          ${ntAdminVoucherUi(idx, st.type)}
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
// استخراج تلقائي من ملف PDF أو صورة (رفع ملف أو لصق صورة مباشرة Ctrl+V)
// =======================================================================
let pasteExtractTargetType = null;
let pasteModalSelectedFile = null;

function setPasteExtractTarget(targetType) {
  pasteExtractTargetType = targetType || null;
}

function openPasteExtractModal(targetType = null) {
  if (targetType) {
    pasteExtractTargetType = targetType;
  }
  pasteModalSelectedFile = null;

  const modal = document.getElementById("paste-extract-modal");
  const selectEl = document.getElementById("paste-extract-type-select");
  const previewWrap = document.getElementById("paste-extract-preview-wrap");
  const previewImg = document.getElementById("paste-extract-preview-img");
  const confirmBtn = document.getElementById("paste-extract-confirm-btn");
  const hintEl = document.getElementById("paste-extract-hint");

  if (selectEl && pasteExtractTargetType) {
    selectEl.value = pasteExtractTargetType;
  }
  if (previewWrap) previewWrap.classList.add("hidden");
  if (previewImg) previewImg.src = "";
  if (confirmBtn) confirmBtn.disabled = true;
  if (hintEl) {
    hintEl.textContent = "اضغط Ctrl+V (أو Cmd+V على Mac) في أي مكان داخل هذه النافذة للصق الصورة مباشرة من الحافظة.";
  }

  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closePasteExtractModal() {
  pasteModalSelectedFile = null;
  const modal = document.getElementById("paste-extract-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function triggerExtract(targetType) {
  extractTargetType = targetType;
  pasteExtractTargetType = targetType;
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

function extractImageFileFromClipboardEvent(event) {
  const clipboardData = event?.clipboardData || window.clipboardData;
  if (!clipboardData) return null;

  const items = Array.from(clipboardData.items || []);
  for (const item of items) {
    if (item.kind === "file" && String(item.type || "").toLowerCase().startsWith("image/")) {
      const file = item.getAsFile();
      if (file) {
        const ext = (file.type.split("/")[1] || "png").replace("+xml", "").split(";")[0];
        return new File([file], `pasted-${Date.now()}.${ext}`, {
          type: file.type || "image/png"
        });
      }
    }
  }

  const files = Array.from(clipboardData.files || []);
  const imgFile = files.find((f) => String(f.type || "").toLowerCase().startsWith("image/"));
  if (imgFile) {
    const ext = (imgFile.type.split("/")[1] || "png").replace("+xml", "").split(";")[0];
    return new File([imgFile], imgFile.name || `pasted-${Date.now()}.${ext}`, {
      type: imgFile.type || "image/png"
    });
  }

  return null;
}

async function processExtractedFile(file, targetType) {
  if (!file) return;
  extractTargetType = targetType || extractTargetType || "flight";

  // حفظ ملف/صورة الاستخراج كفاوشر في الذاكرة ليُرسل مع الحجز إلى قاعدة البيانات
  try {
    const voucherDataUrl = await ntFileToDataUrl(file);
    const vRecord = {
      name: file.name,
      stationType: extractTargetType,
      mimeType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png"),
      dataUrl: voucherDataUrl
    };
    ntSessionVouchers[extractTargetType] = vRecord;
    const matchedIdx = currentStations.findIndex((s) => s.type === extractTargetType);
    if (matchedIdx !== -1) {
      ntSessionVouchers["idx_" + matchedIdx] = vRecord;
    }
  } catch (_) {}

  syncStationsFromDom();
  const statusBox = document.getElementById("extract-status");
  const statusText = document.getElementById("extract-status-text");
  if (statusBox) statusBox.classList.remove("hidden");
  if (statusText) statusText.textContent = `جاري تحليل "${file.name}" واستخراج البيانات...`;

  try {
    const base64Data = await fileToBase64Data(file);
    const mimeType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png");

    let prompt = "";
    if (extractTargetType === "flight") {
      prompt = `استخرج بيانات تذكرة الطيران بدقة وأرجع JSON فقط بدون أي نص إضافي.
إذا كانت رحلة الذهاب أو العودة تحتوي على كونيكشين (أكثر من طائرة/مقطع)، ضع كل طائرة كعنصر مستقل بالترتيب في outboundSegments و returnSegments:
{
  "passengers": ["اسم المسافر 1", "اسم المسافر 2"],
  "finalDestinationCity": "المدينة النهائية للوجهة إن وجدت",
  "outboundSegments": [
    {
      "fromAirport": "رمز مطار الإقلاع مثل TLV",
      "toAirport": "رمز مطار الوصول أو التوقف مثل IST",
      "flightNumber": "رقم الطائرة مثل TK 789",
      "airlinePnr": "رمز PNR إن وجد",
      "baggage": "الحقائب إن وجدت",
      "departureText": "تاريخ ووقت الإقلاع",
      "connectionAfter": "إذا كان هناك كونيكشين بعد هذه الطائرة اكتب: كونيكشين عبر IST (مدة التوقف ...)"
    }
  ],
  "isRoundTrip": true,
  "returnSegments": [
    {
      "fromAirport": "رمز مطار الإقلاع في العودة",
      "toAirport": "رمز مطار الوصول أو التوقف في العودة",
      "flightNumber": "رقم الطائرة في العودة",
      "airlinePnr": "رمز PNR إن وجد",
      "baggage": "الحقائب إن وجدت",
      "departureText": "تاريخ ووقت الإقلاع في العودة",
      "connectionAfter": "إذا كان هناك كونيكشين بعد هذه الطائرة اكتب: كونيكشين عبر ... (مدة التوقف ...)"
    }
  ],
  "fromAirport": "رمز مطار بداية الذهاب",
  "toAirport": "رمز مطار نهاية الذهاب",
  "flightNumber": "رقم أول رحلة ذهاب",
  "airlinePnr": "رمز PNR",
  "baggage": "الحقائب",
  "departureText": "موعد أول إقلاع",
  "returnFromAirport": "رمز مطار بداية العودة",
  "returnToAirport": "رمز مطار نهاية العودة",
  "returnFlightNumber": "رقم أول رحلة عودة",
  "returnAirlinePnr": "رمز PNR العودة",
  "returnDepartureText": "موعد أول إقلاع في العودة",
  "returnBaggage": "حقائب العودة"
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
      showToast("لم يتمكن النظام من قراءة البيانات من الصورة، يمكنك إدخالها يدوياً");
      return;
    }

    if (extractTargetType === "flight") {
      applyExtractedFlightData(data);
    } else if (extractTargetType === "hotel") {
      applyExtractedHotelData(data);
    } else {
      applyExtractedTransferData(data);
    }

    try {
      const idxAfter = currentStations.findIndex((s) => s.type === extractTargetType);
      if (idxAfter !== -1 && ntSessionVouchers[extractTargetType]) {
        ntSessionVouchers["idx_" + idxAfter] = ntSessionVouchers[extractTargetType];
      }
    } catch (_) {}

    renderStationsEditor();
    showToast("تم استخراج البيانات وتعبئتها بنجاح");
  } catch (err) {
    showToast("حدث خطأ أثناء استخراج البيانات من الصورة");
  } finally {
    if (statusBox) statusBox.classList.add("hidden");
  }
}

async function handleExtractFileSelected(event) {
  const file = event.target?.files?.[0];
  if (!file) return;
  try {
    await processExtractedFile(file, extractTargetType);
  } finally {
    event.target.value = "";
  }
}

async function confirmPastedImageExtraction() {
  if (!pasteModalSelectedFile) {
    showToast("يرجى لصق صورة أولاً باستخدام Ctrl+V");
    return;
  }
  const selectEl = document.getElementById("paste-extract-type-select");
  const chosenType = selectEl?.value || pasteExtractTargetType || "flight";
  const fileToProcess = pasteModalSelectedFile;
  closePasteExtractModal();
  await processExtractedFile(fileToProcess, chosenType);
}

document.addEventListener("paste", async (event) => {
  const adminSec = document.getElementById("admin-section");
  const isAdminVisible = adminSec && !adminSec.classList.contains("hidden");
  if (!isAdminVisible) return;

  const activeTag = document.activeElement?.tagName?.toLowerCase() || "";
  const isTypingInTextInput =
    (activeTag === "input" && !["file", "checkbox", "radio", "button"].includes((document.activeElement.type || "").toLowerCase())) ||
    activeTag === "textarea" ||
    activeTag === "select" ||
    document.activeElement?.isContentEditable;

  const pastedImage = extractImageFileFromClipboardEvent(event);
  if (!pastedImage) return;

  const pasteModal = document.getElementById("paste-extract-modal");
  const isPasteModalOpen = pasteModal && !pasteModal.classList.contains("hidden");

  if (!isPasteModalOpen && isTypingInTextInput && !pasteExtractTargetType) {
    return;
  }

  event.preventDefault();

  if (isPasteModalOpen) {
    pasteModalSelectedFile = pastedImage;
    const previewWrap = document.getElementById("paste-extract-preview-wrap");
    const previewImg = document.getElementById("paste-extract-preview-img");
    const confirmBtn = document.getElementById("paste-extract-confirm-btn");
    const hintEl = document.getElementById("paste-extract-hint");
    try {
      const url = await ntFileToDataUrl(pastedImage);
      if (previewImg) previewImg.src = url;
      if (previewWrap) previewWrap.classList.remove("hidden");
      if (confirmBtn) confirmBtn.disabled = false;
      if (hintEl) hintEl.textContent = `تم التقاط الصورة (${pastedImage.name}). اختر نوع الاستخراج واضغط "استخراج الآن".`;
    } catch (_) {
      showToast("تعذر معاينة الصورة الملصوقة");
    }
    return;
  }

  if (pasteExtractTargetType) {
    await processExtractedFile(pastedImage, pasteExtractTargetType);
  } else {
    openPasteExtractModal("flight");
    pasteModalSelectedFile = pastedImage;
    const previewWrap = document.getElementById("paste-extract-preview-wrap");
    const previewImg = document.getElementById("paste-extract-preview-img");
    const confirmBtn = document.getElementById("paste-extract-confirm-btn");
    const hintEl = document.getElementById("paste-extract-hint");
    try {
      const url = await ntFileToDataUrl(pastedImage);
      if (previewImg) previewImg.src = url;
      if (previewWrap) previewWrap.classList.remove("hidden");
      if (confirmBtn) confirmBtn.disabled = false;
      if (hintEl) hintEl.textContent = `تم التقاط الصورة (${pastedImage.name}). اختر نوع الاستخراج واضغط "استخراج الآن".`;
    } catch (_) {}
  }
});

function buildFlightSegmentStation(seg, fallbackPnr, fallbackBaggage, legLabel, connNote) {
  const st = createStationObject("flight");
  st.fromAirport = String(seg.fromAirport || "").trim().toUpperCase();
  st.toAirport = String(seg.toAirport || "").trim().toUpperCase();
  st.flightNumber = String(seg.flightNumber || "").trim().toUpperCase();
  st.airlinePnr = String(seg.airlinePnr || fallbackPnr || "").trim().toUpperCase();
  st.baggage = String(seg.baggage || fallbackBaggage || "").trim();
  st.departureText = String(seg.departureText || "").trim();

  const noteParts = [];
  if (legLabel) noteParts.push(legLabel);
  if (connNote) noteParts.push(connNote);
  if (seg.notes) noteParts.push(String(seg.notes).trim());
  st.notes = noteParts.join(" • ");
  return st;
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

  let rawOutbound = Array.isArray(data.outboundSegments)
    ? data.outboundSegments.filter((s) => s && (s.fromAirport || s.toAirport || s.flightNumber || s.departureText))
    : [];

  if (!rawOutbound.length && (data.fromAirport || data.toAirport || data.flightNumber || data.departureText)) {
    rawOutbound = [
      {
        fromAirport: data.fromAirport,
        toAirport: data.toAirport,
        flightNumber: data.flightNumber,
        airlinePnr: data.airlinePnr,
        baggage: data.baggage,
        departureText: data.departureText
      }
    ];
  }

  const hasReturn = Boolean(
    data.isRoundTrip ||
      (Array.isArray(data.returnSegments) && data.returnSegments.length > 0) ||
      data.returnFlightNumber ||
      data.returnDepartureText ||
      data.returnFromAirport ||
      data.returnToAirport
  );

  let rawReturn = Array.isArray(data.returnSegments)
    ? data.returnSegments.filter((s) => s && (s.fromAirport || s.toAirport || s.flightNumber || s.departureText))
    : [];

  if (!rawReturn.length && hasReturn) {
    const lastOutTo = rawOutbound.length ? rawOutbound[rawOutbound.length - 1].toAirport : data.toAirport;
    const firstOutFrom = rawOutbound.length ? rawOutbound[0].fromAirport : data.fromAirport;
    rawReturn = [
      {
        fromAirport: data.returnFromAirport || lastOutTo,
        toAirport: data.returnToAirport || firstOutFrom,
        flightNumber: data.returnFlightNumber,
        airlinePnr: data.returnAirlinePnr || data.airlinePnr,
        baggage: data.returnBaggage || data.baggage,
        departureText: data.returnDepartureText
      }
    ];
  }

  const finalOutTo = rawOutbound.length ? String(rawOutbound[rawOutbound.length - 1].toAirport || "").trim().toUpperCase() : String(data.toAirport || "").trim().toUpperCase();
  const mappedCity = mapAirportCodeToCity(finalOutTo);
  const destInput = document.getElementById("main-destination");
  if (destInput) {
    if (data.finalDestinationCity && !destInput.value.trim()) {
      destInput.value = String(data.finalDestinationCity).trim();
    } else if (mappedCity) {
      destInput.value = mappedCity;
    }
  }

  const generatedFlightStations = [];

  rawOutbound.forEach((seg, idx) => {
    const isConnected = rawOutbound.length > 1;
    const legLabel = isConnected
      ? `ذهاب (طائرة ${idx + 1} من ${rawOutbound.length})`
      : hasReturn
      ? "رحلة الذهاب"
      : "رحلة طيران";

    let connNote = "";
    if (idx < rawOutbound.length - 1) {
      const nextSeg = rawOutbound[idx + 1] || {};
      const hubCode = String(seg.toAirport || nextSeg.fromAirport || "").trim().toUpperCase();
      connNote = seg.connectionAfter
        ? String(seg.connectionAfter).trim()
        : `كونيكشين عبر ${hubCode || "مطار التوقف"}`;
    } else if (isConnected) {
      connNote = "وصول الوجهة بعد الكونيكشين";
    }

    generatedFlightStations.push(
      buildFlightSegmentStation(seg, data.airlinePnr, data.baggage, legLabel, connNote)
    );
  });

  rawReturn.forEach((seg, idx) => {
    const isConnected = rawReturn.length > 1;
    const legLabel = isConnected
      ? `عودة (طائرة ${idx + 1} من ${rawReturn.length})`
      : "رحلة العودة";

    let connNote = "";
    if (idx < rawReturn.length - 1) {
      const nextSeg = rawReturn[idx + 1] || {};
      const hubCode = String(seg.toAirport || nextSeg.fromAirport || "").trim().toUpperCase();
      connNote = seg.connectionAfter
        ? String(seg.connectionAfter).trim()
        : `كونيكشين عبر ${hubCode || "مطار التوقف"}`;
    } else if (isConnected) {
      connNote = "وصول العودة بعد الكونيكشين";
    }

    generatedFlightStations.push(
      buildFlightSegmentStation(seg, data.returnAirlinePnr || data.airlinePnr, data.returnBaggage || data.baggage, legLabel, connNote)
    );
  });

  if (generatedFlightStations.length > 0) {
    const firstFlightIdx = currentStations.findIndex((s) => s.type === "flight");
    const nonFlightStations = currentStations.filter((s) => s.type !== "flight");
    if (firstFlightIdx === -1) {
      currentStations = [...generatedFlightStations, ...nonFlightStations];
    } else {
      const before = currentStations.slice(0, firstFlightIdx).filter((s) => s.type !== "flight");
      const after = currentStations.slice(firstFlightIdx).filter((s) => s.type !== "flight");
      currentStations = [...before, ...generatedFlightStations, ...after];
    }
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
    const existingBooking = bookings.find((b) => b.id === bookingObj.id || (bookingObj.pnr && b.pnr === bookingObj.pnr));
    const mergedVouchers = {
      ...(existingBooking && existingBooking.vouchers && typeof existingBooking.vouchers === "object" ? existingBooking.vouchers : {}),
      ...(typeof ntSessionVouchers === "object" ? ntSessionVouchers : {})
    };
    if (Object.keys(mergedVouchers).length > 0) {
      bookingObj.vouchers = mergedVouchers;
    }

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
  ntSessionVouchers = (b.vouchers && typeof b.vouchers === "object") ? { ...b.vouchers } : {};

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
  ntSessionVouchers = {};
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

function parseFlexibleDateTime(rawVal) {
  if (!rawVal) return null;
  const str = String(rawVal).trim();
  if (!str) return null;

  const monthsMap = {
    jan: 1, january: 1, جانفي: 1, يناير: 1,
    feb: 2, february: 2, فيفري: 2, فبراير: 2,
    mar: 3, march: 3, مارس: 3, آذار: 3,
    apr: 4, april: 4, أفريل: 4, أبريل: 4, نيسان: 4,
    may: 5, ماي: 5, مايو: 5, أيار: 5,
    jun: 6, june: 6, جوان: 6, يونيو: 6, حزيران: 6,
    jul: 7, july: 7, جويلية: 7, يوليو: 7, تموز: 7,
    aug: 8, august: 8, أوت: 8, أغسطس: 8, آب: 8,
    sep: 9, sept: 9, september: 9, سبتمبر: 9, أيلول: 9,
    oct: 10, october: 10, أكتوبر: 10, تشرين الأول: 10,
    nov: 11, november: 11, نوفمبر: 11, تشرين الثاني: 11,
    dec: 12, december: 12, ديسمبر: 12, كانون الأول: 12
  };

  let year = null;
  let month = null;
  let day = null;
  let hour = null;
  let minute = null;
  let second = 0;

  const time12Match = str.match(
    /(?:^|[\sT,@\-–|])(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|ص|م|صباحا|صباحاً|مساء|مساءً)\b/i
  );
  const time24Match = str.match(
    /(?:^|[\sT,@\-–|])(\d{1,2}):(\d{2})(?::(\d{2}))?(?!\s*(?:am|pm|ص|م|صباحا|صباحاً|مساء|مساءً))\b/i
  );

  if (time12Match) {
    let h = parseInt(time12Match[1], 10);
    minute = parseInt(time12Match[2], 10);
    second = time12Match[3] ? parseInt(time12Match[3], 10) : 0;
    const mer = time12Match[4].toLowerCase();
    const isPm = mer === "pm" || mer === "م" || mer === "مساء" || mer === "مساءً";
    const isAm = mer === "am" || mer === "ص" || mer === "صباحا" || mer === "صباحاً";
    if (isPm && h < 12) h += 12;
    if (isAm && h === 12) h = 0;
    hour = h;
  } else if (time24Match) {
    hour = parseInt(time24Match[1], 10);
    minute = parseInt(time24Match[2], 10);
    second = time24Match[3] ? parseInt(time24Match[3], 10) : 0;
  }

  const cleanedForDate = str
    .replace(/\b(?:sun|mon|tue|wed|thu|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b,?/gi, " ")
    .replace(/(?:^|[\sT,@\-–|])\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|ص|م|صباحا|صباحاً|مساء|مساءً)?/gi, " ")
    .trim();

  const ymdMatch = cleanedForDate.match(/\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/);
  const dmyMatch = cleanedForDate.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  const monthDayYearMatch = cleanedForDate.match(
    /\b([A-Za-z\u0600-\u06FF]+)[,\s]+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+(\d{4}))?\b/i
  );
  const dayMonthYearMatch = cleanedForDate.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?[\s,/-]+([A-Za-z\u0600-\u06FF]+)(?:[,\s/-]+(\d{4}))?\b/i
  );

  if (ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10);
    day = parseInt(ymdMatch[3], 10);
  } else if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      month = p1;
      day = p2;
    } else {
      day = p1;
      month = p2;
    }
  } else if (monthDayYearMatch && monthsMap[monthDayYearMatch[1].toLowerCase()]) {
    month = monthsMap[monthDayYearMatch[1].toLowerCase()];
    day = parseInt(monthDayYearMatch[2], 10);
    year = monthDayYearMatch[3] ? parseInt(monthDayYearMatch[3], 10) : null;
  } else if (dayMonthYearMatch && monthsMap[dayMonthYearMatch[2].toLowerCase()]) {
    day = parseInt(dayMonthYearMatch[1], 10);
    month = monthsMap[dayMonthYearMatch[2].toLowerCase()];
    year = dayMonthYearMatch[3] ? parseInt(dayMonthYearMatch[3], 10) : null;
  }

  if (day && month && !year) {
    const now = new Date();
    year = now.getFullYear();
    const hTest = hour ?? 9;
    const mTest = minute ?? 0;
    const candidate = new Date(year, month - 1, day, hTest, mTest, second);
    if (candidate.getTime() < now.getTime() - 7 * 24 * 3600 * 1000) {
      year += 1;
    }
  }

  if (year && month && day) {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const hasTime = hour !== null && minute !== null && !Number.isNaN(hour) && !Number.isNaN(minute);
    const dt = new Date(
      year,
      month - 1,
      day,
      hasTime ? hour : 9,
      hasTime ? minute : 0,
      hasTime ? second : 0
    );
    if (Number.isNaN(dt.getTime())) return null;
    return {
      date: dt,
      timestamp: dt.getTime(),
      year,
      month,
      day,
      hour: hasTime ? hour : null,
      minute: hasTime ? minute : null,
      hasTime
    };
  }

  const parsedNative = Date.parse(str);
  if (!Number.isNaN(parsedNative)) {
    const dt = new Date(parsedNative);
    return {
      date: dt,
      timestamp: dt.getTime(),
      year: dt.getFullYear(),
      month: dt.getMonth() + 1,
      day: dt.getDate(),
      hour: dt.getHours(),
      minute: dt.getMinutes(),
      hasTime: true
    };
  }

  return null;
}

function formatArabicDepartureDisplay(rawVal) {
  if (!rawVal) return "غير محدد";
  const parsed = parseFlexibleDateTime(rawVal);
  if (!parsed) return String(rawVal).trim();

  const dd = String(parsed.day).padStart(2, "0");
  const mm = String(parsed.month).padStart(2, "0");
  const datePart = `${dd}-${mm}-${parsed.year}`;

  if (!parsed.hasTime) {
    return datePart;
  }

  const period = parsed.hour >= 12 ? "مساءً" : "صباحاً";
  const hh = String(parsed.hour).padStart(2, "0");
  const minStr = String(parsed.minute).padStart(2, "0");

  return `${datePart} | ${hh}:${minStr} ${period}`;
}

function parseDepartureDateToTimestamp(departureText) {
  const parsed = parseFlexibleDateTime(departureText);
  return parsed ? parsed.timestamp : null;
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
    banner.className = "bg-gradient-to-l from-slate-950 via-brand-900 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-amber-400/40 flex flex-wrap items-center justify-between gap-4";
    if (badgeEl) {
      badgeEl.className = "px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black";
      badgeEl.textContent = "⏳ العد التنازلي للرحلة";
    }
    if (titleEl) {
      titleEl.className = "text-base sm:text-lg font-black text-white";
      titleEl.textContent = `متبقي على رحلتك ${daysLeft} ${dayWord}!`;
    }
    if (descEl) {
      descEl.className = "text-xs sm:text-sm text-slate-100 font-bold mt-1";
      descEl.textContent = `باقي على موعد إقلاع رحلتك ${daysLeft} ${dayWord} (${codes.outboundStop?.departureText ? formatArabicDepartureDisplay(codes.outboundStop.departureText) : "الموعد المحدد"}) — سيُفتح الشيك إن قبل الرحلة بـ 24 ساعة أو أقل.`;
    }
    if (codesEl) {
      codesEl.innerHTML = `
        <span class="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black shadow-2xs">⏳ باقي ${daysLeft} ${dayWord}</span>
        <span class="px-3 py-1.5 rounded-xl bg-amber-300/20 text-amber-200 border border-amber-300/50 text-xs font-black">الوجهة: ${escapeHtml(booking.destination)}</span>
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

  function getFlightLegDirection(st, flightIdxInAllFlights, totalFlightsCount) {
    const notes = String(st.notes || "").toLowerCase();
    if (notes.includes("عودة") || notes.includes("return")) return "return";
    if (notes.includes("ذهاب") || notes.includes("outbound")) return "outbound";
    if (totalFlightsCount === 4) {
      return flightIdxInAllFlights < 2 ? "outbound" : "return";
    }
    return "outbound";
  }

  function isConnectionBetweenFlights(currSt, nextSt, currFlightOrder, nextFlightOrder, totalFlightsCount) {
    if (!currSt || !nextSt || currSt.type !== "flight" || nextSt.type !== "flight") return false;
    const dir1 = getFlightLegDirection(currSt, currFlightOrder, totalFlightsCount);
    const dir2 = getFlightLegDirection(nextSt, nextFlightOrder, totalFlightsCount);
    if (dir1 !== dir2) return false;
    const n1 = String(currSt.notes || "").toLowerCase();
    const n2 = String(nextSt.notes || "").toLowerCase();
    if (n1.includes("كونيكشين") || n2.includes("كونيكشين")) return true;
    if (dir1 === "outbound" || dir1 === "return") return true;
    return false;
  }

  function renderSingleStationCard(st, idx) {
    if (st.type === "flight") {
      const checkinInfo = resolveAirlineCheckinInfo(st.flightNumber, st.notes);
      const fromCode = st.fromAirport || "—";
      const toCode = st.toAirport || "—";
      const fromCity = mapAirportCodeToCity(fromCode);
      const toCity = mapAirportCodeToCity(toCode);

      return `
        <div class="bg-white rounded-2xl border border-sky-200/90 p-4 sm:p-5 space-y-3.5 shadow-2xs">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-xl bg-sky-900 text-white text-xs font-black flex items-center justify-center">${idx + 1}</span>
              <span class="text-xs font-black text-sky-900 bg-sky-100 px-3 py-1 rounded-full">✈️ رحلة طيران</span>
            </div>
            <div class="flex items-center gap-2 text-sm font-black text-slate-900 bg-slate-50 px-3.5 py-1 rounded-2xl border border-slate-200">
              <span class="inline-flex items-center gap-2">
                <span>${escapeHtml(fromCode)}${fromCity ? ` (${escapeHtml(fromCity)})` : ""}</span>
                <svg viewBox="0 0 28 14" class="w-6 h-3.5 text-sky-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="25" y1="7" x2="3" y2="7" />
                  <polyline points="8,2 3,7 8,12" />
                </svg>
                <span>${escapeHtml(toCode)}${toCity ? ` (${escapeHtml(toCity)})` : ""}</span>
              </span>
            </div>
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
              <span class="text-xs sm:text-sm font-black text-slate-900" dir="ltr">${escapeHtml(formatArabicDepartureDisplay(st.departureText))}</span>
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
          ${ntCustomerVoucherUi(idx, "flight", booking)}
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
                  ? `<span class="px-3.5 py-1 rounded-xl bg-indigo-900 text-white text-xs font-black shadow-2xs">🌙 عدد الليالي: ${escapeHtml(st.nights)}</span>`
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
          ${ntCustomerVoucherUi(idx, "hotel", booking)}
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
          ${ntCustomerVoucherUi(idx, "transfer", booking)}
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
  }

  const allFlightIndices = stations
    .map((s, idx) => (s.type === "flight" ? idx : -1))
    .filter((idx) => idx !== -1);
  const totalFlightsCount = allFlightIndices.length;

  const renderedBlocks = [];
  let i = 0;
  while (i < stations.length) {
    const st = stations[i];
    if (st.type === "flight") {
      const currOrder = allFlightIndices.indexOf(i);
      const group = [{ st, idx: i, flightOrder: currOrder }];
      while (
        i + 1 < stations.length &&
        isConnectionBetweenFlights(
          stations[i],
          stations[i + 1],
          allFlightIndices.indexOf(i),
          allFlightIndices.indexOf(i + 1),
          totalFlightsCount
        )
      ) {
        i++;
        group.push({ st: stations[i], idx: i, flightOrder: allFlightIndices.indexOf(i) });
      }

      if (group.length > 1) {
        const groupDir = getFlightLegDirection(group[0].st, group[0].flightOrder, totalFlightsCount);
        const isReturnLeg = groupDir === "return";
        const legTitle = isReturnLeg
          ? "رحلة العودة كونيكشين"
          : "رحلة الذهاب كونيكشين";

        const innerHtml = group
          .map((item, gIdx) => {
            const cardHtml = renderSingleStationCard(item.st, item.idx);
            const hasDividerAfter = gIdx < group.length - 1;
            const hubCode = item.st.toAirport || group[gIdx + 1]?.st?.fromAirport || "";
            const dividerHtml = hasDividerAfter
              ? `<div class="my-2.5 flex items-center gap-2 text-[11px] font-black text-sky-900">
                  <div class="h-px flex-1 bg-sky-200"></div>
                  <span class="px-3 py-1 rounded-full bg-white border border-sky-200 shadow-2xs">🔄 كونيكشين${hubCode ? ` عبر ${escapeHtml(hubCode)}` : ""}</span>
                  <div class="h-px flex-1 bg-sky-200"></div>
                </div>`
              : "";
            return cardHtml + dividerHtml;
          })
          .join("");

        renderedBlocks.push(`
          <div class="rounded-3xl bg-sky-50/50 border border-sky-200 p-3 sm:p-4 space-y-2 shadow-2xs">
            <div class="flex items-center justify-between px-1 pb-1">
              <span class="text-xs font-black text-sky-950">✈️ ${escapeHtml(legTitle)}</span>
              <span class="text-[11px] font-extrabold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full">مقاطع متصلة</span>
            </div>
            ${innerHtml}
          </div>
        `);
      } else {
        renderedBlocks.push(renderSingleStationCard(st, i));
      }
      i++;
    } else {
      renderedBlocks.push(renderSingleStationCard(st, i));
      i++;
    }
  }

  stagesList.innerHTML = renderedBlocks.join("");
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

  const cacheKey = DEST_CACHE_PREFIX + cleanCity.toLowerCase();
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsedCache = JSON.parse(cached);
      if (parsedCache && parsedCache.data) {
        renderDestinationSections(cleanCity, parsedCache.data);
      }
    }
  } catch (_) {}

  const todayStr = getTodayFormatted();
  const prompt = `ابحث عن معلومات دقيقة ومحدثة لمدينة "${cleanCity}" بدءاً من تاريخ اليوم (${todayStr}) وأرجع JSON فقط بالشكل التالي:
{
  "weather5Days": [
    { "day": "اليوم / التاريخ", "temp": "درجة الحرارة مثل 18°C", "condition": "حالة الطقس بالعربية", "icon": "☀️ أو ⛅ أو 🌧️" }
  ],
  "attractions4": [
    { "name": "اسم المنطقة السياحية", "desc": "وصف مختصر مفيد بالعربية" }
  ],
  "halalRestaurants5": [
    { "name": "اسم المطعم الحلال", "rating": "التقييم مثل 4.7 ★", "cuisine": "نوع الأكل أو المنطقة" }
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
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };
    const result = await callGeminiApi(payload);
    const rawText = extractGeminiText(result);
    const parsed = parseJsonLoose(rawText);

    if (parsed) {
      renderDestinationSections(cleanCity, parsed);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: parsed }));
      } catch (_) {}
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

// =======================================================================
// نظام فاوشرات الحجز (طيران / فندق / توصيل) — عبر قاعدة البيانات فقط (بدون localStorage)
// =======================================================================
let ntSessionVouchers = {};

function ntFindVoucherRecord(booking, stationType, index) {
  const vObj = booking && booking.vouchers && typeof booking.vouchers === "object"
    ? booking.vouchers
    : (!booking ? ntSessionVouchers : null);

  if (!vObj) return null;
  if (vObj["idx_" + index] && vObj["idx_" + index].dataUrl) return vObj["idx_" + index];
  if (vObj[stationType] && vObj[stationType].dataUrl) return vObj[stationType];
  return null;
}

function ntIsPdfVoucher(rec) {
  if (!rec) return false;
  const mime = String(rec.mimeType || rec.type || "").toLowerCase();
  const name = String(rec.name || "").toLowerCase();
  return mime.includes("pdf") || name.endsWith(".pdf");
}

function ntFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.readAsDataURL(file);
  });
}

async function ntUploadStationVoucher(event, index, stationType) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  try {
    const dataUrl = await ntFileToDataUrl(file);
    const record = {
      name: file.name,
      stationType,
      mimeType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
      dataUrl
    };

    ntSessionVouchers[stationType] = record;
    ntSessionVouchers["idx_" + index] = record;

    const editId = document.getElementById("editing-booking-id")?.value?.trim();
    const pnrVal = document.getElementById("booking-pnr")?.value?.trim()?.toUpperCase();
    const targetBooking = bookings.find(
      (b) => (editId && b.id === editId) || (pnrVal && String(b.pnr || "").toUpperCase() === pnrVal)
    );
    if (targetBooking) {
      targetBooking.vouchers = {
        ...(targetBooking.vouchers || {}),
        [stationType]: record,
        ["idx_" + index]: record
      };
      await apiRequest("/api/bookings", {
        method: "POST",
        body: JSON.stringify(targetBooking)
      });
    }

    renderStationsEditor();
    showToast(
      ntIsPdfVoucher(record)
        ? "تم تجهيز الفاوشر (PDF) — اضغط 'حفظ الحجز' لتثبيته في قاعدة البيانات"
        : "تم تجهيز صورة الفاوشر — الصور للعرض فقط ولا يُحمّل للزبون"
    );
  } catch (_) {
    showToast("حدث خطأ أثناء قراءة الفاوشر");
  }
  event.target.value = "";
}

function ntDeleteStationVoucher(index, stationType) {
  delete ntSessionVouchers[stationType];
  delete ntSessionVouchers["idx_" + index];
  renderStationsEditor();
  showToast("تم حذف الفاوشر من الجلسة الحالية");
}

function ntDownloadVoucherPdf(stationType, index) {
  const rec = ntFindVoucherRecord(activeCustomerBooking, stationType, index);
  if (!rec || !rec.dataUrl) {
    showToast("لا يوجد فاوشر مرفق لهذا القسم في قاعدة البيانات");
    return;
  }
  if (!ntIsPdfVoucher(rec)) {
    showToast("التحميل متاح لملفات PDF فقط، والصور للعرض فقط");
    return;
  }

  const fileName = rec.name.toLowerCase().endsWith(".pdf") ? rec.name : `${rec.name}.pdf`;
  const link = document.createElement("a");
  link.href = rec.dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`جاري تحميل الفاوشر: ${fileName}`);
}

function ntAdminVoucherUi(idx, stationType) {
  return "";
}

function ntCustomerVoucherUi(idx, stationType, booking) {
  if (!["flight", "hotel", "transfer"].includes(stationType)) return "";
  const rec = ntFindVoucherRecord(booking, stationType, idx);
  const labelMap = {
    flight: "فاوشر الطيران",
    hotel: "فاوشر الفندق",
    transfer: "فاوشر التوصيل"
  };
  const label = labelMap[stationType];

  if (!rec || !rec.dataUrl) {
    return `
      <div class="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs font-bold text-slate-400">📄 ${escapeHtml(label)}: لم يُرفع ملف بعد</span>
        <span class="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-extrabold">🔒 غير متوفر</span>
      </div>
    `;
  }

  if (ntIsPdfVoucher(rec)) {
    return `
      <div class="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs font-extrabold text-brand-900">📄 ${escapeHtml(label)} (${escapeHtml(rec.name || "PDF")})</span>
        <button
          type="button"
          onclick="ntDownloadVoucherPdf('${stationType}', ${idx})"
          class="px-3.5 py-1.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-black shadow-xs transition cursor-pointer"
        >
          ⬇️ تحميل الفاوشر (PDF)
        </button>
      </div>
    `;
  }

  return `
    <div class="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
      <span class="text-xs font-extrabold text-slate-700">🖼️ ${escapeHtml(label)} (صورة — للعرض فقط)</span>
      <span class="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 text-xs font-black">🚫 التحميل لملفات PDF فقط</span>
    </div>
  `;
}
Your HTML file is ready


index
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>NadlanTours AI — نظام إدارة الحجوزات ومساعد السفر الذكي</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            cairo: ["Cairo", "sans-serif"],
            jakarta: ["Plus Jakarta Sans", "sans-serif"]
          },
          colors: {
            brand: {
              50: "#eff6ff",
              100: "#dbeafe",
              200: "#bfdbfe",
              500: "#2563eb",
              600: "#1d4ed8",
              700: "#1e40af",
              800: "#1e3a8a",
              900: "#0b192c"
            }
          }
        }
      }
    };
  </script>
  <link rel="stylesheet" href="/css/styles.css" />

  <style id="nadlan-active-themes">
    /* 1. ثيم اللوغو الأساسي (زمردي ندلان + ذهبي + فحمي) */
    body,
    body[data-theme="navy-white-gold"] {
      --nt-header-bg: linear-gradient(to left, #062a27, #0b4f4a, #2f3a3d);
      --nt-body-bg: linear-gradient(145deg, #f3f8f7 0%, #e8f2f0 50%, #f7f9f8 100%);
      --nt-primary: #0b4f4a;
      --nt-primary-hover: #093e3a;
      --nt-primary-soft: #d6f0ed;
      --nt-primary-tint: #eefaf8;
      --nt-accent: #f4ad27;
      --nt-accent-hover: #e59a1c;
      --nt-accent-soft: #fef3d6;
      --nt-accent-text: #784504;
      --nt-card-bg: #ffffff;
      --nt-surface-soft: #f8fafc;
      --nt-border: #e2e8f0;
      --nt-text: #2f3a3d;
      --nt-muted: #64748b;
    }

    /* 2. ثيم كحلي مع أبيض وذهبي */
    body[data-theme="navy-white-gold"] {
      --nt-header-bg: linear-gradient(to left, #071630, #0f2954, #173a73);
      --nt-body-bg: linear-gradient(145deg, #ffffff 0%, #f4f7fc 55%, #edf2fa 100%);
      --nt-primary: #0f2954;
      --nt-primary-hover: #091b38;
      --nt-primary-soft: #dce7fa;
      --nt-primary-tint: #f4f8ff;
      --nt-accent: #eab308;
      --nt-accent-hover: #ca8a04;
      --nt-accent-soft: #fef9c3;
      --nt-accent-text: #713f12;
      --nt-card-bg: #ffffff;
      --nt-surface-soft: #f8faff;
      --nt-border: #dbe3f0;
      --nt-text: #0f2954;
      --nt-muted: #4b5e7a;
    }

    /* 3. ثيم زمردي منتجعات فخمة */
    body[data-theme="emerald-luxe"] {
      --nt-header-bg: linear-gradient(to left, #042824, #09453e, #0d5c52);
      --nt-body-bg: linear-gradient(135deg, #f6fdfb 0%, #ecfdf5 50%, #f0f9ff 100%);
      --nt-primary: #0f766e;
      --nt-primary-hover: #115e59;
      --nt-primary-soft: #ccfbf1;
      --nt-primary-tint: #f0fdfa;
      --nt-accent: #eab308;
      --nt-accent-hover: #ca8a04;
      --nt-accent-soft: #fef9c3;
      --nt-accent-text: #713f12;
      --nt-card-bg: #ffffff;
      --nt-surface-soft: #f7fcfa;
      --nt-border: #d1fae5;
      --nt-text: #062825;
      --nt-muted: #4b6b66;
    }

    /* 4. ثيم ليلي فخم داكن */
    body[data-theme="obsidian-vip"] {
      --nt-header-bg: linear-gradient(to left, #05070d, #0d1322, #151e33);
      --nt-body-bg: linear-gradient(135deg, #070b14 0%, #0d1322 55%, #090e1a 100%);
      --nt-primary: #2563eb;
      --nt-primary-hover: #1d4ed8;
      --nt-primary-soft: #1e3a8a;
      --nt-primary-tint: #0f172a;
      --nt-accent: #fbbf24;
      --nt-accent-hover: #f59e0b;
      --nt-accent-soft: #451a03;
      --nt-accent-text: #fde68a;
      --nt-card-bg: #111827;
      --nt-surface-soft: #0b111e;
      --nt-border: #1e293b;
      --nt-text: #f8fafc;
      --nt-muted: #94a3b8;
    }

    body {
      background: var(--nt-body-bg);
      color: var(--nt-text);
      transition: background 0.25s ease, color 0.2s ease;
    }

    body > header {
      background: var(--nt-header-bg);
      border-bottom: 2px solid color-mix(in srgb, var(--nt-accent) 45%, transparent);
      transition: background 0.25s ease;
    }

    .bg-brand-700 { background-color: var(--nt-primary); }
    .hover\:bg-brand-800:hover { background-color: var(--nt-primary-hover); }
    .bg-brand-600 { background-color: var(--nt-primary); }
    .hover\:bg-brand-700:hover { background-color: var(--nt-primary-hover); }
    .text-brand-700, .text-brand-800, .text-brand-900 { color: var(--nt-primary); }
    .bg-brand-100 { background-color: var(--nt-primary-soft); }
    .bg-brand-50 { background-color: var(--nt-primary-tint); }
    .border-brand-200 { border-color: var(--nt-border); }
    .border-brand-400 { border-color: var(--nt-primary); }
    .focus\:border-brand-600:focus { border-color: var(--nt-primary); }

    .from-amber-400.to-amber-300 {
      background-image: linear-gradient(to right, var(--nt-accent), var(--nt-accent-hover));
      color: #071630;
    }
    .bg-amber-400 { background-color: var(--nt-accent); color: #071630; }
    .hover\:bg-amber-500:hover { background-color: var(--nt-accent-hover); }
    .text-amber-400, .text-amber-300 { color: var(--nt-accent); }
    .bg-amber-100 { background-color: var(--nt-accent-soft); }
    .text-amber-900, .text-amber-950 { color: var(--nt-accent-text); }

    body[data-theme="obsidian-vip"] .bg-white {
      background-color: var(--nt-card-bg);
      color: var(--nt-text);
    }
    body[data-theme="obsidian-vip"] .bg-slate-50,
    body[data-theme="obsidian-vip"] .bg-slate-50\/70,
    body[data-theme="obsidian-vip"] .bg-slate-50\/60 {
      background-color: var(--nt-surface-soft);
      color: var(--nt-text);
    }
    body[data-theme="obsidian-vip"] .bg-slate-100 {
      background-color: #1e293b;
      color: #e2e8f0;
    }
    body[data-theme="obsidian-vip"] .border-slate-200,
    body[data-theme="obsidian-vip"] .border-slate-100,
    body[data-theme="obsidian-vip"] .border-slate-300 {
      border-color: var(--nt-border);
    }
    body[data-theme="obsidian-vip"] .text-slate-900,
    body[data-theme="obsidian-vip"] .text-slate-950,
    body[data-theme="obsidian-vip"] .text-slate-800,
    body[data-theme="obsidian-vip"] .text-slate-700 {
      color: var(--nt-text);
    }
    body[data-theme="obsidian-vip"] .text-slate-600,
    body[data-theme="obsidian-vip"] .text-slate-500 {
      color: var(--nt-muted);
    }
    body[data-theme="obsidian-vip"] input,
    body[data-theme="obsidian-vip"] textarea,
    body[data-theme="obsidian-vip"] select {
      background-color: var(--nt-surface-soft);
      color: var(--nt-text);
      border-color: #334155;
    }

    @media (max-width: 640px) {
      input, textarea, select {
        font-size: 16px;
      }
      #ai-chat-drawer {
        height: 68dvh;
        max-height: 68dvh;
      }
    }
  </style>
</head>
<body data-theme="nadlan-logo" class="min-h-screen flex flex-col text-slate-900">
  <!-- إشعار نظام مخصص بديل عن alert/confirm -->
  <div id="toast-banner" class="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 hidden max-w-md w-[92%] px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-2xl border border-slate-700 items-center justify-between gap-3">
    <span id="toast-message"></span>
    <button type="button" onclick="hideToast()" class="text-amber-300 hover:text-amber-200 text-xs font-extrabold px-2 py-1 rounded-lg bg-slate-800">إغلاق</button>
  </div>

  <!-- الشريط العلوي -->
  <header class="bg-gradient-to-l from-[#071324] via-[#0f2544] to-[#16335b] text-white shadow-xl border-b border-blue-400/20 relative overflow-hidden">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.12),transparent_40%)] pointer-events-none"></div>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 relative z-10">
      <div class="flex items-center gap-3.5">
        <!-- شعار NadlanTours AI -->
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 p-[1.5px] shadow-lg shadow-amber-500/20 shrink-0">
          <div class="w-full h-full rounded-[14px] bg-[#09182d] flex items-center justify-center relative">
            <svg viewBox="0 0 36 36" class="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="14" stroke="url(#nt-grad)" stroke-width="1.6" stroke-dasharray="3 2.5"/>
              <path d="M9 21.5L26.5 11.5L21 25L17.2 20.4L13.5 23L14.2 18.2L9 21.5Z" fill="url(#nt-grad)"/>
              <circle cx="26.5" cy="9.5" r="2.2" fill="#38bdf8"/>
              <defs>
                <linearGradient id="nt-grad" x1="8" y1="10" x2="28" y2="26" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#FDE68A"/>
                  <stop offset="0.55" stop-color="#F59E0B"/>
                  <stop offset="1" stop-color="#38BDF8"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 dir="ltr" class="font-jakarta text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-1.5">
              <span class="text-white">Nadlan<span class="text-amber-400">Tours</span></span>
              <span class="px-2 py-0.5 rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 text-xs font-black tracking-wider shadow-xs">AI</span>
            </h1>
            <span class="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-[#e59a1c]/20 text-[#fbd06b] font-extrabold border border-[#f4ad27]/40">ندلان تورز للسياحة والسفر</span>
          </div>
          <p class="text-xs text-slate-300 mt-0.5">منصة السفر الذكية — إدارة الحجوزات، استخراج التذاكر، وبوابة الزبون التفاعلية</p>
        </div>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap">
        <button
          type="button"
          id="theme-settings-btn"
          onclick="openThemePopup()"
          class="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-amber-300 border border-white/15 text-xs sm:text-sm font-extrabold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          title="إعدادات المظهر والثيم"
        >
          <span>🎨</span>
          <span>الثيمات</span>
        </button>

        <div class="flex items-center gap-2 bg-slate-950/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 shadow-inner">
          <button
            type="button"
            id="tab-customer-btn"
            onclick="switchPortal('customer')"
            class="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow cursor-pointer"
          >
            🧳 دخول الزبون
          </button>
          <button
            type="button"
            id="tab-admin-btn"
            onclick="switchPortal('admin')"
            class="px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition text-slate-200 hover:bg-white/10 cursor-pointer"
          >
            🛠️ قسم الإدارة
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- المحتوى الرئيسي -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
    <!-- ==================== قسم الإدارة ==================== -->
    <section id="admin-section" class="hidden space-y-6">
      <!-- شريط علوي داخل قسم الإدارة للتنقل بين إضافة الحجز ومكان إدارة الزبائن المخصص -->
      <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            id="admin-tab-customers-btn"
            onclick="switchAdminSubView('customers')"
            class="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition bg-brand-700 text-white shadow cursor-pointer flex items-center gap-1.5"
          >
            <span>👥 إدارة الزبائن</span>
            <span id="admin-customers-pill-count" class="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">0</span>
          </button>
          <button
            type="button"
            id="admin-tab-form-btn"
            onclick="switchAdminSubView('form')"
            class="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer flex items-center gap-1.5"
          >
            <span>➕ إضافة / تعديل حجز</span>
          </button>
        </div>
        <p id="admin-subview-hint" class="text-xs font-bold text-slate-500">مكان مخصص لإدارة جميع الزبائن وحجوزاتهم</p>
      </div>

      <!-- مكان مخصص بالكامل لإدارة الزبائن -->
      <div id="admin-customers-workspace" class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 class="text-lg sm:text-xl font-black text-slate-900">👥 إدارة الزبائن</h2>
            <p class="text-xs text-slate-500">محل مخصص لمتابعة الزبائن، تعديل حجوزاتهم، نسخ الرسالة، أو فتح رحلة الزبون مباشرة</p>
          </div>
          <div class="flex items-center gap-2">
            <span id="bookings-count-badge" class="px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-black">0 حجوزات</span>
            <button
              type="button"
              onclick="switchAdminSubView('form')"
              class="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black transition cursor-pointer"
            >
              + حجز جديد
            </button>
          </div>
        </div>

        <div class="relative">
          <input
            type="text"
            id="bookings-search-input"
            oninput="renderBookingsList()"
            placeholder="🔍 ابحث بالاسم، العائلة، PNR، أو الوجهة..."
            class="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 outline-none text-xs sm:text-sm font-bold"
          />
        </div>

        <div id="bookings-list" class="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[780px] overflow-y-auto custom-scroll pr-1"></div>
      </div>

      <!-- مساحة إضافة / تعديل الحجز -->
      <div id="admin-form-workspace" class="hidden">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- نموذج إضافة / تعديل الحجز -->
        <div class="lg:col-span-12 bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 id="form-heading" class="text-lg font-black text-slate-900">إضافة حجز جديد</h2>
              <p class="text-xs text-slate-500">يُسجل الحجز باسم الزبون الرئيسي مع حفظ جميع المسافرين واستخراج البيانات تلقائياً</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick="applyStandardTemplate()"
                class="px-3 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 text-xs font-extrabold transition cursor-pointer"
              >
                📋 القالب القياسي
              </button>
              <button
                type="button"
                id="btn-cancel-edit"
                onclick="cancelEditBooking()"
                class="hidden px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold transition cursor-pointer"
              >
                ✖ إلغاء التعديل
              </button>
            </div>
          </div>

          <input type="hidden" id="editing-booking-id" value="" />

          <!-- بيانات الزبون الرئيسي -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-extrabold text-slate-700 mb-1">الاسم الأول للزبون *</label>
              <input
                type="text"
                id="customer-first-name"
                placeholder="مثال: أحمد"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm font-bold"
              />
            </div>
            <div>
              <label class="block text-xs font-extrabold text-slate-700 mb-1">اسم العائلة للزبون *</label>
              <input
                type="text"
                id="customer-last-name"
                placeholder="مثال: محاجنة"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm font-bold"
              />
            </div>
            <div>
              <label class="block text-xs font-extrabold text-slate-700 mb-1">المدينة / الوجهة الرئيسية</label>
              <input
                type="text"
                id="main-destination"
                placeholder="مثال: باتومي أو دبي"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm font-bold"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-extrabold text-slate-700 mb-1">رمز الحجز / PNR للدخول</label>
              <input
                type="text"
                id="booking-pnr"
                placeholder="يُولّد تلقائياً مثل NDL10 أو أدخل PNR"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm font-extrabold uppercase"
              />
            </div>
            <div>
              <label class="block text-xs font-extrabold text-slate-700 mb-1">أسماء جميع المسافرين (سطر لكل مسافر)</label>
              <textarea
                id="passengers-list-input"
                rows="2"
                placeholder="أحمد محاجنة&#10;سارة محاجنة"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 outline-none text-xs font-bold"
              ></textarea>
            </div>
          </div>

          <div>
            <label class="block text-xs font-extrabold text-slate-700 mb-1">ملاحظات الزبون / الحجز</label>
            <textarea
              id="booking-notes-input"
              rows="2"
              placeholder="مثال: غرفة متصلة، طلب خاص، موعد وصول مرن..."
              class="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 outline-none text-xs font-bold"
            ></textarea>
          </div>

          <!-- استخراج تلقائي من ملف PDF أو صورة -->
          <div class="bg-slate-50 border border-dashed border-brand-400 rounded-2xl p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="text-xs sm:text-sm font-black text-brand-900">⚡ استخراج تلقائي من ملف PDF أو صورة</h3>
                <p class="text-[11px] text-slate-600">يدعم تذاكر الطيران (ذهاب وعودة، رقم الرحلة، PNR، الحقائب، المسافرين) والفنادق والتوصيل — ويمكنك لصق صورة مباشرة بـ Ctrl+V</p>
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" onclick="triggerExtract('flight')" class="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold cursor-pointer">
                  ✈️ استخراج طيران
                </button>
                <button type="button" onclick="triggerExtract('hotel')" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold cursor-pointer">
                  🏨 استخراج فندق
                </button>
                <button type="button" onclick="triggerExtract('transfer')" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold cursor-pointer">
                  🚐 استخراج توصيل
                </button>
                <button type="button" onclick="openPasteExtractModal()" class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-extrabold cursor-pointer">
                  📋 لصق صورة (Ctrl+V)
                </button>
              </div>
            </div>
            <input
              type="file"
              id="extract-file-input"
              accept="application/pdf,image/*"
              onchange="handleExtractFileSelected(event)"
              class="hidden"
            />
            <div id="extract-status" class="hidden text-xs font-bold text-brand-800 bg-brand-100/70 px-3 py-2 rounded-xl items-center gap-2">
              <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
              <span id="extract-status-text">جاري تحليل الملف واستخراج البيانات...</span>
            </div>
          </div>

          <!-- أزرار إضافة المحطات بالترتيب -->
          <div class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-sm font-black text-slate-900">محطات الرحلة بالترتيب</h3>
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" onclick="addStation('flight')" class="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-extrabold cursor-pointer">+ طيران</button>
                <button type="button" onclick="addStation('hotel')" class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-extrabold cursor-pointer">+ فندق</button>
                <button type="button" onclick="addStation('transfer')" class="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-extrabold cursor-pointer">+ توصيل</button>
                <button type="button" onclick="addStation('tour')" class="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-extrabold cursor-pointer">+ جولة</button>
              </div>
            </div>

            <div id="stations-container" class="space-y-3"></div>
          </div>

          <div class="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              onclick="saveBooking()"
              class="px-6 py-3 rounded-2xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-black shadow-md transition cursor-pointer"
            >
              💾 حفظ الحجز وتوليد الرسالة
            </button>
          </div>

          <!-- بطاقة الرسالة الجاهزة للنسخ -->
          <div id="generated-message-box" class="hidden bg-amber-50/90 border border-amber-300 rounded-2xl p-4 space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-black text-amber-950">📩 رسالة جاهزة لإرسالها للزبون</span>
              <button
                type="button"
                onclick="copyGeneratedMessage()"
                class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-extrabold cursor-pointer"
              >
                📋 نسخ الرسالة
              </button>
            </div>
            <pre id="generated-message-text" class="whitespace-pre-wrap text-xs leading-relaxed text-slate-800 font-bold bg-white p-3 rounded-xl border border-amber-200"></pre>
          </div>
        </div>
      </div>
      </div>
    </section>

    <!-- ==================== قسم الزبون ==================== -->
    <section id="customer-section" class="space-y-6">
      <!-- شاشة تسجيل دخول الزبون -->
      <div id="customer-login-card" class="max-w-lg mx-auto bg-white rounded-3xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-5">
        <div class="text-center space-y-2">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand-800 to-slate-900 text-amber-400 flex items-center justify-center text-2xl font-black shadow-md border border-brand-700/30">✈️</div>
          <h2 class="text-xl font-black text-slate-900">بوابة الزبون — <span dir="ltr" class="font-jakarta text-brand-700">NadlanTours AI</span></h2>
          <p class="text-xs sm:text-sm text-slate-500">أدخل رمز الحجز / PNR واسم العائلة لعرض تفاصيل رحلتك ومساعدك الذكي</p>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-extrabold text-slate-700 mb-1">رمز الحجز / PNR</label>
            <input
              type="text"
              id="login-pnr"
              placeholder="مثال: NDL10"
              class="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm font-extrabold uppercase"
            />
          </div>
          <div>
            <label class="block text-xs font-extrabold text-slate-700 mb-1">اسم العائلة</label>
            <input
              type="text"
              id="login-last-name"
              placeholder="مثال: محاجنة"
              class="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm font-bold"
            />
          </div>
          <button
            type="button"
            onclick="loginCustomerPortal()"
            class="w-full py-3 rounded-2xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-black shadow-md transition cursor-pointer"
          >
            دخول إلى رحلتي 🚀
          </button>
        </div>

        <div id="login-error-msg" class="hidden text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl"></div>

        <!-- وصول سريع للحجوزات التجريبية / المحفوظة -->
        <div class="pt-3 border-t border-slate-100 space-y-2">
          <p class="text-[11px] font-extrabold text-slate-400">حجوزات سريعة للمعاينة:</p>
          <div id="quick-demo-bookings" class="flex flex-wrap gap-2"></div>
        </div>
      </div>

      <!-- لوحة رحلة الزبون -->
      <div id="customer-dashboard" class="hidden space-y-6">
        <div id="checkin-alert-banner" class="hidden rounded-3xl p-4 sm:p-5 shadow-lg">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span id="checkin-alert-badge" class="px-2.5 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[11px] font-black">🔥 فتح الشيك إن!</span>
                <h3 id="checkin-alert-title" class="text-base sm:text-lg font-black">رحلتك اقتربت وبوابة الشيك إن مفتوحة الآن!</h3>
              </div>
              <p id="checkin-alert-desc" class="text-xs sm:text-sm font-bold text-slate-900"></p>
              <div id="checkin-alert-codes" class="flex flex-wrap items-center gap-2 pt-1 text-xs font-black"></div>
            </div>
            <div class="flex flex-wrap items-center gap-2 shrink-0">
              <a
                id="btn-airline-checkin-link"
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                class="hidden px-4 py-2.5 rounded-2xl bg-brand-800 hover:bg-brand-900 text-white text-xs font-extrabold shadow transition items-center gap-1.5"
              >
                <span>✈️ شيك إن</span>
                <span id="btn-airline-checkin-name" class="text-amber-300"></span>
              </a>
              <button
                type="button"
                id="btn-copy-checkin-info"
                onclick="copyCheckinCodesInfo()"
                class="px-4 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-extrabold shadow transition cursor-pointer"
              >
                📋 نسخ بيانات الشيك إن
              </button>
            </div>
          </div>
        </div>

        <!-- رأس بطاقة الزبون -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span id="customer-welcome-name" class="text-xl font-black text-slate-900"></span>
              <span id="customer-pnr-badge" class="px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-black"></span>
              <span id="customer-dest-badge" class="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold inline-flex items-center gap-1.5"></span>
            </div>
            <p class="text-xs text-slate-500">تفاصيل المسار، الطقس، الأماكن السياحية، المطاعم الحلال، وفيوز الكهرباء للوجهة</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onclick="openPassengersModal()"
              class="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-sm transition cursor-pointer"
            >
              👥 المسافرين
            </button>
            <button
              type="button"
              onclick="logoutCustomerPortal()"
              class="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition cursor-pointer"
            >
              خروج
            </button>
          </div>
        </div>

        <!-- بطاقة ملاحظات الحجز للزبون -->
        <div id="customer-notes-card" class="hidden bg-amber-50 border-2 border-amber-400 rounded-3xl p-4 sm:p-5 shadow-sm space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black">📝 ملاحظات الحجز</span>
          </div>
          <p id="customer-notes-text" class="text-xs sm:text-sm font-extrabold text-slate-900 leading-relaxed whitespace-pre-wrap"></p>
        </div>

        <!-- المحطات -->
        <div class="space-y-4">
          <div class="flex items-center justify-between px-1">
            <h3 class="text-base font-black text-slate-900">🧭 برنامج ومحطات الرحلة</h3>
            <span id="customer-stages-count" class="text-xs font-extrabold text-brand-700 bg-brand-100/80 px-3 py-1 rounded-full"></span>
          </div>
          <div id="customer-stages-list" class="space-y-4"></div>
        </div>

        <!-- الطقس لـ 5 أيام -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-black text-slate-900">🌤️ توقعات الطقس لـ 5 أيام</h3>
            <span id="weather-city-label" class="text-xs font-extrabold text-brand-700 bg-brand-50 px-3 py-1 rounded-full"></span>
          </div>
          <div id="weather-5days-grid" class="grid grid-cols-2 sm:grid-cols-5 gap-3"></div>
        </div>

        <!-- أبرز 4 مناطق سياحية + أفضل 5 مطاعم حلال -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
            <h3 class="text-base font-black text-slate-900">🏛️ أبرز 4 مناطق سياحية موصى بزيارتها</h3>
            <div id="attractions-4-grid" class="space-y-3"></div>
          </div>

          <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
            <h3 class="text-base font-black text-slate-900">🍽️ أفضل 5 مطاعم حلال بتقييم</h3>
            <div id="halal-5-grid" class="space-y-3"></div>
          </div>
        </div>

        <!-- فيوز الكهرباء والجهد مع رسومات مبسطة -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-base font-black text-slate-900">🔌 فيوز الكهرباء والجهد في الوجهة</h3>
            <span id="plug-voltage-badge" class="text-xs font-black px-3 py-1 rounded-full bg-amber-100 text-amber-900"></span>
          </div>
          <div id="power-info-card" class="grid grid-cols-1 md:grid-cols-12 gap-5 items-center"></div>
        </div>
      </div>

      <!-- ويدجت الشات العائم على الجنب مع رسالة المساعدة -->
      <div id="floating-ai-chat-widget" class="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5 w-auto max-w-[calc(100vw-2.5rem)]">
        <!-- رسالة منبثقة جانبية للسؤال عن الحاجة للمساعدة -->
        <div id="ai-side-prompt-msg" class="hidden bg-white text-slate-900 border-2 border-amber-400 rounded-2xl rounded-br-sm p-3.5 shadow-2xl max-w-[270px] space-y-2 transition">
          <div class="flex items-start justify-between gap-2">
            <span class="text-xs font-black text-brand-900">👋 عندك سؤال؟</span>
            <button
              type="button"
              onclick="hideAiPromptBubble(event)"
              class="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-black flex items-center justify-center shrink-0 cursor-pointer"
              title="إخفاء"
            >
              ✕
            </button>
          </div>
          <p class="text-[11px] font-bold text-slate-600 leading-relaxed">
            محتاج مساعدة؟ اسألني عن رحلتك أو الشيك إن ✨
          </p>
          <button
            type="button"
            onclick="openFloatingChat()"
            class="w-full py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black transition cursor-pointer"
          >
            تحدث مع المساعد الذكي
          </button>
        </div>

        <!-- نافذة الشات الجانبية -->
        <div id="ai-chat-drawer" class="hidden w-[360px] sm:w-[390px] max-w-[calc(100vw-2.5rem)] shrink-0 bg-white rounded-3xl shadow-2xl border border-slate-200 flex-col h-[520px] max-h-[75vh]">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-l from-[#071324] via-brand-900 to-brand-800 text-white rounded-t-3xl">
            <div class="flex items-center gap-2.5">
              <span class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">🤖</span>
              <div>
                <h3 class="text-sm font-black flex items-center gap-1.5"><span>مساعد</span> <span dir="ltr" class="font-jakarta text-amber-300">NadlanTours AI</span></h3>
                <p class="text-[11px] text-sky-200">يساعدك في مواعيد رحلتك، الشيك إن، والوجهة</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                onclick="resetAiChat()"
                class="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-bold cursor-pointer"
              >
                جديد
              </button>
              <button
                type="button"
                onclick="closeFloatingChat()"
                class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-black flex items-center justify-center cursor-pointer"
                title="تصغير الشات"
              >
                ✕
              </button>
            </div>
          </div>

          <div id="ai-chat-messages" class="flex-1 p-4 space-y-3 overflow-y-auto custom-scroll bg-slate-50/60"></div>

          <!-- أسئلة سريعة جاهزة أعلى حقل الإدخال -->
          <div id="ai-quick-questions" class="px-3 pt-2.5 pb-1.5 border-t border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto custom-scroll">
            <button
              type="button"
              onclick="sendQuickAiQuestion('وينتا رحلتي؟ وكم باقي عليها؟')"
              class="shrink-0 px-3 py-1.5 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-900 border border-brand-200 text-[11px] font-extrabold transition cursor-pointer"
            >
              📅 وينتا رحلتي؟
            </button>
            <button
              type="button"
              onclick="sendQuickAiQuestion('كيف أعمل شيك إن؟ وما هو رمز PNR واسم العائلة؟')"
              class="shrink-0 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 text-[11px] font-extrabold transition cursor-pointer"
            >
              ✈️ طريقة الشيك إن
            </button>
            <button
              type="button"
              onclick="sendQuickAiQuestion('ما هي تفاصيل الفندق والمواصلات؟')"
              class="shrink-0 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-extrabold transition cursor-pointer"
            >
              🏨 الفندق والتوصيل
            </button>
            <button
              type="button"
              onclick="sendQuickAiQuestion('ما هي الحقائب المسموحة لي في الرحلة؟')"
              class="shrink-0 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-[11px] font-extrabold transition cursor-pointer"
            >
              🧳 الحقائب المسموحة
            </button>
          </div>

          <form onsubmit="handleAiChatSubmit(event)" class="p-3 pt-1.5 flex items-center gap-2 bg-white rounded-b-3xl">
            <input
              type="text"
              id="ai-chat-input"
              placeholder="اسأل مثل: وينتا رحلتي؟ أو كيف أعمل شيك إن؟"
              class="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 outline-none text-xs sm:text-sm font-bold"
            />
            <button
              type="submit"
              class="px-4 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs sm:text-sm font-black cursor-pointer"
            >
              إرسال
            </button>
          </form>
        </div>

        <!-- زر الرسالة العائم الصغير على الجنب -->
        <button
          type="button"
          id="ai-floating-fab"
          onclick="toggleFloatingChat()"
          aria-label="فتح الرسائل"
          class="group w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-amber-300 to-orange-400 hover:from-amber-300 hover:to-amber-500 text-slate-950 shadow-2xl border-2 border-white/90 flex items-center justify-center transition transform hover:scale-105 cursor-pointer"
        >
          <svg viewBox="0 0 24 24" class="w-6 h-6" fill="currentColor" aria-hidden="true">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9.41l-3.7 3.7A1 1 0 0 1 4 19V5.5Z"/>
          </svg>
        </button>
      </div>
    </section>
  </main>

  <!-- نافذة كود الدخول لقسم الإدارة -->
  <div id="admin-code-modal" class="fixed inset-0 z-50 hidden bg-slate-950/65 backdrop-blur-xs items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">🔐</span>
          <h3 class="text-base font-black text-slate-900">كود دخول الإدارة</h3>
        </div>
        <button
          type="button"
          onclick="closeAdminCodeModal()"
          class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center cursor-pointer"
        >
          ✕
        </button>
      </div>

      <form onsubmit="submitAdminCode(event)" class="space-y-3">
        <div>
          <label class="block text-xs font-extrabold text-slate-700 mb-1">أدخل كود الإدارة</label>
          <input
            type="password"
            id="admin-code-input"
            placeholder="أدخل الكود السري"
            autocomplete="off"
            class="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm font-extrabold"
          />
        </div>
        <p id="admin-code-error" class="hidden text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
          كود الإدارة غير صحيح
        </p>
        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onclick="closeAdminCodeModal()"
            class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            class="px-5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-black cursor-pointer"
          >
            دخول
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- نافذة منبثقة (Popup) لعرض جميع المسافرين -->
  <div id="passengers-modal" class="fixed inset-0 z-50 hidden bg-slate-950/60 backdrop-blur-xs items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 class="text-lg font-black text-slate-900">👥 قائمة جميع المسافرين</h3>
        <button
          type="button"
          onclick="closePassengersModal()"
          class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center cursor-pointer"
        >
          ✕
        </button>
      </div>
      <div id="passengers-modal-list" class="space-y-2 max-h-72 overflow-y-auto custom-scroll"></div>
      <div class="pt-2 flex justify-end">
        <button
          type="button"
          onclick="closePassengersModal()"
          class="px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-black cursor-pointer"
        >
          إغلاق
        </button>
      </div>
    </div>
  </div>

  <!-- نافذة لصق صورة للاستخراج التلقائي -->
  <div id="paste-extract-modal" onclick="if(event.target===this)closePasteExtractModal()" class="fixed inset-0 z-50 hidden bg-slate-950/65 backdrop-blur-xs items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">📋</span>
          <h3 class="text-base font-black text-slate-900">لصق صورة للاستخراج التلقائي</h3>
        </div>
        <button
          type="button"
          onclick="closePasteExtractModal()"
          class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div>
        <label class="block text-xs font-extrabold text-slate-700 mb-1">نوع البيانات في الصورة</label>
        <select
          id="paste-extract-type-select"
          onchange="setPasteExtractTarget(this.value)"
          class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-extrabold bg-white"
        >
          <option value="flight">✈️ تذكرة / حجز طيران</option>
          <option value="hotel">🏨 حجز فندق</option>
          <option value="transfer">🚐 توصيل / مواصلات</option>
        </select>
      </div>

      <div
        id="paste-extract-dropzone"
        tabindex="0"
        class="border-2 border-dashed border-slate-300 hover:border-brand-600 rounded-2xl p-4 text-center bg-slate-50 space-y-3 focus:outline-none focus:border-brand-700"
      >
        <p id="paste-extract-hint" class="text-xs font-bold text-slate-600">
          اضغط Ctrl+V (أو Cmd+V على Mac) في أي مكان داخل هذه النافذة للصق الصورة مباشرة من الحافظة.
        </p>
        <div id="paste-extract-preview-wrap" class="hidden">
          <img
            id="paste-extract-preview-img"
            src=""
            alt="معاينة الصورة الملصوقة"
            class="max-h-52 mx-auto rounded-xl border border-slate-200 shadow-2xs object-contain"
          />
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onclick="closePasteExtractModal()"
          class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold cursor-pointer"
        >
          إلغاء
        </button>
        <button
          id="paste-extract-confirm-btn"
          type="button"
          disabled
          onclick="confirmPastedImageExtraction()"
          class="px-5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black cursor-pointer"
        >
          ✨ استخراج الآن
        </button>
      </div>
    </div>
  </div>

  <script>
    (function () {
      let promptTimer = null;
      let promptDismissed = false;

      window.openFloatingChat = function () {
        const drawer = document.getElementById("ai-chat-drawer");
        const bubble = document.getElementById("ai-side-prompt-msg");
        if (bubble) bubble.classList.add("hidden");
        if (drawer) {
          drawer.classList.remove("hidden");
          drawer.classList.add("flex");
        }
        setTimeout(() => {
          const inp = document.getElementById("ai-chat-input");
          if (inp) {
            inp.focus();
            inp.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        }, 120);
      };

      window.closeFloatingChat = function () {
        const drawer = document.getElementById("ai-chat-drawer");
        if (drawer) {
          drawer.classList.add("hidden");
          drawer.classList.remove("flex");
        }
      };

      window.toggleFloatingChat = function () {
        const drawer = document.getElementById("ai-chat-drawer");
        if (!drawer) return;
        const isOpen = !drawer.classList.contains("hidden");
        if (isOpen) {
          window.closeFloatingChat();
        } else {
          window.openFloatingChat();
        }
      };

      window.hideAiPromptBubble = function (e) {
        if (e) e.stopPropagation();
        promptDismissed = true;
        const bubble = document.getElementById("ai-side-prompt-msg");
        if (bubble) bubble.classList.add("hidden");
      };

      window.triggerAiHelpPrompt = function () {
        if (promptDismissed) return;
        const drawer = document.getElementById("ai-chat-drawer");
        if (drawer && !drawer.classList.contains("hidden")) return;
        const bubble = document.getElementById("ai-side-prompt-msg");
        if (bubble) {
          bubble.classList.remove("hidden");
        }
      };

      clearTimeout(promptTimer);
      promptTimer = setTimeout(() => {
        window.triggerAiHelpPrompt();
      }, 2200);
    })();
  </script>

  <script src="/js/app.js" defer></script>

  <!-- نافذة Popup لإعدادات الثيمات -->
  <div id="theme-settings-modal" onclick="if(event.target===this)closeThemePopup()" class="fixed inset-0 z-50 hidden bg-slate-950/65 backdrop-blur-xs items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="flex items-center gap-2.5">
          <span class="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center text-lg font-black">🎨</span>
          <div>
            <h3 class="text-base font-black text-slate-900">إعدادات المظهر والثيم</h3>
            <p class="text-[11px] text-slate-500">اختر الثيم المناسب لتطبيق فوراً</p>
          </div>
        </div>
        <button
          type="button"
          onclick="closeThemePopup()"
          class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div class="space-y-2.5">
        <button
          type="button"
          data-theme-choice="nadlan-logo"
          onclick="selectTheme('nadlan-logo')"
          class="theme-option-card w-full text-right p-3.5 rounded-2xl border-2 border-slate-200 hover:border-amber-400 transition flex items-center justify-between gap-3 cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-[#062a27] via-[#0b4f4a] to-[#f4ad27] shrink-0"></div>
            <div>
              <p class="text-sm font-black text-slate-900">1. Royal Horizon — أفق ندلان</p>
              <p class="text-[11px] text-slate-500 font-bold">زمردي ملكي وذهبي دافئ بإطلالة راقية</p>
            </div>
          </div>
          <span class="theme-check-badge hidden px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">مفعّل</span>
        </button>

        <button
          type="button"
          data-theme-choice="navy-white-gold"
          onclick="selectTheme('navy-white-gold')"
          class="theme-option-card w-full text-right p-3.5 rounded-2xl border-2 border-slate-200 hover:border-amber-400 transition flex items-center justify-between gap-3 cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-[#071630] via-[#ffffff] to-[#eab308] border border-slate-200 shrink-0"></div>
            <div>
              <p class="text-sm font-black text-slate-900">2. كحلي مع أبيض وذهبي</p>
              <p class="text-[11px] text-slate-500 font-bold">كحلي ملكي، خلفية بيضاء نقية، ولمسات ذهبية</p>
            </div>
          </div>
          <span class="theme-check-badge hidden px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">مفعّل</span>
        </button>

        <button
          type="button"
          data-theme-choice="emerald-luxe"
          onclick="selectTheme('emerald-luxe')"
          class="theme-option-card w-full text-right p-3.5 rounded-2xl border-2 border-slate-200 hover:border-amber-400 transition flex items-center justify-between gap-3 cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-[#042824] via-[#0f766e] to-[#eab308] shrink-0"></div>
            <div>
              <p class="text-sm font-black text-slate-900">3. Emerald Luxe Resort</p>
              <p class="text-[11px] text-slate-500 font-bold">زمردي منتجعات فخمة مع لمسة ذهبية</p>
            </div>
          </div>
          <span class="theme-check-badge hidden px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">مفعّل</span>
        </button>

        <button
          type="button"
          data-theme-choice="obsidian-vip"
          onclick="selectTheme('obsidian-vip')"
          class="theme-option-card w-full text-right p-3.5 rounded-2xl border-2 border-slate-200 hover:border-amber-400 transition flex items-center justify-between gap-3 cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-[#05070d] via-[#1e293b] to-[#fbbf24] shrink-0"></div>
            <div>
              <p class="text-sm font-black text-slate-900">4. Obsidian Midnight VIP</p>
              <p class="text-[11px] text-slate-500 font-bold">ليلي داكن بتباين عالٍ وإضاءة ذهبية</p>
            </div>
          </div>
          <span class="theme-check-badge hidden px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">مفعّل</span>
        </button>
      </div>

      <div class="pt-2 flex justify-end">
        <button
          type="button"
          onclick="closeThemePopup()"
          class="px-5 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-black cursor-pointer"
        >
          تم
        </button>
      </div>
    </div>
  </div>

  <script id="nadlan-theme-controller">
    (function () {
      const THEME_KEY = "nadlantours_theme_v2";
      const VALID = ["nadlan-logo", "navy-white-gold", "emerald-luxe", "obsidian-vip"];
      const LABELS = {
        "nadlan-logo": "Royal Horizon — أفق ندلان",
        "navy-white-gold": "كحلي مع أبيض وذهبي",
        "emerald-luxe": "Emerald Luxe Resort",
        "obsidian-vip": "Obsidian Midnight VIP"
      };

      function syncThemeUI(theme) {
        document.querySelectorAll(".theme-option-card").forEach((card) => {
          const active = card.getAttribute("data-theme-choice") === theme;
          const badge = card.querySelector(".theme-check-badge");
          card.classList.toggle("border-amber-400", active);
          card.classList.toggle("bg-amber-50/40", active);
          card.classList.toggle("border-slate-200", !active);
          if (badge) badge.classList.toggle("hidden", !active);
        });
      }

      window.applyTheme = function (theme, notify) {
        const chosen = VALID.includes(theme) ? theme : "navy-white-gold";
        document.body.setAttribute("data-theme", chosen);
        try { localStorage.setItem(THEME_KEY, chosen); } catch (_) {}
        syncThemeUI(chosen);
        if (notify && typeof showToast === "function") {
          showToast("تم تفعيل: " + (LABELS[chosen] || chosen));
        }
      };

      window.selectTheme = function (theme) {
        window.applyTheme(theme, true);
        window.closeThemePopup();
      };

      window.openThemePopup = function () {
        const modal = document.getElementById("theme-settings-modal");
        syncThemeUI(document.body.getAttribute("data-theme") || "navy-white-gold");
        if (modal) {
          modal.classList.remove("hidden");
          modal.classList.add("flex");
        }
      };

      window.closeThemePopup = function () {
        const modal = document.getElementById("theme-settings-modal");
        if (modal) {
          modal.classList.add("hidden");
          modal.classList.remove("flex");
        }
      };

      let saved = "navy-white-gold";
      try { saved = localStorage.getItem(THEME_KEY) || "navy-white-gold"; } catch (_) {}
      window.applyTheme(saved, false);
    })();
  </script>

  <script id="nadlan-admin-customers-hub">
    (function () {
      window.switchAdminSubView = function (view) {
        const customersWs = document.getElementById("admin-customers-workspace");
        const formWs = document.getElementById("admin-form-workspace");
        const tabCustomers = document.getElementById("admin-tab-customers-btn");
        const tabForm = document.getElementById("admin-tab-form-btn");
        const hint = document.getElementById("admin-subview-hint");

        const isCustomers = view !== "form";
        if (customersWs) customersWs.classList.toggle("hidden", !isCustomers);
        if (formWs) formWs.classList.toggle("hidden", isCustomers);

        if (tabCustomers) {
          tabCustomers.className = isCustomers
            ? "px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition bg-brand-700 text-white shadow cursor-pointer flex items-center gap-1.5"
            : "px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer flex items-center gap-1.5";
        }
        if (tabForm) {
          tabForm.className = !isCustomers
            ? "px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition bg-brand-700 text-white shadow cursor-pointer flex items-center gap-1.5"
            : "px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer flex items-center gap-1.5";
        }
        if (hint) {
          hint.textContent = isCustomers
            ? "مكان مخصص لإدارة جميع الزبائن وحجوزاتهم"
            : "نموذج إضافة أو تعديل تفاصيل الحجز والمحطات";
        }
      };

      function syncCustomersCountPill() {
        const badge = document.getElementById("bookings-count-badge");
        const pill = document.getElementById("admin-customers-pill-count");
        if (badge && pill) {
          const match = (badge.textContent || "").match(/\d+/);
          pill.textContent = match ? match[0] : "0";
        }
      }

      const observer = new MutationObserver(syncCustomersCountPill);
      const badgeEl = document.getElementById("bookings-count-badge");
      if (badgeEl) {
        observer.observe(badgeEl, { childList: true, characterData: true, subtree: true });
      }

      const origStartEdit = window.startEditBooking;
      if (typeof origStartEdit === "function") {
        window.startEditBooking = function (...args) {
          window.switchAdminSubView("form");
          return origStartEdit.apply(this, args);
        };
      }

      document.addEventListener("click", function (e) {
        const btn = e.target.closest("button, a");
        if (!btn) return;
        const txt = (btn.textContent || "").trim();
        if (txt.includes("تعديل") && btn.closest("#bookings-list")) {
          window.switchAdminSubView("form");
        }
      });

      window.switchAdminSubView("customers");
      syncCustomersCountPill();
    })();
  </script>
</body>
</html>
