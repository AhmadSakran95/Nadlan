// ==================== DATA & KNOWLEDGE BASE ====================

const API_BASE = "/api";

const DESTINATION_DB = {
  "برشلونة": {
    lat: 41.3874,
    lon: 2.1686,
    country: "إسبانيا",
    plugType: "Type C / Type F",
    voltage: "230V / 50Hz",
    plugNote: "فيوز ثنائي دائري (قياسي أوروبي). يعمل مباشرة مع معظم شواحن الهواتف، وتحتاج محولاً فقط إذا كان جهازك ثلاثي الرؤوس.",
    halalRestaurants: [
      { name: "مطعم الأندلس (Al-Andalus)", rating: "4.9", cuisine: "مأكولات عربية ومتوسطية", area: "حي رافال (El Raval)" },
      { name: "مطعم دمشق (Restaurante Damasco)", rating: "4.8", cuisine: "مشويات وشاورما سورية", area: "الحي القوطي" },
      { name: "مطعم مراكش (Marrakech)", rating: "4.8", cuisine: "طواجن وكسكس مغربي", area: "إيكزامبل (Eixample)" },
      { name: "مطعم كراتشي (Karachi Halal)", rating: "4.7", cuisine: "مأكولات هندية وباكستانية", area: "لا رامبلا" },
      { name: "مطعم بوسفور (Bósforo Kebab & Grill)", rating: "4.7", cuisine: "مشويات تركية حلال", area: "بلازا كاتالونيا" }
    ],
    attractions: [
      { name: "كنيسة ساغرادا فاميليا", desc: "أشهر تحفة معمارية للمصمم غاودي في قلب برشلونة." },
      { name: "حديقة بارك غويل (Park Güell)", desc: "حديقة فنية خلابة بإطلالة بانورامية على المدينة والبحر." },
      { name: "شارع لا رامبلا والحي القوطي", desc: "قلب المدينة النابض بالأسواق والمقاهي التاريخية." },
      { name: "شاطئ برشلونيتا وملعب كامب نو", desc: "أجواء بحرية رائعة مع زيارة متحف نادي برشلونة." }
    ]
  },
  "إسطنبول": {
    lat: 41.0082,
    lon: 28.9784,
    country: "تركيا",
    plugType: "Type C / Type F",
    voltage: "230V / 50Hz",
    plugNote: "فيوز أوروبي ثنائي دائري. لا تحتاج لمحول للأجهزة ذات الرأسين، وتحتاج لمحول بسيط للأجهزة ذات الرؤوس الثلاثة.",
    halalRestaurants: [
      { name: "مطعم المدينة (Hatay Medeniyetler Sofrası)", rating: "4.9", cuisine: "مشويات وأطباق تركية", area: "تقسيم" },
      { name: "مطعم نصرت ستيك هاوس (Nusr-Et)", rating: "4.8", cuisine: "ستيك ولحوم فاخرة", area: "إتيلر / البوسفور" },
      { name: "مطعم حمدي (Hamdi Restaurant)", rating: "4.8", cuisine: "كباب تركي أصيل", area: "إمينونو" },
      { name: "مطعم سلطان أحمد كفتجي", rating: "4.7", cuisine: "كفتة ومشويات تقليدية", area: "السلطان أحمد" },
      { name: "مطعم أورتاكوي كومبير", rating: "4.7", cuisine: "مأكولات تركية سريعة", area: "أورتاكوي" }
    ],
    attractions: [
      { name: "آيا صوفيا ومسجد السلطان أحمد", desc: "أبرز المعالم التاريخية في إسطنبول القديمة." },
      { name: "جولة البوسفور البحرية", desc: "رحلة بحرية تفصل بين قارتي آسيا وأوروبا." },
      { name: "قصر توبكابي والبازار الكبير", desc: "تاريخ السلاطين العثمانيين وأكبر سوق مغطى في العالم." },
      { name: "برج غلطة وشارع الاستقلال", desc: "إطلالة 360 درجة على المدينة مع أجواء تسوق حيوية." }
    ]
  },
  "دبي": {
    lat: 25.2048,
    lon: 55.2708,
    country: "الإمارات العربية المتحدة",
    plugType: "Type G (ثلاثي بريطاني)",
    voltage: "230V / 50Hz",
    plugNote: "فيوز ثلاثي مستطيل (النظام البريطاني). إذا كانت أجهزتك برأسين دائريين ستحتاج لمحول ثلاثي.",
    halalRestaurants: [
      { name: "مطعم الفنر (Al Fanar)", rating: "4.9", cuisine: "مأكولات إماراتية تقليدية", area: "دبي فستيفال سيتي" },
      { name: "مطعم الصفدي (Al Safadi)", rating: "4.8", cuisine: "مشويات ومقبلات لبنانية", area: "شارع الشيخ زايد" },
      { name: "مطعم الحلاب (Al Hallab)", rating: "4.8", cuisine: "مأكولات شامية وحلويات", area: "دبي مول" },
      { name: "مطعم أرابيان تي هاوس", rating: "4.8", cuisine: "فطور وأطباق خليجية", area: "حي الفهيدي التاريخي" },
      { name: "مطعم زوما دبي (Zuma - Halal Certified)", rating: "4.9", cuisine: "مطبخ ياباني فاخر", area: "مركز دبي المالي" }
    ],
    attractions: [
      { name: "برج خليفة ودبي مول", desc: "أطول مبنى في العالم مع عروض النافورة الراقصة." },
      { name: "متحف المستقبل", desc: "أيقونة معمارية تستعرض ابتكارات المستقبل." },
      { name: "رحلة سفاري الصحراء", desc: "تجربة التطعيس وعشاء بدوي تحت النجوم." },
      { name: "دبي مارينا وعين دبي", desc: "ممشى بحري فاخر مع مطاعم ويخوت سياحية." }
    ]
  },
  "لندن": {
    lat: 51.5072,
    lon: -0.1276,
    country: "المملكة المتحدة",
    plugType: "Type G (ثلاثي بريطاني)",
    voltage: "230V / 50Hz",
    plugNote: "فيوز ثلاثي مستطيل حصراً. يجب إحضار محول ثلاثي (UK Adapter) لشحن أجهزتك ذات الرأسين.",
    halalRestaurants: [
      { name: "مطعم ديشوم (Dishoom)", rating: "4.9", cuisine: "مطبخ هندي بومباي", area: "كوفنت غاردن" },
      { name: "مطعم مروش (Maroush)", rating: "4.8", cuisine: "مشويات ومأكولات لبنانية", area: "إدجوير رود" },
      { name: "مطعم تايمز (Taza Kebab House)", rating: "4.8", cuisine: "شاورما ومشويات حلال", area: "كوينزواي" },
      { name: "مطعم ستييك آند كومباني", rating: "4.7", cuisine: "ستيك حلال معتمد", area: "بيكاديلي" },
      { name: "مطعم خان (Khan's Restaurant)", rating: "4.7", cuisine: "مأكولات هندية وباكستانية", area: "بايزووتر" }
    ],
    attractions: [
      { name: "ساعة بيغ بن وعين لندن", desc: "أشهر معالم العاصمة البريطانية على نهر التايمز." },
      { name: "قصر باكنغهام وحديقة هايد بارك", desc: "مشاهدة تغيير الحرس الملكي والتنزه في أشهر حدائق لندن." },
      { name: "شارع أكسفورد وريجنت", desc: "وجهة التسوق الأولى في بريطانيا." },
      { name: "المتحف البريطاني", desc: "كنوز حضارية من مختلف أنحاء العالم." }
    ]
  },
  "باريس": {
    lat: 48.8566,
    lon: 2.3522,
    country: "فرنسا",
    plugType: "Type C / Type E",
    voltage: "230V / 50Hz",
    plugNote: "فيوز ثنائي دائري قياسي أوروبي. يعمل مباشرة مع الأجهزة ذات الرأسين.",
    halalRestaurants: [
      { name: "مطعم لو ريلي دو لونتريكوت (حلال)", rating: "4.9", cuisine: "ستيك فرنسي حلال", area: "الدائرة العاشرة" },
      { name: "مطعم نورا (Noura)", rating: "4.8", cuisine: "مأكولات لبنانية فاخرة", area: "الشانزليزيه" },
      { name: "مطعم المنصور (Le Mansour)", rating: "4.8", cuisine: "طواجن ومشويات مغربية", area: "قرب قوس النصر" },
      { name: "مطعم كشمير هاوس", rating: "4.7", cuisine: "مطبخ هندي وباكستاني", area: "غار دو نور" },
      { name: "مطعم برغر فكتوري حلال", rating: "4.7", cuisine: "برغر غورميه حلال", area: "حي ماريه" }
    ],
    attractions: [
      { name: "برج إيفل ونهر السين", desc: "رمز باريس الأشهر مع جولة قارب في نهر السين." },
      { name: "شارع الشانزليزيه وقوس النصر", desc: "أرقى جادة للتسوق والمقاهي في العالم." },
      { name: "متحف اللوفر", desc: "موطن لوحة الموناليزا وأعظم الفنون العالمية." },
      { name: "ديزني لاند باريس", desc: "مدينة الألعاب الترفيهية للعائلات." }
    ]
  }
};

