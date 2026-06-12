/* ============================================================
   Cambodia HR — HR Management System
   app.js — Fully fixed: create / edit / delete
   ============================================================ */

'use strict';

const BASE_URL  = 'http://localhost:3333';
const TOKEN_KEY = 'cambodiahr-token';

/* ============================================================
   AUTH HELPERS
   ============================================================ */
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getTokenPayload() {
  try {
    const token = getToken();
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function isTokenValid() {
  const payload = getTokenPayload();
  if (!payload) return false;
  return Date.now() < payload.exp * 1000;
}

function redirectToLogin() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.replace('login.html');
}

/* Guard: redirect to login if no valid token */
(function guardAuth() {
  if (!isTokenValid()) redirectToLogin();
})();

/* ============================================================
   MASTER REFERENCE DATA — matches MySQL tables exactly
   ============================================================ */
const REF = {
  /*
   * Gender: GenderID must match EXACTLY what MySQL stores.
   * If your DB stores 'Male'/'Female'/'Other' use these.
   * If it stores 'M'/'F' change GenderID values below to 'M'/'F'.
   */
  genders: [
    { GenderID: 'M', GenderName: 'Male'   },
    { GenderID: 'F', GenderName: 'Female' },
  ],
  departments: [
    { DeptID: 'D01', DepartmentName: 'IT'      },
    { DeptID: 'D02', DepartmentName: 'HR'      },
    { DeptID: 'D03', DepartmentName: 'Digital' },
    { DeptID: 'D04', DepartmentName: 'Finance' },
  ],
  positions: [
    { PostID: 'P01', PositionName: 'Developer'      },
    { PostID: 'P02', PositionName: 'HR Manager'     },
    { PostID: 'P03', PositionName: 'Digital Creator'},
    { PostID: 'P04', PositionName: 'IT Support'     },
    { PostID: 'P05', PositionName: 'Accounting'     },
    { PostID: 'P06', PositionName: 'Engineer'       },
  ],
  offices: [
    { OfficeID: 'Of_001', OfficeName: 'Toul Kork'    },
    { OfficeID: 'Of_002', OfficeName: 'Sen Sok'      },
    { OfficeID: 'Of_003', OfficeName: 'Siem Reap'    },
    { OfficeID: 'Of_004', OfficeName: 'Tek Chhu'     },
    { OfficeID: 'Of_005', OfficeName: 'Chbar Ompov'  },
  ],
  divisions: [
    { DivisionID: 'Div_001', DivisionName: 'R&D'        },
    { DivisionID: 'Div_002', DivisionName: 'Finance'    },
    { DivisionID: 'Div_003', DivisionName: 'Sale'       },
    { DivisionID: 'Div_004', DivisionName: 'Technology' },
    { DivisionID: 'Div_005', DivisionName: 'Management' },
  ],
  branches: [
    { BranchID: 'Branch_001', BranchName: 'Phnom Penh'       },
    { BranchID: 'Branch_002', BranchName: 'Banteay Meanchey' },
    { BranchID: 'Branch_003', BranchName: 'Battambang'       },
    { BranchID: 'Branch_004', BranchName: 'Siem Reap'        },
    { BranchID: 'Branch_005', BranchName: 'Kampot'           },
  ],
};

/* ============================================================
   HELPERS
   ============================================================ */

/** Look up DB id from a display name, case-insensitive fallback */
function idByName(list, nameValue, idKey, nameKey) {
  if (!nameValue) return '';
  // exact match first
  let found = list.find(item => item[nameKey] === nameValue);
  // case-insensitive fallback
  if (!found) found = list.find(item => item[nameKey].toLowerCase() === String(nameValue).toLowerCase());
  return found ? found[idKey] : '';
}

/**
 * Normalise whatever the DB returns for gender into one of our GenderIDs.
 * Handles: 'Male', 'male', 'M', 'm', 'MALE', null, undefined, ''
 */
function normaliseGender(raw) {
  if (!raw) return '';
  const s = String(raw).trim().toLowerCase();
  if (s === 'male'   || s === 'm') return 'Male';
  if (s === 'female' || s === 'f') return 'Female';
  if (s === 'other'  || s === 'o') return 'Other';
  // Return as-is (capitalised) so fillSelect can still match it
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** Escape HTML to prevent XSS */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function getInitials(name) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
}

/**
 * Populate a <select> from a REF array.
 * selectedId: the value that should be pre-selected.
 */
function fillSelect(elementId, refList, idKey, nameKey, selectedId = '', placeholder = 'Select…') {
  const sel = document.getElementById(elementId);
  if (!sel) return;
  sel.innerHTML =
    `<option value="">${escHtml(placeholder)}</option>` +
    refList.map(item => {
      const val  = item[idKey];
      const label = item[nameKey];
      const selected = (val === selectedId) ? ' selected' : '';
      return `<option value="${escHtml(val)}"${selected}>${escHtml(label)}</option>`;
    }).join('');
}

/* ============================================================
   STATE
   ============================================================ */
const state = {
  employees:      [],
  filtered:       [],
  currentPage:    1,
  pageSize:       10,
  sortCol:        'EmpCode',
  sortDir:        'asc',
  search:         '',
  deptFilter:     '',
  branchFilter:   '',
  currentEditEmp: null,
  editOriginalIDs:{},
  deleteEmpCode:  null,
};

/* ============================================================
   ROUTER
   ============================================================ */
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  const labels = { dashboard:'Dashboard', employees:'Employees', create:'Add Employee', edit:'Edit Employee' };
  document.getElementById('pageBreadcrumb').textContent = labels[page] || page;

  closeMobileSidebar();

  if (page === 'dashboard') loadDashboard();
  if (page === 'employees') loadEmployeeList();
  if (page === 'create')    initCreateForm();
}

