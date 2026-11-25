// ==================== DATA & KNOWLEDGE BASE ====================

const API_BASE = "/api";

const DESTINATION_DB = {};

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
    { type: "flight", from: "", to: "", date: "", notes: "", flightFileName: "", flightFileMime: "", flightFileData: "" },
    { type: "hotel", hotelName: "", stars: "5 نجوم", boardType: "إفطار فقط (BB)", notes: "", voucherFileName: "", voucherFileMime: "", voucherFileData: "" },
    { type: "transfer", from: "", to: "", date: "", notes: "", voucherFileName: "", voucherFileMime: "", voucherFileData: "" },
    { type: "hotel", hotelName: "", stars: "5 نجوم", boardType: "نصف إقامة (HB)", notes: "", voucherFileName: "", voucherFileMime: "", voucherFileData: "" },
    { type: "flight", from: "", to: "", date: "", notes: "", flightFileName: "", flightFileMime: "", flightFileData: "" }
  ];
  renderBuilderSteps();
}

function addItineraryStep(type) {
  if (type === "flight") {
    builderSteps.push({ type: "flight", from: "", to: "", date: "", notes: "", flightFileName: "", flightFileMime: "", flightFileData: "" });
  } else if (type === "hotel") {
    builderSteps.push({ type: "hotel", hotelName: "", stars: "4 نجوم", boardType: "إفطار فقط (BB)", notes: "", voucherFileName: "", voucherFileMime: "", voucherFileData: "" });
  } else if (type === "transfer") {
    builderSteps.push({ type: "transfer", from: "", to: "", date: "", notes: "", voucherFileName: "", voucherFileMime: "", voucherFileData: "" });
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
      const attachedBadge = step.flightFileName
        ? `<span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1"><i class="fa-solid fa-file-pdf"></i> ${escapeHtml(step.flightFileName)}</span>`
        : `<span class="text-[11px] text-slate-400">ارفع PDF أو صورة ليتم تعبئة التفاصيل تلقائياً</span>`;
      fieldsHtml = `
        <div class="mt-3 p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="space-y-0.5">
            <div class="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
              <i class="fa-solid fa-wand-magic-sparkles text-blue-600"></i>
              <span>استخراج تلقائي من ملف PDF أو صورة تذكرة الطيران</span>
            </div>
            <div id="flight-upload-status-${idx}">${attachedBadge}</div>
          </div>
          <label class="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5 shrink-0 shadow-sm">
            <i class="fa-solid fa-upload"></i>
            <span>رفع ملف الطيران</span>
            <input type="file" accept=".pdf,image/*" class="hidden" onchange="handleFlightFileUpload(${idx}, this)" />
          </label>
        </div>
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
      const hotelVoucherBadge = step.voucherFileName
        ? `<span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1"><i class="fa-solid fa-file-pdf"></i> ${escapeHtml(step.voucherFileName)}</span>`
        : `<span class="text-[11px] text-slate-400">ارفع PDF أو صورة فاوشر الفندق لتعبئة التفاصيل تلقائياً</span>`;
      fieldsHtml = `
        <div class="mt-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="space-y-0.5">
            <div class="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
              <i class="fa-solid fa-wand-magic-sparkles text-amber-600"></i>
              <span>استخراج تلقائي من ملف PDF أو صورة فاوشر الفندق</span>
            </div>
            <div id="voucher-upload-status-${idx}">${hotelVoucherBadge}</div>
          </div>
          <label class="cursor-pointer bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5 shrink-0 shadow-sm">
            <i class="fa-solid fa-upload"></i>
            <span>رفع فاوشر الفندق</span>
            <input type="file" accept=".pdf,image/*" class="hidden" onchange="handleVoucherFileUpload(${idx}, 'hotel', this)" />
          </label>
        </div>
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
      const transferVoucherBadge = step.voucherFileName
        ? `<span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1"><i class="fa-solid fa-file-pdf"></i> ${escapeHtml(step.voucherFileName)}</span>`
        : `<span class="text-[11px] text-slate-400">ارفع PDF أو صورة فاوشر المواصلات لتعبئة التفاصيل تلقائياً</span>`;
      fieldsHtml = `
        <div class="mt-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="space-y-0.5">
            <div class="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
              <i class="fa-solid fa-wand-magic-sparkles text-emerald-600"></i>
              <span>استخراج تلقائي من ملف PDF أو صورة فاوشر المواصلات</span>
            </div>
            <div id="voucher-upload-status-${idx}">${transferVoucherBadge}</div>
          </div>
          <label class="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5 shrink-0 shadow-sm">
            <i class="fa-solid fa-upload"></i>
            <span>رفع فاوشر المواصلات</span>
            <input type="file" accept=".pdf,image/*" class="hidden" onchange="handleVoucherFileUpload(${idx}, 'transfer', this)" />
          </label>
        </div>
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
  const msg = `مرحباً ${b.firstName} ${b.lastName} ✈️
تم تأكيد برنامجك السياحي عبر *Nadlantours* لوجهة *${b.city}*.

بيانات الدخول لاستعراض برنامجك والطقس والمطاعم الحلال:
• رقم الحجز (PNR): *${b.pnr}*
• اسم العائلة: *${b.lastName}*

نتمنى لك رحلة سعيدة! 🌍`;
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
      const downloadBtnHtml = step.flightFileData
        ? `<div class="mt-3">
             <button type="button" onclick="downloadFlightAttachment(${idx})" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition inline-flex items-center gap-2 shadow-sm">
               <i class="fa-solid fa-file-arrow-down"></i>
               <span>تحميل ملف الطيران (${escapeHtml(step.flightFileName || 'تذكرة الطيران')})</span>
             </button>
           </div>`
        : "";
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
        ${downloadBtnHtml}
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
        ${step.voucherFileData ? `<div class="mt-3"><button type="button" onclick="downloadVoucherAttachment(${idx})" class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition inline-flex items-center gap-2 shadow-sm"><i class="fa-solid fa-file-arrow-down"></i><span>تحميل فاوشر الفندق (${escapeHtml(step.voucherFileName || 'voucher-hotel')})</span></button></div>` : ""}
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
        ${step.voucherFileData ? `<div class="mt-3"><button type="button" onclick="downloadVoucherAttachment(${idx})" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition inline-flex items-center gap-2 shadow-sm"><i class="fa-solid fa-file-arrow-down"></i><span>تحميل فاوشر المواصلات (${escapeHtml(step.voucherFileName || 'voucher-transfer')})</span></button></div>` : ""}
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

const autoGuideCache = {};

function renderRestaurantsCards(restaurants) {
  document.getElementById("halal-restaurants-list").innerHTML = restaurants.map((r, i) => `
    <div class="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 flex items-start justify-between gap-2">
      <div>
        <div class="flex items-center gap-1.5">
          <span class="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">${i + 1}</span>
          <h5 class="font-extrabold text-slate-900 text-xs sm:text-sm">${escapeHtml(r.name)}</h5>
        </div>
        <p class="text-xs text-slate-500 mt-1">${escapeHtml(r.cuisine)} • <span class="text-slate-700 font-semibold">${escapeHtml(r.area)}</span></p>
      </div>
      <span class="bg-amber-100 text-amber-900 font-extrabold text-xs px-2 py-1 rounded-lg shrink-0">
        ⭐ ${escapeHtml(r.rating)}
      </span>
    </div>
  `).join("");
}

function renderAttractionsCards(attractions) {
  document.getElementById("attractions-list").innerHTML = attractions.map(a => `
    <div class="p-3.5 rounded-2xl border border-purple-100 bg-purple-50/40">
      <h5 class="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
        <i class="fa-solid fa-location-pin text-purple-600"></i> ${escapeHtml(a.name)}
      </h5>
      <p class="text-xs text-slate-600 mt-1">${escapeHtml(a.desc)}</p>
    </div>
  `).join("");
}

function extractJsonObjectFromText(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json\s*|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}

async function fetchAutoDestinationFromAI(cityName) {
  const prompt = `أعطني معلومات سياحية دقيقة وحقيقية لمدينة "${cityName}" بصيغة JSON فقط بدون أي نص إضافي أو شرح خارج JSON.
المطلوب:
- "country": اسم الدولة بالعربية
- "plugType": نوع الفيش الكهربائي (مثل Type C / Type F أو Type G)
- "voltage": الجهد والتردد (مثل 230V / 50Hz)
- "plugNote": ملاحظة مختصرة وعملية عن الفيش والمحول بالعربية
- "halalRestaurants": مصفوفة من 5 مطاعم حلال حقيقية ومشهورة فعلياً في "${cityName}" (لا تخترع أسماء وهمية، وإن لم تتأكد من مطاعم حلال معروفة فاذكر مطاعم حقيقية ومعروفة في المدينة مع توضيح نوع المطبخ)، كل عنصر يحتوي على: {"name": "...", "rating": "4.8", "cuisine": "...", "area": "..."}
- "attractions": مصفوفة من 4 معالم أو مناطق سياحية حقيقية ومشهورة في "${cityName}"، كل عنصر يحتوي على: {"name": "...", "desc": "..."}`;

  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: prompt,
      booking: { ...(currentCustomerBooking || {}), city: cityName },
      weatherSummary: currentWeatherSummary,
      history: []
    })
  });

  if (!res.ok) throw new Error("AI guide request failed");
  const data = await res.json();
  const parsed = extractJsonObjectFromText(data?.reply || "");
  if (!parsed || !Array.isArray(parsed.halalRestaurants) || parsed.halalRestaurants.length === 0) {
    throw new Error("Invalid AI JSON payload");
  }
  return parsed;
}