// ==================== STATE MANAGEMENT ====================

let bookings = [];
let builderSteps = [];
let currentCustomerBooking = null;
let currentWeatherSummary = [];
let lastGeneratedModalData = null;

function initApp() {
  loadStandardTemplate();
}

// ==================== NAVIGATION ====================

function switchMainTab(tab) {
  const secCustomer = document.getElementById("section-customer");
  const secAdmin = document.getElementById("section-admin");
  const navCustomer = document.getElementById("nav-customer");
  const navAdmin = document.getElementById("nav-admin");

  if (tab === "customer") {
    secCustomer.classList.remove("hidden");
    secAdmin.classList.add("hidden");
    navCustomer.className = "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 bg-amber-500 text-slate-950 shadow";
    navAdmin.className = "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 text-slate-300 hover:text-white";
  } else {
    secAdmin.classList.remove("hidden");
    secCustomer.classList.add("hidden");
    navAdmin.className = "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 bg-amber-500 text-slate-950 shadow";
    navCustomer.className = "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 text-slate-300 hover:text-white";
  }
}

// ==================== ADMIN AUTH & SQL API ====================

document.getElementById("admin-login-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const pwd = document.getElementById("admin-password").value;
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd })
    });
    if (res.ok) {
      quickAdminLogin();
    } else {
      document.getElementById("admin-login-error").classList.remove("hidden");
    }
  } catch (err) {
    alert("تعذر الاتصال بالسيرفر. تأكد من تشغيل أمر npm start");
  }
});

async function quickAdminLogin() {
  document.getElementById("admin-login-error").classList.add("hidden");
  document.getElementById("admin-login-view").classList.add("hidden");
  document.getElementById("admin-dashboard-view").classList.remove("hidden");
  await fetchAllBookingsFromSQL();
}

function logoutAdmin() {
  document.getElementById("admin-password").value = "";
  document.getElementById("admin-dashboard-view").classList.add("hidden");
  document.getElementById("admin-login-view").classList.remove("hidden");
}

async function fetchAllBookingsFromSQL() {
  try {
    const res = await fetch(`${API_BASE}/bookings`);
    bookings = await res.json();
    renderAdminBookings();
  } catch (err) {
    console.error("Error fetching bookings from SQL:", err);
  }
}

function loadStandardTemplate() {
  builderSteps = [
    { type: "flight", from: "", to: "", date: "", notes: "" },
    { type: "hotel", hotelName: "", stars: "5 نجوم", boardType: "إفطار فقط (BB)", notes: "" },
    { type: "transfer", from: "", to: "", date: "", notes: "" },
    { type: "hotel", hotelName: "", stars: "5 نجوم", boardType: "نصف إقامة (HB)", notes: "" },
    { type: "flight", from: "", to: "", date: "", notes: "" }
  ];
  renderBuilderSteps();
}