/* ============================================================
   CLOCK
   ============================================================ */
function startClock() {
  const el = document.getElementById('topbarTime');
  const tick = () => {
    const now = new Date();
    const t = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
    const d = now.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
    el.textContent = `${d} · ${t}`;
  };
  tick();
  setInterval(tick, 1000);
}

/* ============================================================
   API
   ============================================================ */
async function apiFetch(method, path, body) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(BASE_URL + path, opts);
  } catch {
    throw new Error(`Cannot reach server at ${BASE_URL}. Is it running?`);
  }

  if (res.status === 401 || res.status === 403) {
    redirectToLogin();
    return;
  }

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }

  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

const api = {
  getEmployees:   ()           => apiFetch('GET',    '/route/api/employees/list'),
  getDashboard:   ()           => apiFetch('GET',    '/route/api/employees/dashboard'),
  createEmployee: (body)       => apiFetch('POST',   '/route/api/employees/create', body),
  updateEmployee: (code, body) => apiFetch('PUT',    `/route/api/employees/update/${code}`, body),
  deleteEmployee: (code)       => apiFetch('DELETE', `/route/api/employees/delete/${code}`),
};

/* ============================================================
   TOAST
   ============================================================ */
const ICONS = {
  success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
  error:   `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  info:    `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

function showToast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${ICONS[type]}<span class="toast-msg">${escHtml(String(msg))}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ============================================================
   DASHBOARD
   ============================================================ */
async function loadDashboard() {
  try {
    const empList = await api.getEmployees();
    state.employees = Array.isArray(empList) ? empList : [];
    renderKPIs(state.employees);
    renderDeptBarChart(state.employees);
    renderDonutChart(state.employees);
    renderRecentTable(state.employees);
    document.getElementById('navBadge').textContent = state.employees.length;
  } catch (err) {
    showToast('Dashboard load failed: ' + err.message, 'error');
  }
}

function renderKPIs(employees) {
  const depts    = new Set(employees.map(e => e.DepartmentName).filter(Boolean));
  const branches = new Set(employees.map(e => e.BranchName).filter(Boolean));
  const divs     = new Set(employees.map(e => e.DivisionName).filter(Boolean));
  const offices   = new Set(employees.map(e => e.OfficeName).filter(Boolean));
  const positions = new Set(employees.map(e => e.PositionName).filter(Boolean));
  animateCount('kpiTotal',    employees.length);
  animateCount('kpiDept',     depts.size);
  animateCount('kpiBranch',   branches.size);
  animateCount('kpiDivision', divs.size);
  animateCount('kpiOffice',   offices.size);
  animateCount('kpiPosition', positions.size);
  document.querySelectorAll('.kpi-card.skeleton').forEach(c => c.classList.remove('skeleton'));
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const dur = 600;
  const step = ts => {
    if (!step.s) step.s = ts;
    const p = Math.min((ts - step.s) / dur, 1);
    el.textContent = Math.round(p * target);
    if (p < 1) requestAnimationFrame(step); else el.textContent = target;
  };
  requestAnimationFrame(step);
}

function renderDeptBarChart(employees) {
  const counts = {};
  employees.forEach(e => { if (e.DepartmentName) counts[e.DepartmentName] = (counts[e.DepartmentName]||0)+1; });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,7);
  const max = sorted[0]?.[1] || 1;
  const container = document.getElementById('deptBarChart');
  container.innerHTML = '';
  if (!sorted.length) { container.innerHTML='<div class="table-empty"><div class="empty-title">No data</div></div>'; return; }
  sorted.forEach(([name,count]) => {
    const pct = (count/max*100).toFixed(1);
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `<span class="bar-label" title="${escHtml(name)}">${escHtml(name)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:0%" data-target="${pct}%"></div></div>
      <span class="bar-count">${count}</span>`;
    container.appendChild(row);
  });
  requestAnimationFrame(() => {
    container.querySelectorAll('.bar-fill').forEach(f => setTimeout(()=>{ f.style.width=f.dataset.target; },80));
  });
}