async function loadDestinationAutoGuide(cityName) {
  document.getElementById("guide-city-name").textContent = cityName;
  document.getElementById("halal-city-title").textContent = cityName;

  const defaultPlug = {
    lat: null,
    lon: null,
    country: cityName,
    plugType: "Type C / Type F (قياسي دولي)",
    voltage: "220V - 240V / 50Hz",
    plugNote: "يُنصح باصطحاب محول كهرباء عالمي متعدد الرؤوس (Universal Travel Adapter) لضمان توافق جميع الأجهزة."
  };

  document.getElementById("plug-country").textContent = defaultPlug.country;
  document.getElementById("plug-type-badge").textContent = `${defaultPlug.plugType} | ${defaultPlug.voltage}`;
  document.getElementById("plug-details").textContent = defaultPlug.plugNote;

  const restContainer = document.getElementById("halal-restaurants-list");
  const attrContainer = document.getElementById("attractions-list");

  if (autoGuideCache[cityName]) {
    const cached = autoGuideCache[cityName];
    document.getElementById("plug-country").textContent = cached.country || cityName;
    document.getElementById("plug-type-badge").textContent = `${cached.plugType || defaultPlug.plugType} | ${cached.voltage || defaultPlug.voltage}`;
    document.getElementById("plug-details").textContent = cached.plugNote || defaultPlug.plugNote;
    renderRestaurantsCards((cached.halalRestaurants || []).slice(0, 5));
    renderAttractionsCards((cached.attractions || []).slice(0, 4));
  } else {
    restContainer.innerHTML = `<div class="text-center py-6 text-xs text-slate-500"><i class="fa-solid fa-spinner fa-spin ml-2"></i> جاري البحث أوتوماتيكياً عن مطاعم حقيقية في ${escapeHtml(cityName)}...</div>`;
    attrContainer.innerHTML = `<div class="text-center py-6 text-xs text-slate-500"><i class="fa-solid fa-spinner fa-spin ml-2"></i> جاري جلب أبرز المناطق السياحية في ${escapeHtml(cityName)}...</div>`;

    try {
      const aiGuide = await fetchAutoDestinationFromAI(cityName);
      autoGuideCache[cityName] = aiGuide;

      document.getElementById("plug-country").textContent = aiGuide.country || cityName;
      document.getElementById("plug-type-badge").textContent = `${aiGuide.plugType || defaultPlug.plugType} | ${aiGuide.voltage || defaultPlug.voltage}`;
      document.getElementById("plug-details").textContent = aiGuide.plugNote || defaultPlug.plugNote;

      renderRestaurantsCards((aiGuide.halalRestaurants || []).slice(0, 5));
      renderAttractionsCards((aiGuide.attractions || []).slice(0, 4));
    } catch (err) {
      console.warn("Auto AI destination guide fallback:", err);
      restContainer.innerHTML = `<div class="text-center py-4 text-xs text-slate-500">تعذر جلب قائمة تلقائية لـ ${escapeHtml(cityName)} حالياً. يمكنك سؤال المساعد الذكي مباشرة للحصول على مطاعم مؤكدة.</div>`;
      attrContainer.innerHTML = `<div class="text-center py-4 text-xs text-slate-500">تعذر جلب المعالم تلقائياً لـ ${escapeHtml(cityName)} حالياً. يمكنك سؤال المساعد الذكي مباشرة.</div>`;
    }
  }

  await fetch5DayWeather(cityName, null, null);
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

// ==================== SMART AI ASSISTANT (GEMINI API) ====================

let aiChatHistory = [];

function initAIChat(b) {
  aiChatHistory = [];
  const chatBox = document.getElementById("ai-chat-messages");
  chatBox.innerHTML = `
    <div class="flex items-start gap-2.5">
      <div class="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center text-xs shrink-0 mt-1">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="bg-white p-3.5 rounded-2xl rounded-tr-none shadow-sm border border-slate-200/70 text-xs sm:text-sm text-slate-700 leading-relaxed">
        أهلاً بك <strong>${escapeHtml(b.firstName)}</strong>! 👋<br/>
        أنا مساعد السفر الذكي من <strong>Nadlantours</strong> المدعوم بالذكاء الاصطناعي. أرى تفاصيل حجزك <span class="font-mono font-bold text-blue-700">${b.pnr}</span> إلى <strong>${escapeHtml(b.city)}</strong> ويمكنني مساعدتك في <strong>أي شيء يخص السفر</strong>: بناء جداول يومية، اقتراح أماكن ومطاعم، مواصلات، ميزانية، نصائح سفر، أو أسئلة حول رحلتك!
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

function formatMarkdownText(raw) {
  const escaped = escapeHtml(raw);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
}

async function handleAIQuestion(question) {
  const chatBox = document.getElementById("ai-chat-messages");
  const sendBtn = document.querySelector("#ai-chat-form button[type='submit']");

  chatBox.innerHTML += `
    <div class="flex items-start justify-end gap-2.5">
      <div class="bg-amber-500 text-slate-950 font-semibold p-3.5 rounded-2xl rounded-tl-none shadow-sm text-xs sm:text-sm max-w-[85%]">
        ${escapeHtml(question)}
      </div>
    </div>
  `;

  const typingId = "ai-typing-" + Date.now();
  chatBox.innerHTML += `
    <div id="${typingId}" class="flex items-start gap-2.5">
      <div class="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center text-xs shrink-0 mt-1">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="bg-white p-3.5 rounded-2xl rounded-tr-none shadow-sm border border-slate-200/70 text-xs text-slate-500 flex items-center gap-2">
        <i class="fa-solid fa-sparkles fa-spin text-amber-500"></i>
        <span>يفكر الذكاء الاصطناعي في إجابتك...</span>
      </div>
    </div>
  `;
  chatBox.scrollTop = chatBox.scrollHeight;
  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: question,
        booking: currentCustomerBooking,
        weatherSummary: currentWeatherSummary,
        history: aiChatHistory
      })
    });

    const data = await res.json();
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    const replyText = res.ok && data.reply
      ? data.reply
      : (data.error || "عذراً، حدث خطأ أثناء التواصل مع الذكاء الاصطناعي.");

    aiChatHistory.push({ role: "user", text: question });
    aiChatHistory.push({ role: "model", text: replyText });

    chatBox.innerHTML += `
      <div class="flex items-start gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center text-xs shrink-0 mt-1">
          <i class="fa-solid fa-robot"></i>
        </div>
        <div class="bg-white p-3.5 rounded-2xl rounded-tr-none shadow-sm border border-slate-200/70 text-xs sm:text-sm text-slate-700 leading-relaxed max-w-[88%] whitespace-pre-line">
          ${formatMarkdownText(replyText)}
        </div>
      </div>
    `;
  } catch (err) {
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    chatBox.innerHTML += `
      <div class="flex items-start gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center text-xs shrink-0 mt-1">
          <i class="fa-solid fa-robot"></i>
        </div>
        <div class="bg-red-50 p-3.5 rounded-2xl rounded-tr-none border border-red-200 text-xs text-red-700">
          تعذر الاتصال بالسيرفر. تأكد من تشغيل التطبيق بشكل صحيح.
        </div>
      </div>
    `;
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function applyPassengersToBookingForm(passengers) {
  if (!Array.isArray(passengers) || passengers.length === 0) return;

  const firstInput = document.getElementById("b-firstname");
  const lastInput = document.getElementById("b-lastname");
  const termsInput = document.getElementById("b-terms");

  const leadPassenger = passengers[0].trim();
  if (firstInput && !firstInput.value.trim() && leadPassenger) {
    const parts = leadPassenger.split(/\s+/);
    firstInput.value = parts[0] || leadPassenger;
    if (lastInput && !lastInput.value.trim() && parts.length > 1) {
      lastInput.value = parts.slice(1).join(" ");
    }
  }

  if (termsInput) {
    const paxLine = `• المسافرون: ${passengers.join("، ")}`;
    if (!termsInput.value.includes(paxLine)) {
      termsInput.value = termsInput.value.trim()
        ? `${termsInput.value.trim()}\n${paxLine}`
        : paxLine;
    }
  }
}

async function handleFlightFileUpload(stepIndex, inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    alert("حجم الملف كبير جداً. يُرجى اختيار ملف أصغر من 10MB.");
    inputEl.value = "";
    return;
  }

  const statusEl = document.getElementById(`flight-upload-status-${stepIndex}`);
  if (statusEl) {
    statusEl.innerHTML = `<span class="text-[11px] font-bold text-blue-700"><i class="fa-solid fa-spinner fa-spin ml-1"></i> جاري قراءة المسافرين وتفاصيل الذهاب والعودة أوتوماتيكياً...</span>`;
  }

  try {
    const mimeType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    const base64Data = await readFileAsBase64(file);

    builderSteps[stepIndex].flightFileName = file.name;
    builderSteps[stepIndex].flightFileMime = mimeType;
    builderSteps[stepIndex].flightFileData = base64Data;

    const res = await fetch(`${API_BASE}/ai/extract-flight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType,
        base64Data
      })
    });

    const data = await res.json();
    if (res.ok && data.outbound) {
      const out = data.outbound;
      if (out.from) builderSteps[stepIndex].from = out.from;
      if (out.to) builderSteps[stepIndex].to = out.to;
      if (out.date) builderSteps[stepIndex].date = out.date;
      if (out.notes) builderSteps[stepIndex].notes = out.notes;

      if (Array.isArray(data.passengers) && data.passengers.length > 0) {
        builderSteps[stepIndex].passengers = data.passengers;
        applyPassengersToBookingForm(data.passengers);
      }

      if (data.returnFlight && data.returnFlight.hasReturn) {
        const ret = data.returnFlight;
        const returnStepPayload = {
          type: "flight",
          from: ret.from || out.to || "",
          to: ret.to || out.from || "",
          date: ret.date || "",
          notes: ret.notes || "",
          passengers: data.passengers || [],
          flightFileName: file.name,
          flightFileMime: mimeType,
          flightFileData: base64Data
        };

        const existingReturnIdx = builderSteps.findIndex((s, i) => i > stepIndex && s.type === "flight");
        if (existingReturnIdx !== -1) {
          builderSteps[existingReturnIdx] = {
            ...builderSteps[existingReturnIdx],
            ...returnStepPayload
          };
        } else {
          builderSteps.push(returnStepPayload);
        }
      }

      renderBuilderSteps();
    } else {
      renderBuilderSteps();
      alert(data.error || "تم حفظ الملف لكن تعذر استخراج التفاصيل تلقائياً، يمكنك تعبئتها يدوياً.");
    }
  } catch (err) {
    console.error("Flight upload error:", err);
    renderBuilderSteps();
    alert("حدث خطأ أثناء رفع ملف الطيران.");
  }
}