function addItineraryStep(type) {
  if (type === "flight") {
    builderSteps.push({ type: "flight", from: "", to: "", date: "", notes: "" });
  } else if (type === "hotel") {
    builderSteps.push({ type: "hotel", hotelName: "", stars: "4 نجوم", boardType: "إفطار فقط (BB)", notes: "" });
  } else if (type === "transfer") {
    builderSteps.push({ type: "transfer", from: "", to: "", date: "", notes: "" });
  } else {
    builderSteps.push({ type: "tour", title: "", date: "", notes: "" });
  }
  renderBuilderSteps();
}

function removeBuilderStep(index) {
  builderSteps.splice(index, 1);
  renderBuilderSteps();
}

function moveBuilderStep(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= builderSteps.length) return;
  const temp = builderSteps[index];
  builderSteps[index] = builderSteps[newIndex];
  builderSteps[newIndex] = temp;
  renderBuilderSteps();
}

function updateStepField(index, field, value) {
  builderSteps[index][field] = value;
}

function renderBuilderSteps() {
  const container = document.getElementById("builder-steps-container");
  if (builderSteps.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">لا توجد محطات بعد. أضف طيران أو فندق أو توصيل من الأزرار أعلاه.</div>`;
    return;
  }

  container.innerHTML = builderSteps.map((step, idx) => {
    let badgeHtml = "";
    let fieldsHtml = "";

    if (step.type === "flight") {
      badgeHtml = `<span class="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5"><i class="fa-solid fa-plane"></i> طيران (محطة ${idx + 1})</span>`;
      fieldsHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">من (مطار المغادرة) *</label>
            <input type="text" required value="${escapeHtml(step.from || '')}" oninput="updateStepField(${idx}, 'from', this.value)" placeholder="مثال: مطار بن غوريون (TLV)" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">إلى (مطار الوصول) *</label>
            <input type="text" required value="${escapeHtml(step.to || '')}" oninput="updateStepField(${idx}, 'to', this.value)" placeholder="مثال: مطار برشلونة (BCN)" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">تاريخ ووقت السفر *</label>
            <input type="text" required value="${escapeHtml(step.date || '')}" oninput="updateStepField(${idx}, 'date', this.value)" placeholder="مثال: 2026-12-01 | 09:30 صباحاً" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">ملاحظات إضافية (شركة الطيران / رقم الرحلة)</label>
            <input type="text" value="${escapeHtml(step.notes || '')}" oninput="updateStepField(${idx}, 'notes', this.value)" placeholder="مثال: رحلة رقم TK789" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-blue-500" />
          </div>
        </div>
      `;
    } else if (step.type === "hotel") {
      badgeHtml = `<span class="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5"><i class="fa-solid fa-hotel"></i> فندق (محطة ${idx + 1})</span>`;
      fieldsHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div class="sm:col-span-3">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">اسم الفندق *</label>
            <input type="text" required value="${escapeHtml(step.hotelName || '')}" oninput="updateStepField(${idx}, 'hotelName', this.value)" placeholder="مثال: فندق هيلتون سنتر" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-amber-500" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">تصنيف النجوم *</label>
            <select onchange="updateStepField(${idx}, 'stars', this.value)" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-amber-500">
              <option value="5 نجوم" ${step.stars === "5 نجوم" ? "selected" : ""}>⭐⭐⭐⭐⭐ 5 نجوم</option>
              <option value="4 نجوم" ${step.stars === "4 نجوم" ? "selected" : ""}>⭐⭐⭐⭐ 4 نجوم</option>
              <option value="3 نجوم" ${step.stars === "3 نجوم" ? "selected" : ""}>⭐⭐⭐ 3 نجوم</option>
              <option value="منتجع فاخر" ${step.stars === "منتجع فاخر" ? "selected" : ""}>👑 منتجع فاخر</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">نوع الإقامة *</label>
            <select onchange="updateStepField(${idx}, 'boardType', this.value)" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-amber-500">
              <option value="بدون وجبات (RO)" ${step.boardType === "بدون وجبات (RO)" ? "selected" : ""}>بدون وجبات (RO)</option>
              <option value="إفطار فقط (BB)" ${step.boardType === "إفطار فقط (BB)" ? "selected" : ""}>إفطار فقط (BB)</option>
              <option value="نصف إقامة (فطور + عشاء HB)" ${step.boardType === "نصف إقامة (فطور + عشاء HB)" ? "selected" : ""}>نصف إقامة (فطور + عشاء HB)</option>
              <option value="إقامة كاملة (FB)" ${step.boardType === "إقامة كاملة (FB)" ? "selected" : ""}>إقامة كاملة (FB)</option>
              <option value="شامل كلياً (All Inclusive)" ${step.boardType === "شامل كلياً (All Inclusive)" ? "selected" : ""}>شامل كلياً (All Inclusive)</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">عدد الليالي / نوع الغرفة</label>
            <input type="text" value="${escapeHtml(step.notes || '')}" oninput="updateStepField(${idx}, 'notes', this.value)" placeholder="مثال: 3 ليالي - غرفة مزدوجة" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-amber-500" />
          </div>
        </div>
      `;
    } else if (step.type === "transfer") {
      badgeHtml = `<span class="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5"><i class="fa-solid fa-car"></i> توصيل (محطة ${idx + 1})</span>`;
      fieldsHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">التوصيل من أين *</label>
            <input type="text" required value="${escapeHtml(step.from || '')}" oninput="updateStepField(${idx}, 'from', this.value)" placeholder="مثال: المطار / الفندق الأول" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">التوصيل إلى أين *</label>
            <input type="text" required value="${escapeHtml(step.to || '')}" oninput="updateStepField(${idx}, 'to', this.value)" placeholder="مثال: الفندق الثاني / المطار" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">تاريخ ووقت التوصيل *</label>
            <input type="text" required value="${escapeHtml(step.date || '')}" oninput="updateStepField(${idx}, 'date', this.value)" placeholder="مثال: 2026-12-04 | 11:00 صباحاً" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">نوع السيارة / ملاحظات</label>
            <input type="text" value="${escapeHtml(step.notes || '')}" oninput="updateStepField(${idx}, 'notes', this.value)" placeholder="مثال: سيارة VIP خاصة" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-emerald-500" />
          </div>
        </div>
      `;
    } else {
      badgeHtml = `<span class="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5"><i class="fa-solid fa-map-location-dot"></i> جولة سياحية (محطة ${idx + 1})</span>`;
      fieldsHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">اسم الجولة / النشاط *</label>
            <input type="text" required value="${escapeHtml(step.title || '')}" oninput="updateStepField(${idx}, 'title', this.value)" placeholder="مثال: جولة معالم المدينة" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-purple-500" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">التاريخ والوقت *</label>
            <input type="text" required value="${escapeHtml(step.date || '')}" oninput="updateStepField(${idx}, 'date', this.value)" placeholder="مثال: 2026-12-03 | 10:00 صباحاً" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-purple-500" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">تفاصيل الجولة</label>
            <input type="text" value="${escapeHtml(step.notes || '')}" oninput="updateStepField(${idx}, 'notes', this.value)" placeholder="مثال: شامل مرشد عربي وتذاكر الدخول" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-purple-500" />
          </div>
        </div>
      `;
    }

    return `
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between">
          ${badgeHtml}
          <div class="flex items-center gap-1">
            <button type="button" onclick="moveBuilderStep(${idx}, -1)" title="تحريك لأعلى" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs flex items-center justify-center"><i class="fa-solid fa-arrow-up"></i></button>
            <button type="button" onclick="moveBuilderStep(${idx}, 1)" title="تحريك لأسفل" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs flex items-center justify-center"><i class="fa-solid fa-arrow-down"></i></button>
            <button type="button" onclick="removeBuilderStep(${idx})" title="حذف المحطة" class="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs flex items-center justify-center"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        ${fieldsHtml}
      </div>
    `;
  }).join("");
}