const DONUT_COLORS = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#3b82f6','#f43f5e','#06b6d4','#ec4899'];

function renderDonutChart(employees) {
  const counts = {};
  employees.forEach(e => { if (e.BranchName) counts[e.BranchName]=(counts[e.BranchName]||0)+1; });
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const total = employees.length || 1;
  const canvas = document.getElementById('donutCanvas');
  const ctx = canvas.getContext('2d');
  const cx=100, cy=100, r=75, inner=45;
  ctx.clearRect(0,0,200,200);
  if (!entries.length) return;
  let angle = -Math.PI/2;
  entries.forEach(([,count],i) => {
    const slice = (count/total)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,angle,angle+slice); ctx.closePath();
    ctx.fillStyle = DONUT_COLORS[i%DONUT_COLORS.length]; ctx.fill();
    angle += slice;
  });
  const styles = getComputedStyle(document.documentElement);
  const hole  = styles.getPropertyValue('--donut-hole').trim() || '#1c1d28';
  const tPrim = styles.getPropertyValue('--text-primary').trim() || '#f1f2f7';
  const tMute = styles.getPropertyValue('--text-muted').trim()  || '#8b8fa8';
  ctx.beginPath(); ctx.arc(cx,cy,inner,0,Math.PI*2); ctx.fillStyle=hole; ctx.fill();
  ctx.fillStyle=tPrim; ctx.font='bold 22px DM Sans, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(total,cx,cy-6);
  ctx.fillStyle=tMute; ctx.font='11px DM Sans, sans-serif';
  ctx.fillText('total',cx,cy+12);
  const legend = document.getElementById('donutLegend');
  legend.innerHTML='';
  entries.slice(0,6).forEach(([name,count],i) => {
    const item = document.createElement('div');
    item.className='legend-item';
    item.innerHTML=`<div class="legend-dot" style="background:${DONUT_COLORS[i%DONUT_COLORS.length]}"></div>
      <span class="legend-name" title="${escHtml(name)}">${escHtml(name)}</span>
      <span class="legend-count">${count}</span>`;
    legend.appendChild(item);
  });
}