function downloadFlightAttachment(stepIndex) {
  const step = currentCustomerBooking?.itinerary?.[stepIndex];
  if (!step || !step.flightFileData) return;

  const mime = step.flightFileMime || "application/pdf";
  const link = document.createElement("a");
  link.href = `data:${mime};base64,${step.flightFileData}`;
  link.download = step.flightFileName || (mime.includes("pdf") ? "flight-ticket.pdf" : "flight-ticket.jpg");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function handleVoucherFileUpload(stepIndex, voucherType, inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    alert("حجم الملف كبير جداً. يُرجى اختيار ملف أصغر من 10MB.");
    inputEl.value = "";
    return;
  }

  const statusEl = document.getElementById(`voucher-upload-status-${stepIndex}`);
  if (statusEl) {
    statusEl.innerHTML = `<span class="text-[11px] font-bold text-emerald-700"><i class="fa-solid fa-spinner fa-spin ml-1"></i> جاري قراءة بيانات الفاوشر أوتوماتيكياً...</span>`;
  }

  try {
    const mimeType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    const base64Data = await readFileAsBase64(file);

    builderSteps[stepIndex].voucherFileName = file.name;
    builderSteps[stepIndex].voucherFileMime = mimeType;
    builderSteps[stepIndex].voucherFileData = base64Data;

    const res = await fetch(`${API_BASE}/ai/extract-voucher`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType,
        base64Data,
        voucherType
      })
    });

    const data = await res.json();
    if (res.ok && data.voucher) {
      const v = data.voucher;
      if (voucherType === "hotel") {
        if (v.hotelName) builderSteps[stepIndex].hotelName = v.hotelName;
        if (v.stars) builderSteps[stepIndex].stars = v.stars;
        if (v.boardType) builderSteps[stepIndex].boardType = v.boardType;
        if (v.notes) builderSteps[stepIndex].notes = v.notes;
      } else {
        if (v.from) builderSteps[stepIndex].from = v.from;
        if (v.to) builderSteps[stepIndex].to = v.to;
        if (v.date) builderSteps[stepIndex].date = v.date;
        if (v.notes) builderSteps[stepIndex].notes = v.notes;
      }

      if (Array.isArray(data.passengers) && data.passengers.length > 0) {
        applyPassengersToBookingForm(data.passengers);
      }

      renderBuilderSteps();
    } else {
      renderBuilderSteps();
      alert(data.error || "تم حفظ الفاوشر لكن تعذر استخراج التفاصيل تلقائياً، يمكنك تعبئتها يدوياً.");
    }
  } catch (err) {
    console.error("Voucher upload error:", err);
    renderBuilderSteps();
    alert("حدث خطأ أثناء رفع ملف الفاوشر.");
  }
}

function downloadVoucherAttachment(stepIndex) {
  const step = currentCustomerBooking?.itinerary?.[stepIndex];
  if (!step || !step.voucherFileData) return;

  const mime = step.voucherFileMime || "application/pdf";
  const link = document.createElement("a");
  link.href = `data:${mime};base64,${step.voucherFileData}`;
  link.download = step.voucherFileName || (mime.includes("pdf") ? "voucher.pdf" : "voucher.jpg");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