document.getElementById("booking-builder-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  if (builderSteps.length === 0) {
    alert("يرجى إضافة محطة واحدة على الأقل في مسار الرحلة!");
    return;
  }

  const editingPnr = document.getElementById("edit-booking-pnr").value;

  const payload = {
    firstName: document.getElementById("b-firstname").value.trim(),
    lastName: document.getElementById("b-lastname").value.trim(),
    phone: document.getElementById("b-phone").value.trim(),
    city: document.getElementById("b-city").value.trim(),
    price: Number(document.getElementById("b-price").value),
    currency: document.getElementById("b-currency").value,
    terms: document.getElementById("b-terms").value.trim(),
    itinerary: JSON.parse(JSON.stringify(builderSteps))
  };

  try {
    let res;
    if (editingPnr) {
      res = await fetch(`${API_BASE}/bookings/${editingPnr}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    if (!res.ok) throw new Error("Failed to save to SQL");
    const savedBooking = await res.json();

    await fetchAllBookingsFromSQL();
    resetAdminForm();

    lastGeneratedModalData = savedBooking;
    document.getElementById("modal-pnr-code").textContent = savedBooking.pnr;
    document.getElementById("modal-lastname").textContent = savedBooking.lastName;
    const modal = document.getElementById("pnr-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  } catch (err) {
    alert("حدث خطأ أثناء حفظ البيانات في قاعدة بيانات SQL.");
  }
});

function resetAdminForm() {
  document.getElementById("booking-builder-form").reset();
  document.getElementById("edit-booking-pnr").value = "";
  document.getElementById("form-mode-title").innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-500"></i><span>إنشاء برنامج رحلة جديد</span>`;
  document.getElementById("editing-pnr-badge").classList.add("hidden");
  loadStandardTemplate();
}

function editBooking(pnr) {
  const b = bookings.find(item => item.pnr === pnr);
  if (!b) return;

  document.getElementById("edit-booking-pnr").value = b.pnr;
  document.getElementById("b-firstname").value = b.firstName;
  document.getElementById("b-lastname").value = b.lastName;
  document.getElementById("b-phone").value = b.phone;
  document.getElementById("b-city").value = b.city;
  document.getElementById("b-price").value = b.price;
  document.getElementById("b-currency").value = b.currency;
  document.getElementById("b-terms").value = b.terms;

  builderSteps = JSON.parse(JSON.stringify(b.itinerary));
  renderBuilderSteps();

  document.getElementById("form-mode-title").innerHTML = `<i class="fa-solid fa-pen text-blue-600"></i><span>تعديل الحجز</span>`;
  const badge = document.getElementById("editing-pnr-badge");
  badge.textContent = `PNR: ${b.pnr}`;
  badge.classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteBooking(pnr) {
  if (!confirm(`هل أنت متأكد من حذف الحجز رقم ${pnr} من قاعدة البيانات؟`)) return;
  try {
    await fetch(`${API_BASE}/bookings/${pnr}`, { method: "DELETE" });
    await fetchAllBookingsFromSQL();
  } catch (err) {
    alert("خطأ أثناء الحذف من SQL.");
  }
}

function renderAdminBookings() {
  const query = (document.getElementById("admin-search-input")?.value || "").trim().toLowerCase();
  const filtered = bookings.filter(b =>
    b.pnr.toLowerCase().includes(query) ||
    b.firstName.toLowerCase().includes(query) ||
    b.lastName.toLowerCase().includes(query) ||
    b.city.toLowerCase().includes(query)
  );

  document.getElementById("total-bookings-count").textContent = bookings.length;
  const container = document.getElementById("admin-bookings-list");

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-center text-xs text-slate-400 py-8">لا توجد حجوزات مطابقة.</p>`;
    return;
  }

  container.innerHTML = filtered.map(b => `
    <div class="p-4 rounded-2xl border border-slate-200 hover:border-amber-400 bg-slate-50/60 transition space-y-2.5">
      <div class="flex items-center justify-between">
        <span class="bg-slate-900 text-amber-400 font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg">${b.pnr}</span>
        <span class="font-extrabold text-sm text-emerald-700">${b.price} ${b.currency}</span>
      </div>
      <div>
        <h4 class="font-extrabold text-slate-900 text-sm">${escapeHtml(b.firstName)} ${escapeHtml(b.lastName)}</h4>
        <p class="text-xs text-slate-500 mt-0.5">
          <i class="fa-solid fa-location-dot text-amber-500 ml-1"></i> ${escapeHtml(b.city)} • ${b.itinerary.length} محطات
        </p>
      </div>
      <div class="flex items-center gap-2 pt-2 border-t border-slate-200/70">
        <button onclick="quickCustomerLogin('${b.pnr}', '${escapeHtml(b.lastName)}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 rounded-lg transition">
          معاينة كزبون
        </button>
        <button onclick="editBooking('${b.pnr}')" class="px-3 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold py-1.5 rounded-lg transition">
          تعديل
        </button>
        <button onclick="deleteBooking('${b.pnr}')" class="px-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold py-1.5 rounded-lg transition">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `).join("");
}

// Modal Controls
function closePnrModal() {
  const modal = document.getElementById("pnr-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function copyWhatsAppMessage() {
  if (!lastGeneratedModalData) return;
  const b = lastGeneratedModalData;
  const msg = `مرحباً ${b.firstName} ${b.lastName} ✈️\nتم تأكيد برنامجك السياحي عبر *Nadlantours* لوجهة *${b.city}*.\n\nبيانات الدخول لاستعراض برنامجك والطقس والمطاعم الحلال:\n• رقم الحجز (PNR): *${b.pnr}*\n• اسم العائلة: *${b.lastName}*\n\nنتمنى لك رحلة سعيدة! 🌍`;
  navigator.clipboard.writeText(msg);
  alert("تم نسخ رسالة الواتساب بنجاح!");
}

function previewBookingAsCustomer() {
  if (!lastGeneratedModalData) return;
  closePnrModal();
  quickCustomerLogin(lastGeneratedModalData.pnr, lastGeneratedModalData.lastName);
}

// ==================== CUSTOMER VIEW & AUTO DESTINATION INFO ====================

document.getElementById("customer-login-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const pnr = document.getElementById("login-pnr").value.trim().toUpperCase();
  const lastName = document.getElementById("login-lastname").value.trim();
  loginCustomer(pnr, lastName);
});

function quickCustomerLogin(pnr, lastName) {
  switchMainTab("customer");
  document.getElementById("login-pnr").value = pnr;
  document.getElementById("login-lastname").value = lastName;
  loginCustomer(pnr, lastName);
}

async function loginCustomer(pnr, lastName) {
  const errEl = document.getElementById("login-error");
  try {
    const res = await fetch(`${API_BASE}/customer/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pnr, lastName })
    });

    if (!res.ok) {
      errEl.classList.remove("hidden");
      return;
    }

    const found = await res.json();
    errEl.classList.add("hidden");
    currentCustomerBooking = found;
    renderCustomerDashboard(found);
  } catch (err) {
    alert("تعذر الاتصال بقاعدة البيانات. تأكد من تشغيل السيرفر عبر npm start");
  }
}

function logoutCustomer() {
  currentCustomerBooking = null;
  document.getElementById("customer-dashboard-view").classList.add("hidden");
  document.getElementById("customer-login-view").classList.remove("hidden");
}

function renderCustomerDashboard(b) {
  document.getElementById("customer-login-view").classList.add("hidden");
  document.getElementById("customer-dashboard-view").classList.remove("hidden");

  document.getElementById("cust-pnr-badge").textContent = `PNR: ${b.pnr}`;
  document.getElementById("cust-fullname").textContent = `${b.firstName} ${b.lastName}`;
  document.getElementById("cust-city").textContent = b.city;
  document.getElementById("cust-phone").textContent = b.phone;
  document.getElementById("cust-price").textContent = `${b.price} ${b.currency}`;
  document.getElementById("cust-terms").textContent = b.terms;
  document.getElementById("cust-steps-count").textContent = `${b.itinerary.length} محطات`;

  const listEl = document.getElementById("cust-itinerary-list");
  listEl.innerHTML = b.itinerary.map((step, idx) => {
    let icon = "fa-circle";
    let colorClass = "bg-blue-600 text-white";
    let title = "";
    let detailsHtml = "";

    if (step.type === "flight") {
      icon = "fa-plane";
      colorClass = "bg-blue-600 text-white";
      title = `طيران: من ${escapeHtml(step.from)} إلى ${escapeHtml(step.to)}`;
      detailsHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs text-slate-600">
          <div class="bg-white px-3 py-2 rounded-xl border border-slate-200/70">
            <span class="text-slate-400 block text-[10px]">من:</span>
            <strong class="text-slate-800">${escapeHtml(step.from)}</strong>
          </div>
          <div class="bg-white px-3 py-2 rounded-xl border border-slate-200/70">
            <span class="text-slate-400 block text-[10px]">إلى:</span>
            <strong class="text-slate-800">${escapeHtml(step.to)}</strong>
          </div>
          <div class="sm:col-span-2 bg-blue-50/70 text-blue-900 px-3 py-2 rounded-xl font-bold">
            <i class="fa-regular fa-calendar-check ml-1"></i> تاريخ السفر: ${escapeHtml(step.date)}
          </div>
        </div>
        ${step.notes ? `<p class="text-xs text-slate-500 mt-2"><i class="fa-solid fa-circle-info ml-1 text-blue-500"></i> ${escapeHtml(step.notes)}</p>` : ""}
      `;
    } else if (step.type === "hotel") {
      icon = "fa-hotel";
      colorClass = "bg-amber-500 text-slate-950";
      title = `إقامة فندقية: ${escapeHtml(step.hotelName)}`;
      detailsHtml = `
        <div class="flex flex-wrap gap-2 mt-2 text-xs">
          <span class="bg-amber-100 text-amber-900 font-extrabold px-3 py-1 rounded-lg">
            <i class="fa-solid fa-star text-amber-500 ml-1"></i> ${escapeHtml(step.stars)}
          </span>
          <span class="bg-emerald-100 text-emerald-900 font-extrabold px-3 py-1 rounded-lg">
            <i class="fa-solid fa-utensils ml-1"></i> نوع الإقامة: ${escapeHtml(step.boardType)}
          </span>
        </div>
        ${step.notes ? `<p class="text-xs text-slate-600 mt-2"><i class="fa-solid fa-bed ml-1 text-amber-600"></i> ${escapeHtml(step.notes)}</p>` : ""}
      `;
    } else if (step.type === "transfer") {
      icon = "fa-car";
      colorClass = "bg-emerald-600 text-white";
      title = `توصيل خاص: من ${escapeHtml(step.from)} إلى ${escapeHtml(step.to)}`;
      detailsHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs text-slate-600">
          <div class="bg-white px-3 py-2 rounded-xl border border-slate-200/70">
            <span class="text-slate-400 block text-[10px]">نقطة الانطلاق (من أين):</span>
            <strong class="text-slate-800">${escapeHtml(step.from)}</strong>
          </div>
          <div class="bg-white px-3 py-2 rounded-xl border border-slate-200/70">
            <span class="text-slate-400 block text-[10px]">الوجهة (إلى أين):</span>
            <strong class="text-slate-800">${escapeHtml(step.to)}</strong>
          </div>
          <div class="sm:col-span-2 bg-emerald-50/70 text-emerald-900 px-3 py-2 rounded-xl font-bold">
            <i class="fa-regular fa-clock ml-1"></i> تاريخ التوصيل: ${escapeHtml(step.date)}
          </div>
        </div>
        ${step.notes ? `<p class="text-xs text-slate-500 mt-2"><i class="fa-solid fa-car-side ml-1 text-emerald-600"></i> ${escapeHtml(step.notes)}</p>` : ""}
      `;
    } else {
      icon = "fa-map-location-dot";
      colorClass = "bg-purple-600 text-white";
      title = `جولة سياحية: ${escapeHtml(step.title)}`;
      detailsHtml = `
        <div class="mt-2 text-xs bg-purple-50 text-purple-900 px-3 py-2 rounded-xl font-bold">
          <i class="fa-regular fa-calendar ml-1"></i> التاريخ: ${escapeHtml(step.date)}
        </div>
        ${step.notes ? `<p class="text-xs text-slate-600 mt-2">${escapeHtml(step.notes)}</p>` : ""}
      `;
    }

    return `
      <div class="relative pr-14">
        <div class="w-10 h-10 rounded-2xl ${colorClass} flex items-center justify-center absolute right-1 top-1 shadow-md z-10">
          <i class="fa-solid ${icon}"></i>
        </div>
        <div class="bg-slate-50 hover:bg-slate-100/80 transition p-4 rounded-2xl border border-slate-200/80">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-bold text-slate-400">المرحلة ${idx + 1}</span>
          </div>
          <h4 class="font-extrabold text-slate-900 text-sm sm:text-base mt-0.5">${title}</h4>
          ${detailsHtml}
        </div>
      </div>
    `;
  }).join("");

  loadDestinationAutoGuide(b.city);
  initAIChat(b);
}

async function loadDestinationAutoGuide(cityName) {
  document.getElementById("guide-city-name").textContent = cityName;
  document.getElementById("halal-city-title").textContent = cityName;

  const matchedKey = Object.keys(DESTINATION_DB).find(k => cityName.includes(k) || k.includes(cityName));
  const info = matchedKey ? DESTINATION_DB[matchedKey] : {
    lat: null,
    lon: null,
    country: cityName,
    plugType: "Type C / Type F (قياسي دولي)",
    voltage: "220V - 240V / 50Hz",
    plugNote: "يُنصح باصطحاب محول كهرباء عالمي متعدد الرؤوس (Universal Travel Adapter) لضمان توافق جميع الأجهزة.",
    halalRestaurants: [
      { name: `مطعم الشرق الحلال - ${cityName}`, rating: "4.9", cuisine: "مأكولات عربية ومشويات", area: "وسط المدينة" },
      { name: `مطعم السلطان التركي - ${cityName}`, rating: "4.8", cuisine: "كباب ومأكولات تركية", area: "الحي السياحي" },
      { name: `مطعم الأندلس - ${cityName}`, rating: "4.8", cuisine: "مأكولات متوسطية حلال", area: "المركز" },
      { name: `مطعم تاج محل الحلال - ${cityName}`, rating: "4.7", cuisine: "مطبخ هندي وباكستاني", area: "شارع التسوق" },
      { name: `مطعم الشام الذهبي - ${cityName}`, rating: "4.7", cuisine: "شاورما ومقبلات شامية", area: "قرب الفنادق" }
    ],
    attractions: [
      { name: `البلدة القديمة في ${cityName}`, desc: "استكشاف التاريخ والأسواق الشعبية والمباني الأثرية." },
      { name: `المتحف الوطني في ${cityName}`, desc: "التعرف على ثقافة وتاريخ المنطقة." },
      { name: `الحديقة المركزية والممشى السياحي`, desc: "أجواء طبيعية رائعة ومقاهي مطلة." },
      { name: `سوق ${cityName} المركزي`, desc: "أفضل مكان لشراء الهدايا التذكارية والمنتجات المحلية." }
    ]
  };

  document.getElementById("plug-country").textContent = info.country;
  document.getElementById("plug-type-badge").textContent = `${info.plugType} | ${info.voltage}`;
  document.getElementById("plug-details").textContent = info.plugNote;

  document.getElementById("halal-restaurants-list").innerHTML = info.halalRestaurants.map((r, i) => `
    <div class="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 flex items-start justify-between gap-2">
      <div>
        <div class="flex items-center gap-1.5">
          <span class="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">${i + 1}</span>
          <h5 class="font-extrabold text-slate-900 text-xs sm:text-sm">${r.name}</h5>
        </div>
        <p class="text-xs text-slate-500 mt-1">${r.cuisine} • <span class="text-slate-700 font-semibold">${r.area}</span></p>
      </div>
      <span class="bg-amber-100 text-amber-900 font-extrabold text-xs px-2 py-1 rounded-lg shrink-0">
        ⭐ ${r.rating}
      </span>
    </div>
  `).join("");

  document.getElementById("attractions-list").innerHTML = info.attractions.map(a => `
    <div class="p-3.5 rounded-2xl border border-purple-100 bg-purple-50/40">
      <h5 class="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
        <i class="fa-solid fa-location-pin text-purple-600"></i> ${a.name}
      </h5>
      <p class="text-xs text-slate-600 mt-1">${a.desc}</p>
    </div>
  `).join("");

  await fetch5DayWeather(cityName, info.lat, info.lon);
}

async function fetch5DayWeather(cityName, lat, lon) {
  const weatherContainer = document.getElementById("weather-cards");
  weatherContainer.innerHTML = `<div class="col-span-full text-center py-6 text-xs text-slate-500"><i class="fa-solid fa-spinner fa-spin ml-2"></i> جاري جلب حالة الطقس الحية لـ 5 أيام...</div>`;

  try {
    let latitude = lat;
    let longitude = lon;

    if (!latitude || !longitude) {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ar&format=json`);
      const geoData = await geoRes.json();
      if (geoData.results && geoData.results.length > 0) {
        latitude = geoData.results[0].latitude;
        longitude = geoData.results[0].longitude;
      }
    }

    if (latitude && longitude) {
      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`);
      const wData = await wRes.json();

      const daysAr = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      currentWeatherSummary = [];

      weatherContainer.innerHTML = wData.daily.time.map((dateStr, idx) => {
        const d = new Date(dateStr);
        const dayName = idx === 0 ? "اليوم" : idx === 1 ? "غداً" : daysAr[d.getDay()];
        const maxT = Math.round(wData.daily.temperature_2m_max[idx]);
        const minT = Math.round(wData.daily.temperature_2m_min[idx]);
        const code = wData.daily.weathercode[idx];
        const { icon, desc } = mapWeatherCode(code);

        currentWeatherSummary.push(`${dayName} (${dateStr}): ${desc}، العظمى ${maxT}° والصغرى ${minT}°`);

        return `
          <div class="bg-gradient-to-b from-blue-50 to-slate-50 border border-blue-100 rounded-2xl p-3 text-center">
            <div class="text-xs font-extrabold text-slate-800">${dayName}</div>
            <div class="text-[10px] text-slate-400 mb-2">${dateStr}</div>
            <div class="text-2xl my-1">${icon}</div>
            <div class="text-[11px] font-bold text-slate-600 mb-1">${desc}</div>
            <div class="text-xs font-extrabold text-slate-900">
              <span class="text-amber-600">${maxT}°</span> / <span class="text-blue-600">${minT}°</span>
            </div>
          </div>
        `;
      }).join("");
      return;
    }
  } catch (err) {
    console.warn("Weather API fallback used", err);
  }

  const fallbackDays = [
    { day: "اليوم", icon: "☀️", desc: "مشمس لطيف", max: 23, min: 14 },
    { day: "غداً", icon: "⛅", desc: "غائم جزئياً", max: 21, min: 13 },
    { day: "بعد غد", icon: "☀️", desc: "صافي ومعتدل", max: 24, min: 15 },
    { day: "اليوم 4", icon: "🌤️", desc: "مشمس", max: 22, min: 14 },
    { day: "اليوم 5", icon: "⛅", desc: "نسيم عليل", max: 20, min: 12 }
  ];
  currentWeatherSummary = fallbackDays.map(f => `${f.day}: ${f.desc} (${f.max}°/${f.min}°)`);
  weatherContainer.innerHTML = fallbackDays.map(f => `
    <div class="bg-gradient-to-b from-blue-50 to-slate-50 border border-blue-100 rounded-2xl p-3 text-center">
      <div class="text-xs font-extrabold text-slate-800 mb-2">${f.day}</div>
      <div class="text-2xl my-1">${f.icon}</div>
      <div class="text-[11px] font-bold text-slate-600 mb-1">${f.desc}</div>
      <div class="text-xs font-extrabold text-slate-900">
        <span class="text-amber-600">${f.max}°</span> / <span class="text-blue-600">${f.min}°</span>
      </div>
    </div>
  `).join("");
}

function mapWeatherCode(code) {
  if (code === 0) return { icon: "☀️", desc: "سماء صافية" };
  if (code <= 3) return { icon: "⛅", desc: "غائم جزئياً" };
  if (code <= 48) return { icon: "🌫️", desc: "ضباب خفيف" };
  if (code <= 67) return { icon: "🌧️", desc: "أمطار خفيفة" };
  if (code <= 77) return { icon: "❄️", desc: "ثلوج" };
  return { icon: "🌦️", desc: "زخات متفرقة" };
}

// ==================== SMART AI ASSISTANT ====================

function initAIChat(b) {
  const chatBox = document.getElementById("ai-chat-messages");
  chatBox.innerHTML = `
    <div class="flex items-start gap-2.5">
      <div class="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center text-xs shrink-0 mt-1">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="bg-white p-3.5 rounded-2xl rounded-tr-none shadow-sm border border-slate-200/70 text-xs sm:text-sm text-slate-700 leading-relaxed">
        أهلاً بك <strong>${escapeHtml(b.firstName)}</strong>! 👋<br/>
        أنا مساعدك الشخصي من <strong>Nadlantours</strong>. لقد جلبت كامل تفاصيل حجزك رقم <span class="font-mono font-bold text-blue-700">${b.pnr}</span> إلى <strong>${escapeHtml(b.city)}</strong> من قاعدة البيانات.<br/>
        اسألني عن مواعيد طيرانك، فنادقك، التوصيلات، حالة الطقس، فيوز الكهرباء، أو أفضل المطاعم الحلال!
      </div>
    </div>
  `;
}

document.getElementById("ai-chat-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const input = document.getElementById("ai-chat-input");
  const q = input.value.trim();
  if (!q) return;
  input.value = "";
  handleAIQuestion(q);
});

function askQuickQuestion(q) {
  handleAIQuestion(q);
}

function handleAIQuestion(question) {
  const chatBox = document.getElementById("ai-chat-messages");

  chatBox.innerHTML += `
    <div class="flex items-start justify-end gap-2.5">
      <div class="bg-amber-500 text-slate-950 font-semibold p-3.5 rounded-2xl rounded-tl-none shadow-sm text-xs sm:text-sm max-w-[85%]">
        ${escapeHtml(question)}
      </div>
    </div>
  `;
  chatBox.scrollTop = chatBox.scrollHeight;

  setTimeout(() => {
    const reply = generateSmartAIReply(question, currentCustomerBooking);
    chatBox.innerHTML += `
      <div class="flex items-start gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center text-xs shrink-0 mt-1">
          <i class="fa-solid fa-robot"></i>
        </div>
        <div class="bg-white p-3.5 rounded-2xl rounded-tr-none shadow-sm border border-slate-200/70 text-xs sm:text-sm text-slate-700 leading-relaxed max-w-[88%] whitespace-pre-line">
          ${reply}
        </div>
      </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 450);
}

function generateSmartAIReply(q, b) {
  if (!b) return "يرجى تسجيل الدخول أولاً برقم الحجز لأتمكن من مساعدتك.";
  const text = q.toLowerCase();
  const matchedKey = Object.keys(DESTINATION_DB).find(k => b.city.includes(k) || k.includes(b.city));
  const destInfo = matchedKey ? DESTINATION_DB[matchedKey] : null;

  if (text.includes("طيران") || text.includes("رحل") || text.includes("مطار") || text.includes("موعد")) {
    const flights = b.itinerary.filter(s => s.type === "flight");
    if (flights.length === 0) return "لا توجد رحلات طيران مسجلة في هذا البرنامج.";
    return "✈️ إليك تفاصيل رحلات الطيران في برنامجك:\n\n" + flights.map((f, i) =>
      `${i + 1}. من **${f.from}** إلى **${f.to}**\n   📅 الموعد: ${f.date}${f.notes ? `\n   ℹ️ ${f.notes}` : ""}`
    ).join("\n\n");
  }

  if (text.includes("فندق") || text.includes("فنادق") || text.includes("اقام") || text.includes("إقام") || text.includes("نجم")) {
    const hotels = b.itinerary.filter(s => s.type === "hotel");
    if (hotels.length === 0) return "لا توجد فنادق مسجلة في هذا البرنامج.";
    return "🏨 إليك تفاصيل الفنادق المحجوزة لك:\n\n" + hotels.map((h, i) =>
      `${i + 1}. **${h.hotelName}** (${h.stars})\n   🍽️ نوع الإقامة: ${h.boardType}${h.notes ? `\n   🛏️ ${h.notes}` : ""}`
    ).join("\n\n");
  }

  if (text.includes("توصيل") || text.includes("سيار") || text.includes("نقل") || text.includes("سائق")) {
    const transfers = b.itinerary.filter(s => s.type === "transfer");
    if (transfers.length === 0) return "لا توجد خدمات توصيل مسجلة في برنامجك الحالي.";
    return "🚗 إليك تفاصيل التوصيلات الخاصة بك:\n\n" + transfers.map((t, i) =>
      `${i + 1}. من **${t.from}** إلى **${t.to}**\n   🕒 الموعد: ${t.date}${t.notes ? `\n   🚘 ${t.notes}` : ""}`
    ).join("\n\n");
  }

  if (text.includes("طقس") || text.includes("جو") || text.includes("حرار") || text.includes("ملابس") || text.includes("البس")) {
    const summary = currentWeatherSummary.length ? currentWeatherSummary.join("\n• ") : "الطقس معتدل ولطيف خلال الأيام القادمة.";
    return `🌤️ حالة الطقس المتوقعة في **${b.city}** لـ 5 أيام:\n\n• ${summary}\n\n💡 نصيحة الملابس: يُنصح باصطحاب ملابس مريحة للمشي نهاراً مع سترة خفيفة للمساء.`;
  }

  if (text.includes("فيوز") || text.includes("كهرب") || text.includes("شاحن") || text.includes("محول")) {
    if (destInfo) {
      return `🔌 معلومات الكهرباء في **${destInfo.country}** (${b.city}):\n• نوع الفيش: **${destInfo.plugType}**\n• الجهد الكهربائي: **${destInfo.voltage}**\n• ملاحظة: ${destInfo.plugNote}`;
    }
    return `🔌 في **${b.city}** الجهد الكهربائي القياسي هو 220-240 فولت. يُفضل اصطحاب محول سفر عالمي (Universal Adapter).`;
  }

  if (text.includes("حلال") || text.includes("مطعم") || text.includes("مطاعم") || text.includes("اكل") || text.includes("أكل")) {
    if (destInfo) {
      return `🍽️ أفضل 5 مطاعم حلال بتقييم عالي في **${b.city}**:\n\n` + destInfo.halalRestaurants.map((r, i) =>
        `${i + 1}. **${r.name}** (⭐ ${r.rating}) - ${r.cuisine} في منطقة ${r.area}`
      ).join("\n");
    }
    return `🍽️ تتوفر عدة مطاعم حلال مميزة في وسط مدينة **${b.city}**، وقد عرضنا لك أفضل 5 خيارات في دليل الوجهة.`;
  }

  if (text.includes("سعر") || text.includes("تكلف") || text.includes("شروط") || text.includes("حقيب") || text.includes("شنط")) {
    return `💰 السعر الإجمالي لبرنامجك هو **${b.price} ${b.currency}**.\n\n📋 شروط الحجز:\n${b.terms}`;
  }

  return `بكل سرور يا **${b.firstName}**! 🌟\nأنت مسافر إلى **${b.city}** ضمن حجز رقم **${b.pnr}** (يشمل ${b.itinerary.length} محطات بين طيران وفنادق وتوصيلات).\n\nيمكنني إعطاؤك تفاصيل دقيقة إذا سألتني عن:\n• مواعيد الطيران أو التوصيلات\n• أسماء الفنادق ونوع الإقامة\n• حالة الطقس والملابس المناسبة\n• فيوز الكهرباء أو أفضل المطاعم الحلال في ${b.city}.`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

initApp();