function renderRecentTable(employees) {
  const tbody = document.getElementById('recentTableBody');
  const recent = employees.slice(0,8);
  if (!recent.length) {
    tbody.innerHTML='<tr><td colspan="4"><div class="table-empty"><div class="empty-title">No employees found</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(e=>`<tr>
    <td>${escHtml(e.EmpName||'—')}</td>
    <td>${escHtml(e.DepartmentName||'—')}</td>
    <td>${escHtml(e.PositionName||'—')}</td>
    <td>${escHtml(e.OfficeName||'—')}</td>
    <td>${escHtml(e.BranchName||'—')}</td>
  </tr>`).join('');
}

/* ============================================================
   EMPLOYEE LIST
   ============================================================ */
async function loadEmployeeList() {
  setTableLoading();
  try {
    const data = await api.getEmployees();
    state.employees = Array.isArray(data) ? data : [];
    populateFilters();
    applyFiltersAndSort();
    document.getElementById('navBadge').textContent = state.employees.length;
  } catch (err) {
    showToast('Failed to load employees: ' + err.message, 'error');
    setTableError();
  }
}

function setTableLoading() {
  document.getElementById('empTableBody').innerHTML =
    `<tr><td colspan="8"><div class="table-loading"><div class="spinner"></div>Loading employees…</div></td></tr>`;
}

function setTableError() {
  document.getElementById('empTableBody').innerHTML =
    `<tr><td colspan="9"><div class="table-empty">
      <div class="empty-icon">⚠️</div>
      <div class="empty-title">Failed to load data</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Check your API server is running at ${BASE_URL}</div>
    </div></td></tr>`;
}

function populateFilters() {
  const deptSel   = document.getElementById('deptFilter');
  const branchSel = document.getElementById('branchFilter');
  const prevDept   = deptSel.value;
  const prevBranch = branchSel.value;
  const depts   = [...new Set(state.employees.map(e=>e.DepartmentName).filter(Boolean))].sort();
  const branches= [...new Set(state.employees.map(e=>e.BranchName).filter(Boolean))].sort();
  deptSel.innerHTML = '<option value="">All Departments</option>' +
    depts.map(d=>`<option value="${escHtml(d)}"${d===prevDept?' selected':''}>${escHtml(d)}</option>`).join('');
  branchSel.innerHTML = '<option value="">All Branches</option>' +
    branches.map(b=>`<option value="${escHtml(b)}"${b===prevBranch?' selected':''}>${escHtml(b)}</option>`).join('');
}

function applyFiltersAndSort() {
  let data = [...state.employees];
  if (state.search) {
    const q = state.search.toLowerCase();
    data = data.filter(e=>
      (e.EmpName||'').toLowerCase().includes(q) ||
      (e.DepartmentName||'').toLowerCase().includes(q) ||
      (e.PositionName||'').toLowerCase().includes(q) ||
      (e.BranchName||'').toLowerCase().includes(q) ||
      (e.DivisionName||'').toLowerCase().includes(q) ||
      String(e.EmpCode).includes(q)
    );
  }
  if (state.deptFilter)   data = data.filter(e=>e.DepartmentName===state.deptFilter);
  if (state.branchFilter) data = data.filter(e=>e.BranchName===state.branchFilter);
  data.sort((a,b)=>{
    const va=a[state.sortCol]??"", vb=b[state.sortCol]??"";
    if (typeof va==='number') return state.sortDir==='asc'?va-vb:vb-va;
    return state.sortDir==='asc'?String(va).localeCompare(String(vb)):String(vb).localeCompare(String(va));
  });
  state.filtered = data;
  if (state.currentPage > Math.max(1,Math.ceil(data.length/state.pageSize))) state.currentPage=1;
  document.getElementById('resultCount').textContent = data.length===state.employees.length
    ? `${data.length} employee${data.length!==1?'s':''}`
    : `${data.length} of ${state.employees.length} employees`;
  renderTable();
  renderPagination();
}

function renderTable() {
  const tbody = document.getElementById('empTableBody');
  const start = (state.currentPage-1)*state.pageSize;
  const page  = state.filtered.slice(start, start+state.pageSize);
  if (!page.length) {
    tbody.innerHTML=`<tr><td colspan="9"><div class="table-empty">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">${state.search?'No results found':'No employees yet'}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
        ${state.search?'Try a different search or clear filters.':'Add your first employee to get started.'}
      </div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = page.map(e=>{
    const initials    = getInitials(e.EmpName);
    const g           = normaliseGender(e.Gender);
    const genderClass = g==='Male'?'badge-male':g==='Female'?'badge-female':'badge-other';
    return `<tr>
      <td><span class="emp-code">#${e.EmpCode}</span></td>
      <td><div class="emp-name-cell">
        <div class="emp-avatar">${initials}</div>
        <span class="emp-fullname">${escHtml(e.EmpName||'—')}</span>
      </div></td>
      <td>${g?`<span class="badge ${genderClass}">${escHtml(g)}</span>`:'—'}</td>
      <td>${e.DepartmentName?`<span class="badge badge-dept">${escHtml(e.DepartmentName)}</span>`:'—'}</td>
      <td>${escHtml(e.PositionName||'—')}</td>
      <td>${escHtml(e.DivisionName||'—')}</td>
      <td>${escHtml(e.OfficeName||'—')}</td>
      <td>${escHtml(e.BranchName||'—')}</td>
      <td><div class="actions-cell">
        <button class="action-btn edit-btn" data-empcode="${e.EmpCode}" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="action-btn del-btn" data-empcode="${e.EmpCode}" data-empname="${escHtml(e.EmpName||'')}" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div></td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('.edit-btn').forEach(btn=>btn.addEventListener('click',()=>openEditPage(btn.dataset.empcode)));
  tbody.querySelectorAll('.del-btn').forEach(btn=>btn.addEventListener('click',()=>openDeleteModal(btn.dataset.empcode,btn.dataset.empname)));
}

function renderPagination() {
  const total = Math.max(1,Math.ceil(state.filtered.length/state.pageSize));
  const cur   = state.currentPage;
  document.getElementById('prevPage').disabled = cur<=1;
  document.getElementById('nextPage').disabled = cur>=total;
  const nums = document.getElementById('pageNumbers');
  nums.innerHTML='';
  smartPageRange(cur,total).forEach(p=>{
    const btn=document.createElement('button');
    if (p==='…'){ btn.className='page-num ellipsis'; btn.textContent='…'; }
    else {
      btn.className='page-num'+(p===cur?' active':'');
      btn.textContent=p;
      btn.addEventListener('click',()=>{state.currentPage=p;renderTable();renderPagination();});
    }
    nums.appendChild(btn);
  });
}

function smartPageRange(cur,total) {
  if (total<=7) return Array.from({length:total},(_,i)=>i+1);
  if (cur<=4)          return [1,2,3,4,5,'…',total];
  if (cur>=total-3)    return [1,'…',total-4,total-3,total-2,total-1,total];
  return [1,'…',cur-1,cur,cur+1,'…',total];
}

/* ============================================================
   SORTING
   ============================================================ */
function setupSorting() {
  document.querySelectorAll('.emp-table th.sortable').forEach(th=>{
    th.addEventListener('click',()=>{
      const col=th.dataset.col;
      state.sortDir=(state.sortCol===col&&state.sortDir==='asc')?'desc':'asc';
      state.sortCol=col;
      document.querySelectorAll('.emp-table th.sortable').forEach(h=>h.classList.remove('sort-asc','sort-desc'));
      th.classList.add(state.sortDir==='asc'?'sort-asc':'sort-desc');
      applyFiltersAndSort();
    });
  });
}

/* ============================================================
   CREATE FORM
   ─────────────────────────────────────────────────────────────
   CRITICAL FIX: Do NOT send EmpCode in the body.
   Your backend controller does:
     INSERT INTO employee (EmpCode, EmpName, ...) VALUES (?, ?, ...)
   If EmpCode is an INT AUTO_INCREMENT column in MySQL, sending a
   string like 'E7342' causes: "Incorrect integer value" → 500.
   Solution: omit EmpCode — MySQL will auto-generate it.
   If your EmpCode is VARCHAR and you DO need to send it, change
   the INSERT in your controller to auto-generate server-side instead.
   ============================================================ */
function initCreateForm() {
  fillSelect('create-Gender',       REF.genders,     'GenderID',   'GenderName',     '', 'Select gender');
  fillSelect('create-DepartmentID', REF.departments, 'DeptID',     'DepartmentName', '', 'Select department');
  fillSelect('create-PositionID',   REF.positions,   'PostID',     'PositionName',   '', 'Select position');
  fillSelect('create-DivisionID',   REF.divisions,   'DivisionID', 'DivisionName',   '', 'Select division');
  fillSelect('create-OfficeID',     REF.offices,     'OfficeID',   'OfficeName',     '', 'Select office');
  fillSelect('create-BranchID',     REF.branches,    'BranchID',   'BranchName',     '', 'Select branch');
  clearCreateForm();
}

function clearCreateForm() {
  ['EmpName','Gender','DepartmentID','PositionID','DivisionID','OfficeID','BranchID'].forEach(f=>{
    const el=document.getElementById('create-'+f);
    if (el) el.value='';
  });
  ['EmpName','DepartmentID','PositionID'].forEach(f=>{
    const err=document.getElementById('err-create-'+f);
    if (err) err.textContent='';
  });
}

function validateCreate() {
  const name = document.getElementById('create-EmpName').value.trim();
  const dept = document.getElementById('create-DepartmentID').value;
  const pos  = document.getElementById('create-PositionID').value;
  document.getElementById('err-create-EmpName').textContent      = name?'':'Full name is required.';
  document.getElementById('err-create-DepartmentID').textContent  = dept?'':'Please select a department.';
  document.getElementById('err-create-PositionID').textContent    = pos?'':'Please select a position.';
  return !!(name && dept && pos);
}

async function handleCreate() {
  if (!validateCreate()) return;

  const btn = document.getElementById('createSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Creating…';

  /*
   * Send only the fields the backend needs.
   * DO NOT include EmpCode — let MySQL auto-increment it.
   * If your column is NOT auto-increment and requires EmpCode,
   * fix it in the backend controller instead (generate UUID/sequence there).
   */
  /*
   * EmpCode strategy:
   * Your backend controller does: INSERT INTO employee (EmpCode, EmpName, ...)
   * - If EmpCode is AUTO_INCREMENT: MySQL ignores any value we send and
   *   generates its own — so sending anything is fine.
   * - If EmpCode is NOT NULL without AUTO_INCREMENT: we must send a value.
   * We use a pure numeric timestamp tail (7 digits) which fits INT(11).
   * Adjust if your EmpCode column is VARCHAR.
   */
  const empCode = parseInt(Date.now().toString().slice(-4), 10);

  const body = {
    EmpCode:      empCode,
    EmpName:      document.getElementById('create-EmpName').value.trim(),
    Gender:       document.getElementById('create-Gender').value       || null,
    DepartmentID: document.getElementById('create-DepartmentID').value || null,
    PositionID:   document.getElementById('create-PositionID').value   || null,
    OfficeID:     document.getElementById('create-OfficeID').value     || null,
    DivisionID:   document.getElementById('create-DivisionID').value   || null,
    BranchID:     document.getElementById('create-BranchID').value     || null,
  };

  try {
    await api.createEmployee(body);
    showToast(`${body.EmpName} created successfully!`, 'success');
    console.log('Created employee:', body);
    clearCreateForm();
    await loadEmployeeList();
    navigate('employees');
  } catch (err) {
    showToast('Create failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg> Create Employee`;
  }
}

/* ============================================================
   EDIT FORM
   ─────────────────────────────────────────────────────────────
   Gender fix:
   1. Normalise emp.Gender from DB (handles 'M','F','Male','Female', null)
   2. Use normalised value as selectedId in fillSelect → correct option highlighted
   3. Snapshot the normalised value so diff compares apples-to-apples
   4. In handleEdit: only include Gender in payload when user actually changed it
   ============================================================ */
function openEditPage(empCodeRaw) {
  const emp = state.employees.find(e => String(e.EmpCode) === String(empCodeRaw));
  if (!emp) { showToast('Employee not found.', 'error'); return; }

  state.currentEditEmp = emp;

  /* Normalise gender display name, then resolve to GenderID ('M'/'F') for the select */
  const normGender   = normaliseGender(emp.Gender);
  const origGenderID = idByName(REF.genders, normGender, 'GenderID', 'GenderName');

  /* Resolve display names → DB IDs */
  const origDeptID   = idByName(REF.departments, emp.DepartmentName, 'DeptID',     'DepartmentName');
  const origPosID    = idByName(REF.positions,   emp.PositionName,   'PostID',     'PositionName');
  const origDivID    = idByName(REF.divisions,   emp.DivisionName,   'DivisionID', 'DivisionName');
  const origOfficeID = idByName(REF.offices,     emp.OfficeName,     'OfficeID',   'OfficeName');
  const origBranchID = idByName(REF.branches,    emp.BranchName,     'BranchID',   'BranchName');

  /* Snapshot — store GenderID so diff compares apples-to-apples with select value */
  state.editOriginalIDs = {
    EmpName:      emp.EmpName || '',
    Gender:       origGenderID,
    DepartmentID: origDeptID,
    PositionID:   origPosID,
    DivisionID:   origDivID,
    OfficeID:     origOfficeID,
    BranchID:     origBranchID,
  };

  document.getElementById('editSubtitle').textContent =
    `Editing: ${emp.EmpName || 'Employee #' + empCodeRaw}`;

  /* Populate selects — use origGenderID so the correct option is pre-selected */
  fillSelect('edit-Gender',       REF.genders,     'GenderID',   'GenderName',     origGenderID, 'Select gender');
  fillSelect('edit-DepartmentID', REF.departments, 'DeptID',     'DepartmentName', origDeptID,   'Select department');
  fillSelect('edit-PositionID',   REF.positions,   'PostID',     'PositionName',   origPosID,    'Select position');
  fillSelect('edit-DivisionID',   REF.divisions,   'DivisionID', 'DivisionName',   origDivID,    'Select division');
  fillSelect('edit-OfficeID',     REF.offices,     'OfficeID',   'OfficeName',     origOfficeID, 'Select office');
  fillSelect('edit-BranchID',     REF.branches,    'BranchID',   'BranchName',     origBranchID, 'Select branch');

  document.getElementById('edit-EmpName').value = emp.EmpName || '';

  /* Meta card */
  document.getElementById('empMetaCard').innerHTML = `
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;">Current Info</div>
    ${metaRow('Code',     '#' + emp.EmpCode)}
    ${metaRow('Name',     emp.EmpName        || '—')}
    ${metaRow('Gender',   normGender         || '—')}
    ${metaRow('Dept',     emp.DepartmentName || '—')}
    ${metaRow('Position', emp.PositionName   || '—')}
    ${metaRow('Division', emp.DivisionName   || '—')}
    ${metaRow('Office',   emp.OfficeName     || '—')}
    ${metaRow('Branch',   emp.BranchName     || '—')}
  `;

  navigate('edit');
}

function metaRow(key, val) {
  return `<div class="meta-row"><span class="meta-key">${key}</span><span class="meta-val">${escHtml(String(val))}</span></div>`;
}

async function handleEdit() {
  const emp = state.currentEditEmp;
  if (!emp) { showToast('No employee selected.', 'error'); return; }

  const orig    = state.editOriginalIDs;
  const payload = {};

  /* Name */
  const newName = document.getElementById('edit-EmpName').value.trim();
  if (newName && newName !== orig.EmpName) payload.EmpName = newName;

  /*
   * Gender diff:
   * - select value is one of 'Male'/'Female'/'Other'/'' (from our REF)
   * - orig.Gender is already normalised (same domain)
   * - If equal → unchanged → skip (never send null by accident)
   * - If different → user changed it → include in payload
   */
  const newGender = document.getElementById('edit-Gender').value; // '' | 'Male' | 'Female' | 'Other'
  if (newGender !== orig.Gender) {
    payload.Gender = newGender || null;
  }

  /* Other fields — compare IDs */
  const newDeptID = document.getElementById('edit-DepartmentID').value;
  if (newDeptID !== orig.DepartmentID) payload.DepartmentID = newDeptID || null;

  const newPosID = document.getElementById('edit-PositionID').value;
  if (newPosID !== orig.PositionID) payload.PositionID = newPosID || null;

  const newDivID = document.getElementById('edit-DivisionID').value;
  if (newDivID !== orig.DivisionID) payload.DivisionID = newDivID || null;

  const newOfficeID = document.getElementById('edit-OfficeID').value;
  if (newOfficeID !== orig.OfficeID) payload.OfficeID = newOfficeID || null;

  const newBranchID = document.getElementById('edit-BranchID').value;
  if (newBranchID !== orig.BranchID) payload.BranchID = newBranchID || null;

  if (Object.keys(payload).length === 0) {
    showToast('No changes detected.', 'info');
    return;
  }

  const btn = document.getElementById('editSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Saving…';

  try {
    await api.updateEmployee(emp.EmpCode, payload);
    showToast('Employee updated successfully!', 'success');
    state.currentEditEmp  = null;
    state.editOriginalIDs = {};
    await loadEmployeeList();
    navigate('employees');
  } catch (err) {
    showToast('Update failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
      <polyline points="20 6 9 17 4 12"/>
    </svg> Save Changes`;
  }
}

/* ============================================================
   DELETE
   ============================================================ */
function openDeleteModal(empCode, empName) {
  state.deleteEmpCode = empCode;
  document.getElementById('deleteModalBody').textContent =
    `"${empName}" will be permanently removed. This cannot be undone.`;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('hidden');
  state.deleteEmpCode = null;
}

async function handleDelete() {
  const code = state.deleteEmpCode;
  if (code === null || code === undefined) return;

  const btn = document.getElementById('deleteConfirmBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Deleting…';

  try {
    await api.deleteEmployee(code);
    showToast('Employee deleted.', 'success');
    closeDeleteModal();
    await loadEmployeeList();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    </svg> Delete`;
  }
}

/* ============================================================
   MOBILE SIDEBAR
   ============================================================ */
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.remove('hidden');
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.add('hidden');
}

/* ============================================================
   THEME
   ============================================================ */
function initTheme()  { applyTheme(localStorage.getItem('cambodiahr-theme') || 'dark'); }
function applyTheme(t){ document.documentElement.setAttribute('data-theme',t); localStorage.setItem('cambodiahr-theme',t); }
function toggleTheme(){
  applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
  if (state.employees.length>0) setTimeout(()=>renderDonutChart(state.employees),50);
}

/* ============================================================
   EVENTS
   ============================================================ */
function bindEvents() {
  document.querySelectorAll('[data-page]').forEach(el=>
    el.addEventListener('click',e=>{e.preventDefault();navigate(el.dataset.page);})
  );

  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  searchInput.addEventListener('input',()=>{
    state.search=searchInput.value; state.currentPage=1;
    searchClear.classList.toggle('hidden',!state.search);
    applyFiltersAndSort();
  });
  searchClear.addEventListener('click',()=>{
    searchInput.value=''; state.search=''; state.currentPage=1;
    searchClear.classList.add('hidden'); applyFiltersAndSort();
  });

  document.getElementById('deptFilter').addEventListener('change',e=>{state.deptFilter=e.target.value;state.currentPage=1;applyFiltersAndSort();});
  document.getElementById('branchFilter').addEventListener('change',e=>{state.branchFilter=e.target.value;state.currentPage=1;applyFiltersAndSort();});

  document.getElementById('prevPage').addEventListener('click',()=>{if(state.currentPage>1){state.currentPage--;renderTable();renderPagination();}});
  document.getElementById('nextPage').addEventListener('click',()=>{const t=Math.ceil(state.filtered.length/state.pageSize);if(state.currentPage<t){state.currentPage++;renderTable();renderPagination();}});

  document.getElementById('createSubmitBtn').addEventListener('click', handleCreate);
  document.getElementById('editSubmitBtn').addEventListener('click',   handleEdit);

  document.getElementById('deleteCancelBtn').addEventListener('click',  closeDeleteModal);
  document.getElementById('deleteConfirmBtn').addEventListener('click', handleDelete);
  document.getElementById('deleteModal').addEventListener('click',e=>{if(e.target===document.getElementById('deleteModal'))closeDeleteModal();});

  document.getElementById('globalRefresh').addEventListener('click',()=>{
    const btn=document.getElementById('globalRefresh');
    btn.classList.add('spinning');
    const pg=document.querySelector('.page.active')?.id?.replace('page-','');
    const done=()=>btn.classList.remove('spinning');
    if (pg==='dashboard') loadDashboard().finally(done);
    else if (pg==='employees') loadEmployeeList().finally(done);
    else done();
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('mobileMenuBtn').addEventListener('click', openMobileSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeMobileSidebar);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDeleteModal();closeMobileSidebar();}});

  setupSorting();
}

/* ============================================================
   LOGOUT
   ============================================================ */
function logout() {
  redirectToLogin();
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  initTheme();
  startClock();
  bindEvents();

  // Show logged-in username in the sidebar
  const payload = getTokenPayload();
  if (payload && payload.username) {
    const nameEl   = document.getElementById('sidebarUserName');
    const avatarEl = document.getElementById('sidebarUserAvatar');
    if (nameEl) nameEl.textContent = payload.username;
    if (avatarEl) avatarEl.textContent = payload.username.slice(0, 2).toUpperCase();
  }

  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', init);