/* ================= CONFIGURATION ================= */
var CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSoPJmFD2PgIQ5xCLPa3GMXxqgXYPGnuhApo4bE8ZWGSN8orekzv9LDL8M3-WevPGMFs0NwREroNjBT/pub?output=csv";
try { var _ovCSV = localStorage.getItem('kpi_link_CSV_URL'); if (_ovCSV) CSV_URL = _ovCSV; } catch(e) {}
var PHU_CAP_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTCqo7JTvbIEiUfmolZudGqKIJu_34TZ4yWMsmJPb-HwSihOtApWCxve2f4fhWmGs_K57duSjztxSB1/pub?output=csv";
try { var _ovPC = localStorage.getItem('kpi_link_PHU_CAP_CSV_URL'); if (_ovPC) PHU_CAP_CSV_URL = _ovPC; HIERARCHY_CSV_URL = PHU_CAP_CSV_URL; } catch(e) {}
var HIERARCHY_CSV_URL = PHU_CAP_CSV_URL;
var DATA = [], HIERARCHY_DATA = [], NOW = new Date(), CUR_YEAR = NOW.getFullYear(), CUR_MONTH = String(NOW.getMonth() + 1).padStart(2, '0');

var timeState = { detail: CUR_MONTH, calendar: CUR_MONTH };
var dashboardState = { ky: '', adGroups: {} };

var CO_CAU = {
    "PHÒNG 1": ["UY", "TRÍ"],
    "PHÒNG 2": ["CÓ", "LONG"],
    "PHÒNG 3": ["TRANG", "DANH"],
    "BANCA - PA": ["BANCA"]
};

var MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
var FUNCS = [
    { id: "Q1", n: "Quý 1", ms: ["01", "02", "03"] },
    { id: "Q2", n: "Quý 2", ms: ["04", "05", "06"] },
    { id: "Q3", n: "Quý 3", ms: ["07", "08", "09"] },
    { id: "Q4", n: "Quý 4", ms: ["10", "11", "12"] },
    { id: "Y", n: "Cả năm", ms: "ALL" }
];

/* ================= UTILITIES ================= */
var $ = function(id) { return document.getElementById(id); };
var num = function(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var s = String(v).trim();
    if (!s) return 0;
    s = s.replace(/\s/g, '').replace(/%/g, '');
    if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else if (s.indexOf(',') !== -1) {
        s = s.replace(',', '.');
    }
    s = s.replace(/[^0-9.\-]/g, '');
    var n = Number(s);
    return isFinite(n) ? n : 0;
};
var fmt = function(n) { return new Intl.NumberFormat('vi-VN').format(n); };
function esc(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function animateValue(el, end, dur) {
    if (!dur) dur = 900;
    if (!end) { el.textContent = fmt(end); return; }
    var start = 0;
    var st = null;
    var step = function(ts) {
        if (!st) st = ts;
        var p = Math.min((ts - st) / dur, 1);
        // EaseOutCubic
        var ease = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.floor(end * ease));
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function animatePct(el, target, dur, dec) {
    if (!dur) dur = 900;
    if (dec === undefined) dec = 0;
    var st = null;
    var step = function(ts) {
        if (!st) st = ts;
        var p = Math.min((ts - st) / dur, 1);
        var ease = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * ease).toFixed(dec) + '%';
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function toast(msg, type) {
    var c = document.querySelector('.tw'); 
    if(!c) return; // Only works inside td-page views or create a global toast container
    // Simple fallback for main view if needed, but main view doesn't use toast() much currently.
    // Assuming toast is called from Race/Policy context mainly.
    
    var t = document.createElement('div');
    t.className = 'ts ' + (type === 'err' ? 'err' : type === 'ok' ? 'ok' : '');
    var ic = { ok: 'fa-circle-check', err: 'fa-circle-exclamation', info: 'fa-circle-info' };
    var cl = { ok: '#27ae60', err: 'var(--td-red)', info: 'var(--td-accent)' };
    
    t.innerHTML = '<i class="fa-solid ' + (ic[type] || ic.info) + '" style="color:' + (cl[type] || cl.info) + '"></i>' + esc(msg);
    c.appendChild(t);
    requestAnimationFrame(function() { requestAnimationFrame(function() { t.classList.add('show'); }); });
    setTimeout(function() {
        t.classList.remove('show');
        setTimeout(function() { t.remove(); }, 400);
    }, 3500);
}

/* ================= NAVIGATION ================= */
function go(viewId) {
    document.body.style.overflow = '';
    
    // Close modals if any are open
    [tdPage, poPage, clbPage].forEach(function(pg) {
        if (!pg) return;
        ['PwMdl', 'CfmDel', 'Mdl', 'Popup'].forEach(function(s) {
            var el = pg.gid(s);
            if (el) el.classList.remove('open');
        });
    });

    document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
    $(viewId).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewId === 'view-detail') {
        renderDtPicker();
        renderDetail();
    } else if (viewId === 'view-calendar') {
        renderCalFilter();
        if (!_calLoaded) {
            _calLoaded = true;
            calLoadUserEntries().then(function() { renderCalendar(); });
        } else {
            renderCalendar();
        }
    } else if (viewId === 'view-race') {
        tdPage.init();
    } else if (viewId === 'view-policy') {
        poPage.init();
    } else if (viewId === 'view-clb') {
        clbPage.init();
    }
}

/* ================= MAIN DASHBOARD LOGIC ================= */
function pctColor(p) {
    return '#f2d38d';
}
function glowCls(pct) { return pct >= 100 ? ' glow-full' : ''; }
function normalizeHeaderName(v) {
    return String(v || '')
        .replace(/^\uFEFF/, '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
}
function normalizeCsvRows(rows) {
    return (rows || []).map(function(row) {
        var out = {};
        Object.keys(row || {}).forEach(function(key) {
            var cleanKey = normalizeHeaderName(key);
            if (!cleanKey) return;
            /* Xử lý trùng lặp header "nhom" trong sheet Phụ cấp:
               PapaParse đổi cột thứ 2 thành "nhom_1".
               - "nhom" (cột 1) = tên AD (quản lý) → ánh xạ thành "ad"
               - "nhom_1" (cột 2) = tên nhóm phụ → ánh xạ thành "nhom" */
            if (cleanKey === 'nhom_1') {
                /* Di chuyển giá trị "nhom" cũ sang "ad", đặt nhóm phụ vào "nhom" */
                if (out.hasOwnProperty('nhom')) { out['ad'] = out['nhom']; }
                cleanKey = 'nhom';
            }
            out[cleanKey] = row[key];
        });
        return out;
    });
}
function fmtTyTrong(v) {
    var n = num(v);
    if (!isFinite(n)) n = 0;
    if (Math.abs(n % 1) < 0.001) return fmt(Math.round(n)) + '%';
    return n.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '%';
}
function normText(v) { return String(v || '').trim().toUpperCase(); }
function normKey(v) {
    return String(v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/Đ/g, 'D')
        .replace(/đ/g, 'd')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
}
function rowMonthVal(row, monthIdx) { return num(row[String(monthIdx)]); }
function adMatches(rowAd, adKey, managerName) {
    var ra = normKey(rowAd), ak = normKey(adKey), mn = normKey(managerName);
    if (!ra) return false;
    return (!!ak && (ra === ak || ra.indexOf(ak) !== -1 || ak.indexOf(ra) !== -1)) ||
           (!!mn && (ra === mn || ra.indexOf(mn) !== -1 || mn.indexOf(ra) !== -1));
}
function roleRank(chucVu) {
    var key = normText(chucVu);
    if (key === 'TB' || key === 'TN') return 0;
    if (key === 'TTN') return 1;
    if (key === 'TVV') return 2;
    return 99;
}
function sortMembers(members) {
    members.sort(function(a, b) {
        var oa = roleRank(a.chucVu), ob = roleRank(b.chucVu);
        if (oa !== ob) return oa - ob;
        return normText(a.ten).localeCompare(normText(b.ten), 'vi');
    });
    return members;
}
function buildMonths() {
    return Array(12).fill(0);
}
function collectManagedMembers(rows, adKey, managerName) {
    var members = [];
    rows.forEach(function(row) {
        if (!adMatches(row.ad, adKey, managerName)) return;
        var maSo = String(row.ma_so || '').trim();
        var ten = String(row.tvv || '').trim();
        var chucVu = String(row.chuc_vu || '').trim();
        if (!maSo && !ten && !chucVu) return;
        var months = [];
        for (var m = 1; m <= 12; m++) months.push(rowMonthVal(row, m));
        members.push({ maSo: maSo || '--', ten: ten || '--', chucVu: chucVu || '--', months: months, ngayCap: String(row.ngay_cap || '').trim() });
    });
    return sortMembers(members);
}
function collectManagedGroups(rows, adKey, managerName) {
    var map = {};
    rows.forEach(function(row) {
        if (!adMatches(row.ad, adKey, managerName)) return;
        var groupName = String(row.nhom || '').trim();
        var maSo = String(row.ma_so || '').trim();
        var ten = String(row.tvv || '').trim();
        var chucVu = String(row.chuc_vu || '').trim();
        if (!groupName || (!maSo && !ten && !chucVu)) return;

        if (!map[groupName]) {
            map[groupName] = {
                name: groupName,
                leader: '--',
                leaderRole: 99,
                totals: buildMonths(),
                members: []
            };
        }

        var group = map[groupName];
        var months = [];
        for (var m = 1; m <= 12; m++) {
            var mv = rowMonthVal(row, m);
            months.push(mv);
            group.totals[m - 1] += mv;
        }

        group.members.push({
            maSo: maSo || '--',
            ten: ten || '--',
            chucVu: chucVu || '--',
            months: months,
            ngayCap: String(row.ngay_cap || '').trim()
        });

        var rank = roleRank(chucVu);
        if (rank <= 1 && (group.leaderRole > rank || group.leader === '--')) {
            group.leader = ten || maSo || '--';
            group.leaderRole = rank;
        } else if (group.leader === '--' && ten) {
            group.leader = ten;
            group.leaderRole = rank;
        }
    });

    return Object.keys(map).sort(function(a, b) {
        return a.localeCompare(b, 'vi');
    }).map(function(name) {
        var group = map[name];
        sortMembers(group.members);
        return group;
    });
}
function buildTeamBoard(group, idx) {
    if (!group) return '';
    var stats = computeGroupStats(group.members || []);
    // Thông tin nhóm thu gọn
    var infoHtml = '<div class="team-info-summary">' +
        '<div><span>Tên nhóm:</span> ' + esc(group.name) + '</div>' +
        '<div><span>Thủ lĩnh:</span> ' + esc(group.leader || '--') + '</div>' +
        '<div><span>Số lượng:</span> ' + stats.total + '</div>' +
        '<div><span>Lượt HD:</span> ' + stats.luotHD + '</div>' +
        '<div><span>Lượt HD chuẩn:</span> ' + stats.luotHDChuan + '</div>' +
        '<div><span>TVVm (&lt;12t):</span> ' + stats.tvvMoi + '</div>' +
        '</div>';
    // Phần danh sách thành viên giữ nguyên (bảng IP chi tiết, header 2 dòng)
    var memberHead = '<thead>' +
        '<tr>' +
        '<th rowspan="2" class="mini-col">STT</th>' +
'<th rowspan="2" class="code-col">Mã số</th>' +
        '<th rowspan="2" class="name-col">Họ tên</th>' +
        '<th rowspan="2" class="cv-col">CV</th>' +
        '<th colspan="7" class="ip-group">IP</th>' +
        '</tr>' +
        '<tr>';
    for (var mm = 3; mm <= 9; mm++) memberHead += '<th class="mini-col ip-sub">T' + mm + '</th>';
    memberHead += '</tr></thead>';
    var memberRows = (group.members || []).map(function(member, memberIdx) {
        var row = '<tr><td class="label">' + (memberIdx + 1) + '</td><td class="code-cell">' + esc(member.maSo) + '</td><td class="name">' + esc(member.ten) + '</td><td class="cv-cell">' + esc(member.chucVu) + '</td>';
        for (var mi = 2; mi <= 8; mi++) { var mv = member.months[mi] || 0; row += '<td class="month' + (mv > 0 ? ' has-val' : '') + '">' + esc(fmt(mv)) + '</td>'; }
        row += '</tr>';
        return row;
    }).join('');
    var memberTable = '<div class="ad-team-wrap"><table class="ad-team-table member">' + memberColgroup() + memberHead + '<tbody>' + memberRows + '</tbody></table></div>';
    
    return '<div class="ad-team-board">' +
        '<div class="ad-team-sec sec-info"><div class="ad-team-cap">Thông tin nhóm</div>' + infoHtml + '</div>' +
        '<div class="ad-team-sec sec-list"><div class="ad-team-cap">Danh sách thành viên</div>' + memberTable + '</div>' +
        '</div>';
}
function parseNgayCap(str) {
    if (!str) return null;
    var s = String(str).trim();
    if (!s) return null;
    // Try DD/MM/YYYY or DD-MM-YYYY first
    var m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (m) {
        var d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
        if (y < 100) y += 2000;
        if (mo >= 1 && mo <= 12 && y > 1900) return { year: y, month: mo };
    }
    // Try YYYY-MM-DD
    m = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
    if (m) {
        var y2 = parseInt(m[1], 10), mo2 = parseInt(m[2], 10);
        if (mo2 >= 1 && mo2 <= 12 && y2 > 1900) return { year: y2, month: mo2 };
    }
    // Fallback: native Date
    var dt = new Date(s);
    if (!isNaN(dt.getTime())) return { year: dt.getFullYear(), month: dt.getMonth() + 1 };
    return null;
}
function computeGroupStats(members) {
    var total = 0, luotHD = 0, luotHDChuan = 0, tvvMoi = 0;
    var nowY = NOW.getFullYear(), nowM = NOW.getMonth() + 1;
    (members || []).forEach(function(m) {
        total++;
        // Lượt HD: count months (all 12 months) where IP >= 3 (triệu)
        // Lượt HD chuẩn: same but IP >= 12 (triệu)
        var months = m.months || [];
        for (var i = 0; i < 12; i++) {
            var v = +months[i] || 0;
            if (v >= 3) luotHD++;
            if (v >= 12) luotHDChuan++;
        }
        // TVVm (<12t): any member with ngayCap within 12 months from today (count by month, not day)
        var d = parseNgayCap(m.ngayCap);
        if (d) {
            var diff = (nowY - d.year) * 12 + (nowM - d.month);
            if (diff >= 0 && diff <= 12) tvvMoi++;
        }
    });
    return { total: total, luotHD: luotHD, luotHDChuan: luotHDChuan, tvvMoi: tvvMoi };
}
function memberColgroup() {
    return '<colgroup>' +
        '<col class="cg-stt">' +
        '<col class="cg-code">' +
        '<col class="cg-name">' +
        '<col class="cg-cv">' +
        '<col class="cg-ip"><col class="cg-ip"><col class="cg-ip"><col class="cg-ip"><col class="cg-ip"><col class="cg-ip"><col class="cg-ip">' +
        '</colgroup>';
}
function buildMemberOnlyBoard(title, members) {
    var stats = computeGroupStats(members || []);
    var statsHtml = '<div class="team-info-summary">' +
        '<div><span>Số lượng:</span> ' + stats.total + '</div>' +
        '<div><span>Lượt HD:</span> ' + stats.luotHD + '</div>' +
        '<div><span>Lượt HD chuẩn:</span> ' + stats.luotHDChuan + '</div>' +
        '<div><span>TVVm (&lt;12t):</span> ' + stats.tvvMoi + '</div>' +
        '</div>';
    var memberHead = '<thead>' +
        '<tr>' +
        '<th rowspan="2" class="mini-col">STT</th>' +
'<th rowspan="2" class="code-col">Mã số</th>' +
        '<th rowspan="2" class="name-col">Họ tên</th>' +
        '<th rowspan="2" class="cv-col">CV</th>' +
        '<th colspan="7" class="ip-group">IP</th>' +
        '</tr>' +
        '<tr>';
    for (var mm = 3; mm <= 9; mm++) memberHead += '<th class="mini-col ip-sub">T' + mm + '</th>';
    memberHead += '</tr></thead>';
    var memberRows = (members || []).map(function(member, memberIdx) {
        var row = '<tr><td class="label">' + (memberIdx + 1) + '</td><td class="code-cell">' + esc(member.maSo) + '</td><td class="name">' + esc(member.ten) + '</td><td class="cv-cell">' + esc(member.chucVu) + '</td>';
        for (var mi = 2; mi <= 8; mi++) { var mv = member.months[mi] || 0; row += '<td class="month' + (mv > 0 ? ' has-val' : '') + '">' + esc(fmt(mv)) + '</td>'; }
        row += '</tr>';
        return row;
    }).join('');
    return '<div class="ad-team-board">' +
        '<div class="ad-team-sec"><div class="ad-team-cap">' + esc(title || 'Danh sách TVV') + '</div>' +
        statsHtml +
        '<div class="ad-team-wrap"><table class="ad-team-table member">' + memberColgroup() + memberHead + '<tbody>' + memberRows + '</tbody></table></div>' +
        '</div></div>';
}
function renderPhongDrill(card) {
    if (!card) return;
    var adKey = card.getAttribute('data-ad-key') || '';
    var drill = card.querySelector('.phong-drill');
    var entry = dashboardState.adGroups[adKey];
    if (!drill) return;
    if (!entry || !entry.members || !entry.members.length) {
        drill.innerHTML = '<div class="ad-empty">Chưa có TVV.</div>';
        return;
    }
    drill.innerHTML =
        '<div class="ad-drill-head"><span>Danh sách TVV</span><span>' + entry.members.length + ' TVV</span></div>' +
        buildMemberOnlyBoard(entry.title || entry.managerName, entry.members);
}
function renderAdDrill(card) {
    if (!card) return;
    var adKey = card.getAttribute('data-ad-key') || '';
    var drill = card.querySelector('.ad-drill');
    var entry = dashboardState.adGroups[adKey];
    if (!drill) return;
    /* Debug: log drill-down attempt */
    console.log('[KPI-DEBUG] renderAdDrill | adKey:', adKey, '| entry:', entry ? 'found' : 'NOT FOUND', '| groups:', entry && entry.groups ? entry.groups.length : 0);
    if (!entry || ((!entry.groups || !entry.groups.length) && (!entry.members || !entry.members.length))) {
        drill.innerHTML = '<div class="ad-empty">Chưa có nhóm quản lý.</div>';
        return;
    }
    if (entry.mode === 'members') {
        drill.innerHTML =
            '<div class="ad-drill-head"><span>Danh sách TVV</span><span>' + entry.members.length + ' TVV</span></div>' +
            buildMemberOnlyBoard(entry.title || entry.managerName, entry.members);
        return;
    }
    if (!entry.groups || !entry.groups.length) {
        drill.innerHTML = '<div class="ad-empty">Chưa có nhóm quản lý.</div>';
        return;
    }
    var activeGroup = card.getAttribute('data-open-group') || entry.groups[0].name;
    var activeIdx = entry.groups.findIndex(function(group) { return group.name === activeGroup; });
    if (activeIdx < 0) activeIdx = 0;
    var active = entry.groups[activeIdx];
    card.setAttribute('data-open-group', active.name);
    drill.innerHTML =
        '<div class="ad-drill-head"><span>Nhóm thuộc quyền</span><span>' + entry.groups.length + ' nhóm</span></div>' +
        '<div class="ad-group-list">' +
        entry.groups.map(function(group) {
            return '<button type="button" class="ad-group-btn ' + (group.name === active.name ? 'on' : '') + '" data-group-name="' + esc(group.name) + '">' + esc(group.name) + '<span class="cnt">(' + group.members.length + ')</span></button>';
        }).join('') +
        '</div>' +
        buildTeamBoard(active, activeIdx);
}
/* Desktop: show AD detail when clicking table row */
function showAdDetailView(adKey, info) {
    /* ★ Toggle drill-down panel below the AD table row */
    var adRow = document.querySelector('.dsk-ad-table tbody tr[data-ad-key="' + adKey + '"]');
    if (!adRow || !info) return;

    /* Remove any existing drill-down rows */
    var existingDrill = adRow.parentNode.querySelector('.dsk-ad-drill-row');
    if (existingDrill) {
        existingDrill.remove();
        return; /* toggle off */
    }
    /* Remove drills from other tables too */
    document.querySelectorAll('.dsk-ad-drill-row').forEach(function(r) { r.remove(); });

    /* Build drill-down content */
    var drillContent = '';
    if (info.mode === 'members' && info.members && info.members.length) {
        drillContent = '<div class="ad-drill-head"><span>Danh sách TVV</span><span>' + info.members.length + ' TVV</span></div>';
        drillContent += buildMemberOnlyBoard(info.title || info.managerName, info.members);
    } else if (info.mode === 'groups' && info.groups && info.groups.length) {
        var active = info.groups[0];
        drillContent = '<div class="ad-drill-head"><span>Nhóm thuộc quyền</span><span>' + info.groups.length + ' nhóm</span></div>';
        drillContent += '<div class="ad-group-list">';
        info.groups.forEach(function(group) {
            drillContent += '<button type="button" class="ad-group-btn on" data-ad-drill-key="' + esc(adKey) + '" data-group-name="' + esc(group.name) + '">' + esc(group.name) + '<span class="cnt">(' + group.members.length + ')</span></button>';
        });
        drillContent += '</div>';
        drillContent += buildTeamBoard(active, 0);
    } else {
        drillContent = '<div class="ad-empty">Chưa có dữ liệu.</div>';
    }

    /* Insert drill row after the clicked row */
    var drillRow = document.createElement('tr');
    drillRow.className = 'dsk-ad-drill-row';
    var colSpan = adRow.cells.length;
    drillRow.innerHTML = '<td colspan="' + colSpan + '" style="padding:0;background:#0d1a2e">' + drillContent + '</td>';
    adRow.parentNode.insertBefore(drillRow, adRow.nextSibling);
}

function bindDashboardEvents() {
    if (document.body.dataset.mainDashBound === '1') return;
    document.body.dataset.mainDashBound = '1';
    document.addEventListener('click', function(e) {
        // Desktop: AD table row click → show detail view
        var adRow = e.target.closest('.dsk-ad-table tbody tr[data-ad-key]');
        if (adRow) {
            var adKey = adRow.getAttribute('data-ad-key');
            if (adKey && dashboardState.adGroups[adKey]) {
                var info = dashboardState.adGroups[adKey];
                showAdDetailView(adKey, info);
            }
            return;
        }
        // Ad group button click
        var groupBtn = e.target.closest('.ad-group-btn');
        if (groupBtn) {
            /* ★ Desktop drill-down group button */
            var drillRow = groupBtn.closest('.dsk-ad-drill-row');
            if (drillRow) {
                e.preventDefault();
                e.stopPropagation();
                var adDrillKey = groupBtn.getAttribute('data-ad-drill-key') || '';
                var groupName = groupBtn.getAttribute('data-group-name') || '';
                var info = dashboardState.adGroups[adDrillKey];
                if (info && info.groups) {
                    var activeIdx = info.groups.findIndex(function(g) { return g.name === groupName; });
                    if (activeIdx < 0) activeIdx = 0;
                    /* Update active button styling */
                    drillRow.querySelectorAll('.ad-group-btn').forEach(function(b) { b.classList.remove('on'); });
                    groupBtn.classList.add('on');
                    /* Rebuild team board */
                    var teamBoard = drillRow.querySelector('.ad-team-board');
                    if (teamBoard) {
                        teamBoard.outerHTML = buildTeamBoard(info.groups[activeIdx], activeIdx);
                    }
                }
                return;
            }
            /* Mobile card group button */
            var ownerCard = groupBtn.closest('.kpi-ad[data-ad-key]');
            if (ownerCard) {
                e.preventDefault();
                e.stopPropagation();
                ownerCard.setAttribute('data-open-group', groupBtn.getAttribute('data-group-name') || '');
                renderAdDrill(ownerCard);
            }
            return;
        }
        // Ad card toggle
        var adCard = e.target.closest('.kpi-ad[data-ad-key]');
        if (adCard && $('main-content').contains(adCard) && !e.target.closest('.ad-team-board')) {
            var isOpen = adCard.classList.contains('open');
            document.querySelectorAll('.kpi-ad.open').forEach(function(card) {
                if (card !== adCard) {
                    card.classList.remove('open');
                    card.removeAttribute('data-open-group');
                }
            });
            if (isOpen) {
                adCard.classList.remove('open');
                adCard.removeAttribute('data-open-group');
            } else {
                adCard.classList.add('open');
                renderAdDrill(adCard);
            }
            return;
        }
        // Phong banca card toggle (mobile or desktop)
        var phongCard = e.target.closest('.kpi-phong.banca[data-ad-key], .kpi-ad.is-phong.banca[data-ad-key]');
        if (phongCard && $('main-content').contains(phongCard) && !e.target.closest('.ad-team-board')) {
            var isOpen = phongCard.classList.contains('open');
            document.querySelectorAll('.kpi-phong.banca.open, .kpi-ad.is-phong.banca.open').forEach(function(card) {
                if (card !== phongCard) card.classList.remove('open');
            });
            if (isOpen) {
                phongCard.classList.remove('open');
            } else {
                phongCard.classList.add('open');
                renderPhongDrill(phongCard);
            }
        }
    });
}
function miniProgressHTML(cp, extraCls) {
    return '<div class="mini-progress ' + (extraCls || '') + '"><div class="mini-progress-fill" data-w="' + cp + '%"></div></div>';
}

function progressColor(pct) {
    var p = Math.max(0, Math.min(100, pct || 0));
    var hue = 0 + (120 * (p / 100));
    return 'hsl(' + hue + ', 68%, 52%)';
}
var DATA_CACHE_KEY = 'kpi-bvnt-ag-data-cache-v1';

function saveDataCache(rows) {
    try {
        localStorage.setItem(DATA_CACHE_KEY, JSON.stringify({
            ts: Date.now(),
            rows: rows || []
        }));
    } catch (e) {}
}

function loadDataCache() {
    try {
        var raw = localStorage.getItem(DATA_CACHE_KEY);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.rows) || !parsed.rows.length) return null;
        return normalizeCsvRows(parsed.rows);
    } catch (e) {
        return null;
    }
}
function loadCsv(url) {
    return new Promise(function(resolve, reject) {
        var separator = url.indexOf('?') !== -1 ? '&' : '?';
        Papa.parse(url + separator + 't=' + Date.now(), {
            download: true,
            header: true,
            skipEmptyLines: true,
            transformHeader: function(header) { return normalizeHeaderName(header); },
            complete: function(res) { resolve(normalizeCsvRows(res.data || [])); },
            error: function(err) { reject(err || new Error('Load CSV failed')); }
        });
    });
}

function formatKyLabel(ky) {
    if (!ky) return '--';
    var v = String(ky).trim();
    var monthMatch = v.match(/(\d{2})$/);
    if (/Q[1-4]$/i.test(v)) return v.match(/Q[1-4]$/i)[0].toUpperCase();
    if (/(?:H1|6T)$/i.test(v)) return '6T';
    if (/(?:Y|NAM|NĂM)$/i.test(v)) return 'Năm';
    if (/^\d{4}-\d{2}$/.test(v) && monthMatch) return monthMatch[1];
    if (/^\d{2}$/.test(v)) return v;
    return v.replace(/^\d{4}-/, '');
}

function kySortWeight(ky) {
    var label = formatKyLabel(ky);
    if (/^\d{2}$/.test(label)) return parseInt(label, 10);
    if (/^Q[1-4]$/i.test(label)) return 20 + parseInt(label.slice(1), 10);
    if (label === '6T') return 30;
    if (label === 'Năm') return 31;
    return 99;
}

function renderKySelect(kyList, selectedKy) {
    var wrap = $('select-ky-wrap');
    var btn = $('select-ky');
    var menu = $('select-ky-menu');
    if (!wrap || !btn || !menu) return;

    btn.textContent = formatKyLabel(selectedKy || kyList[0] || '--');
    btn.dataset.value = selectedKy || '';
    btn.setAttribute('aria-expanded', wrap.classList.contains('open') ? 'true' : 'false');
    menu.innerHTML = kyList.map(function(ky) {
        return '<button type="button" class="ctrl-select-opt ' + (ky === selectedKy ? 'on' : '') + '" data-ky="' + esc(ky) + '">' + esc(formatKyLabel(ky)) + '</button>';
    }).join('');

    menu.querySelectorAll('.ctrl-select-opt').forEach(function(opt) {
        opt.addEventListener('click', function() {
            var ky = opt.getAttribute('data-ky');
            wrap.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
            renderKySelect(kyList, ky);
            renderMain(ky);
        });
    });
}

async function syncData() {
    var btn = $('sync-btn');
    btn.classList.add('loading');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

    var cachedRows = loadDataCache();
    if (cachedRows && cachedRows.length) {
        DATA = cachedRows;
        $('skeleton-main').style.display = 'none';
        initApp();
    } else {
        $('skeleton-main').style.display = '';
    }
    var els = ['error-main', 'kpi-company', 'nav-grid', 'sec-divider', 'main-content', 'link-divider', 'link-grid'];
    for (var i = 0; i < els.length; i++) { var el = $(els[i]); if (el) el.style.display = 'none'; }

    try {
        var results = await Promise.all([
            loadCsv(CSV_URL),
            loadCsv(HIERARCHY_CSV_URL)
        ]);
        DATA = results[0] || [];
        HIERARCHY_DATA = results[1] || [];
        saveDataCache(DATA);
        btn.classList.remove('loading');
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i>';
        $('skeleton-main').style.display = 'none';

        if (!DATA.length) {
            $('error-main').style.display = '';
            return;
        }
        initApp();
    } catch (e) {
        btn.classList.remove('loading');
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i>';
        $('skeleton-main').style.display = 'none';
        $('error-main').style.display = '';
    }
}

function initApp() {
    /* Luôn tạo đủ 12 tháng của năm hiện tại + các kỳ tổng hợp */
    var kyList = [], seen = {};
    /* 1) Thêm 12 tháng cố định */
    for (var m = 1; m <= 12; m++) {
        var mk = CUR_YEAR + '-' + String(m).padStart(2, '0');
        if (!seen[mk]) { seen[mk] = true; kyList.push(mk); }
    }
    /* 2) Thêm các kỳ tổng hợp từ dữ liệu (6T, Q1-Q4, NAM) */
    DATA.forEach(function(x) {
        if (x.ky && x.ky.indexOf(CUR_YEAR.toString()) !== -1 && !seen[x.ky]) {
            seen[x.ky] = true;
            kyList.push(x.ky);
        }
    });
    kyList.sort(function(a, b) { return kySortWeight(a) - kySortWeight(b); });

    var dk = CUR_YEAR + '-' + CUR_MONTH;
    var selectedKy = kyList.indexOf(dk) !== -1 ? dk : (kyList[0] || '');
    renderKySelect(kyList, selectedKy);
    renderMain(selectedKy);

    var wrap = $('select-ky-wrap');
    var btn = $('select-ky');
    if (wrap && btn && !wrap.dataset.bound) {
        btn.addEventListener('click', function() {
            var isOpen = wrap.classList.toggle('open');
            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
        document.addEventListener('click', function(e) {
            if (!wrap.contains(e.target)) {
                wrap.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            }
        });
        wrap.dataset.bound = '1';
    }
}

function renderNoticeBar(ky) {
    var bar = $('notice-bar');
    if (!bar) return;

    var seen = {}, items = [];
    DATA.forEach(function(x) {
        var msg = (x.thong_bao || '').trim();
        if (!msg) return;
        if (ky && x.ky && x.ky !== ky) return;
        if (!seen[msg]) {
            seen[msg] = true;
            items.push(msg);
        }
    });

    if (!items.length) {
        bar.classList.remove('show');
        document.body.classList.remove('has-notice');
        bar.innerHTML = '';
        return;
    }

    var html = items.map(function(msg) {
        return '<span class="notice-item"><i class="fa-solid fa-bullhorn"></i><span>' + esc(msg) + '</span></span>';
    }).join('');

    bar.innerHTML = '<div class="notice-track">' + html + html + '</div>';
    bar.classList.add('show');
    document.body.classList.add('has-notice');
}

function renderLinkButtons(ky) {
    var divider = $('link-divider');
    var grid = $('link-grid');
    if (!divider || !grid) return;

    var seen = {}, items = [];
    DATA.forEach(function(x) {
        /* Link buttons luôn hiện, không lọc theo kỳ */
        var name = (x.ten_nhan_vien || '').trim();
        var link = (x.lien_ket || '').trim();
        if (!name || !link || !/^https?:\/\//i.test(link)) return;

        var label = name;
        var key = label + '|' + link;
        if (seen[key]) return;
        seen[key] = true;
        items.push({ label: label, link: link });
    });

    if (!items.length) {
        divider.style.display = 'none';
        grid.style.display = 'none';
        grid.innerHTML = '';
        return;
    }

    grid.innerHTML = items.map(function(item) {
        return '<a class="link-btn" href="' + esc(item.link) + '" target="_blank" rel="noopener noreferrer">' +
            '<i class="fa-solid fa-arrow-up-right-from-square"></i><span>' + esc(item.label) + '</span></a>';
    }).join('');
    divider.style.display = '';
    grid.style.display = 'grid';
}

/* ===== AFYP CHART RENDERER ===== */
function renderAfypChart() {
    var wrap = $('afyp-chart-wrap');
    if (!wrap) return;
    if (window.innerWidth < 900) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';

    /* Tính AFYP + KH theo tháng — chỉ dùng số AD cấp phòng (giống renderMain) */
    var adKeys = [];
    for (var pN in CO_CAU) CO_CAU[pN].forEach(function(k) { adKeys.push(k); });
    var months = [];
    var totalAfyp = 0, totalKh = 0;
    var curM = parseInt(CUR_MONTH, 10);
    for (var m = 1; m <= 12; m++) {
        var mk = CUR_YEAR + '-' + String(m).padStart(2, '0');
        var mRows = DATA.filter(function(x) { return x.ky === mk && x.ten_nhan_vien; });
        var afyp = 0, kh = 0;
        adKeys.forEach(function(adKey) {
            var row = mRows.find(function(x) {
                var ten = normKey(x.ten_nhan_vien);
                var key = normKey(adKey);
                return ten && key && (ten === key || ten.indexOf(key) !== -1 || key.indexOf(ten) !== -1);
            });
            if (row) { afyp += num(row.afyp); kh += num(row.ke_hoach_afyp); }
        });
        months.push({ month: m, label: 'T' + m, afyp: afyp, kh: kh });
        if (m <= curM) { totalAfyp += afyp; totalKh += kh; }
    }

    var hasData = months.some(function(d) { return d.afyp > 0 || d.kh > 0; });
    if (!hasData) { wrap.style.display = 'none'; return; }

    /* Summary */
    var sumEl = $('afyp-chart-summary');
    if (sumEl) {
        var fmtBig = function(v) { return v >= 1e9 ? (v/1e9).toFixed(2) + ' tỷ' : v >= 1e6 ? (v/1e6).toFixed(0) + ' tr' : v >= 1e3 ? (v/1e3).toFixed(0) + 'k' : v.toFixed(0); };
        var avgPct = totalKh > 0 ? (totalAfyp / totalKh * 100) : 0;
        var avgPctClass = avgPct >= 100 ? 'green' : avgPct >= 70 ? 'gold' : 'red';
        sumEl.innerHTML = '<div class="sum-item"><div class="sum-label">Tổng AFYP (T1-T' + curM + ')</div><div class="sum-val">' + fmtBig(totalAfyp) + '</div></div>' +
            '<div class="sum-item"><div class="sum-label">Tổng KH (T1-T' + curM + ')</div><div class="sum-val">' + fmtBig(totalKh) + '</div></div>' +
            '<div class="sum-item"><div class="sum-label">Đạt KH</div><div class="sum-val ' + avgPctClass + '">' + avgPct.toFixed(1) + '%</div></div>';
    }

    /* ===== PROFESSIONAL SVG CHART ===== */
    var chartEl = $('afyp-chart');
    var elW = chartEl.offsetWidth || 600;
    var elH = chartEl.offsetHeight || 500;

    /* Dùng tọa độ pixel thực tế cho precision */
    var W = elW, H = elH;
    var padL = 68, padR = 20, padT = 30, padB = 40;
    var chartW = W - padL - padR;
    var chartH = H - padT - padB;

    var maxVal = Math.max(1, Math.max.apply(null, months.map(function(d) { return Math.max(d.afyp, d.kh); })));
    var niceMax = Math.pow(10, Math.floor(Math.log10(maxVal)));
    if (maxVal / niceMax > 5) niceMax *= 10;
    else if (maxVal / niceMax > 2) niceMax *= 5;
    else if (maxVal / niceMax > 1) niceMax *= 2;
    maxVal = niceMax;

    var slotW = chartW / 12;
    var barW = slotW * 0.55;
    var khBarW = barW + 6;

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">';

    /* === DEFS: gradients, filters === */
    svg += '<defs>';
    /* AFYP bar gradients by status */
    svg += '<linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ade80"/><stop offset="100%" stop-color="#16a34a"/></linearGradient>';
    svg += '<linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#d97706"/></linearGradient>';
    svg += '<linearGradient id="barRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f87171"/><stop offset="100%" stop-color="#dc2626"/></linearGradient>';
    svg += '<linearGradient id="barKh" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35"/><stop offset="100%" stop-color="#1e40af" stop-opacity="0.18"/></linearGradient>';
    /* Area fill under trend line */
    svg += '<linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25"/><stop offset="100%" stop-color="#38bdf8" stop-opacity="0.02"/></linearGradient>';
    /* Glow filter for line */
    svg += '<filter id="glowLine" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    /* Shadow for bars */
    svg += '<filter id="barShadow" x="-10%" y="-5%" width="120%" height="115%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/></filter>';
    svg += '</defs>';

    /* === GRID LINES + Y-AXIS LABELS === */
    for (var gi = 0; gi <= 5; gi++) {
        var gy = padT + chartH - (chartH * gi / 5);
        svg += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="#1e3a5f" stroke-width="1" stroke-dasharray="' + (gi === 0 ? '0' : '4,4') + '"/>';
        var gVal = maxVal * gi / 5;
        var gLabel = gVal >= 1e9 ? (gVal / 1e9).toFixed(1) + ' tỷ' : gVal >= 1e6 ? (gVal / 1e6).toFixed(0) + ' tr' : gVal >= 1e3 ? (gVal / 1e3).toFixed(0) + 'k' : gVal.toFixed(0);
        svg += '<text x="' + (padL - 8) + '" y="' + (gy + 4).toFixed(1) + '" fill="#6b8aaa" font-size="11" text-anchor="end" font-family="inherit">' + gLabel + '</text>';
    }

    /* === BARS === */
    var fmtShort = function(v) { return v >= 1e9 ? (v/1e9).toFixed(1) + ' tỷ' : v >= 1e6 ? (v/1e6).toFixed(0) + ' tr' : v >= 1e3 ? (v/1e3).toFixed(0) + 'k' : v.toFixed(0); };
    var linePoints = [];
    var areaPoints = [];

    for (var mi = 0; mi < 12; mi++) {
        var d = months[mi];
        var cx = padL + slotW * mi + slotW / 2;

        /* KH bar (nền rộng hơn, mờ) */
        if (d.kh > 0) {
            var khH = d.kh / maxVal * chartH;
            var khX = cx - khBarW / 2;
            svg += '<rect x="' + khX.toFixed(1) + '" y="' + (padT + chartH - khH).toFixed(1) + '" width="' + khBarW.toFixed(1) + '" height="' + khH.toFixed(1) + '" rx="5" fill="url(#barKh)"/>';
        }

        /* AFYP bar (gradient + shadow + rounded top) */
        if (d.afyp > 0) {
            var afypH = d.afyp / maxVal * chartH;
            var pct = d.kh > 0 ? (d.afyp / d.kh * 100) : 0;
            var gradId = pct >= 100 ? 'barGreen' : pct >= 70 ? 'barGold' : 'barRed';
            var barX = cx - barW / 2;
            svg += '<rect x="' + barX.toFixed(1) + '" y="' + (padT + chartH - afypH).toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + afypH.toFixed(1) + '" rx="5" fill="url(#' + gradId + ')" filter="url(#barShadow)"/>';

            /* Giá trị trên đầu cột */
            var valColor = pct >= 100 ? '#4ade80' : pct >= 70 ? '#fbbf24' : '#f87171';
            svg += '<text x="' + cx.toFixed(1) + '" y="' + (padT + chartH - afypH - 8).toFixed(1) + '" fill="' + valColor + '" font-size="11" font-weight="700" text-anchor="middle" font-family="inherit">' + fmtShort(d.afyp) + '</text>';

            /* Tỷ lệ % nhỏ dưới giá trị */
            if (d.kh > 0) {
                svg += '<text x="' + cx.toFixed(1) + '" y="' + (padT + chartH - afypH - 20).toFixed(1) + '" fill="' + valColor + '" font-size="9" font-weight="600" text-anchor="middle" opacity="0.7" font-family="inherit">' + pct.toFixed(0) + '%</text>';
            }

            /* Line point */
            linePoints.push(cx.toFixed(1) + ',' + (padT + chartH - afypH).toFixed(1));
            areaPoints.push(cx.toFixed(1) + ',' + (padT + chartH - afypH).toFixed(1));
        }

        /* Month label */
        svg += '<text x="' + cx.toFixed(1) + '" y="' + (H - 12) + '" fill="#8faabe" font-size="11" text-anchor="middle" font-weight="600" font-family="inherit">' + d.label + '</text>';
    }

    /* === AREA FILL under trend line === */
    if (areaPoints.length > 1) {
        var areaPath = 'M' + areaPoints[0];
        for (var ai = 1; ai < areaPoints.length; ai++) areaPath += ' L' + areaPoints[ai];
        /* Close to baseline */
        var lastParts = areaPoints[areaPoints.length - 1].split(',');
        var firstParts = areaPoints[0].split(',');
        areaPath += ' L' + lastParts[0] + ',' + (padT + chartH);
        areaPath += ' L' + firstParts[0] + ',' + (padT + chartH);
        areaPath += ' Z';
        svg += '<path d="' + areaPath + '" fill="url(#areaFill)"/>';
    }

    /* === TREND LINE with glow === */
    if (linePoints.length > 1) {
        svg += '<polyline points="' + linePoints.join(' ') + '" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#glowLine)"/>';
        /* Dots */
        linePoints.forEach(function(pt) {
            var parts = pt.split(',');
            svg += '<circle cx="' + parts[0] + '" cy="' + parts[1] + '" r="5" fill="#0b1a2e" stroke="#38bdf8" stroke-width="2.5"/>';
            svg += '<circle cx="' + parts[0] + '" cy="' + parts[1] + '" r="2" fill="#38bdf8"/>';
        });
    }

    svg += '</svg>';

    /* Legend */
    var legendHtml = '<div class="chart-legend">' +
        '<div class="legend-item"><div class="legend-dot" style="background:linear-gradient(180deg,#3b82f6,#1e40af);opacity:0.4;width:12px;height:12px;border-radius:3px"></div>Kế hoạch</div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:linear-gradient(180deg,#4ade80,#16a34a);width:12px;height:12px;border-radius:3px"></div>Đạt KH</div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:linear-gradient(180deg,#fbbf24,#d97706);width:12px;height:12px;border-radius:3px"></div>Gần đạt</div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:linear-gradient(180deg,#f87171,#dc2626);width:12px;height:12px;border-radius:3px"></div>Chưa đạt</div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:#38bdf8;border-radius:50%;width:10px;height:10px;box-shadow:0 0 6px #38bdf8"></div>Xu hướng</div>' +
        '</div>';

    chartEl.innerHTML = svg + legendHtml;
}

function renderMain(ky) {
    var kyRows = DATA.filter(function(x) { return x.ky === ky; });
    var list = kyRows.filter(function(x) { return x.ten_nhan_vien; });
    var box = $('main-content'), ctyBox = $('kpi-company');
    ctyBox.innerHTML = '';
    dashboardState.ky = ky;
    dashboardState.adGroups = {};
    renderNoticeBar(ky);
    renderLinkButtons(ky);
    
    $('kpi-company').style.display = '';
    $('nav-grid').style.display = '';
    $('sec-divider').style.display = '';
    $('main-content').style.display = '';

    var total = { ten: 'Công Ty', afyp: 0, kh: 0, lhd: 0, td: 0, hdChuan: 0, tyTrong: 0, tyTrongWeighted: 0, tyTrongCount: 0 }, delay = 0;
    var htmlParts = [];

    for (let pName in CO_CAU) {
        let p = { ten: pName, afyp: 0, kh: 0, lhd: 0, td: 0, hdChuan: 0, tyTrong: 0, tyTrongWeighted: 0, tyTrongCount: 0, ads: [], noAds: pName === 'BANCA - PA' };
        
        CO_CAU[pName].forEach(function(adKey) {
            var row = list.find(function(x) {
                var ten = normKey(x.ten_nhan_vien);
                var key = normKey(adKey);
                return ten && key && (ten === key || ten.indexOf(key) !== -1 || key.indexOf(ten) !== -1);
            });
            if (row) {
                var tyTrong = num(row.ty_trong);
                var groups = collectManagedGroups(HIERARCHY_DATA, adKey, row.ten_nhan_vien);
                var membersOnly = p.noAds ? collectManagedMembers(HIERARCHY_DATA, adKey, row.ten_nhan_vien) : [];
                /* Debug: log group collection results */
                console.log('[KPI-DEBUG]', adKey, '| HIERARCHY rows:', HIERARCHY_DATA.length, '| groups:', groups.length, '| membersOnly:', membersOnly.length);
                if (HIERARCHY_DATA.length > 0 && groups.length === 0 && !p.noAds) {
                    var sampleRow = HIERARCHY_DATA[0];
                    console.log('[KPI-DEBUG] Sample HIERARCHY row keys:', Object.keys(sampleRow).join(','));
                    console.log('[KPI-DEBUG] Sample row.ad:', sampleRow.ad, '| row.nhom:', sampleRow.nhom);
                }
                var d = {
                    ten: row.ten_nhan_vien,
                    managerKey: adKey,
                    afyp: num(row.afyp),
                    kh: num(row.ke_hoach_afyp),
                    lhd: num(row.luot_hoa_dong),
                    td: num(row.tuyen_dung),
                    hdChuan: num(row.luot_hd_chuan),
                    tyTrong: tyTrong,
                    groups: groups,
                    membersOnly: membersOnly
                };
                dashboardState.adGroups[adKey] = p.noAds
                    ? { managerName: row.ten_nhan_vien, mode: 'members', title: p.ten, members: membersOnly }
                    : { managerName: row.ten_nhan_vien, mode: 'groups', groups: groups };
                p.ads.push(d);
                p.afyp += d.afyp;
                p.kh += d.kh;
                p.lhd += d.lhd;
                p.td += d.td;
                p.hdChuan += d.hdChuan;
                if (!p.noAds) {
                    p.tyTrongWeighted += (d.afyp > 0 ? d.afyp : 1) * tyTrong;
                    p.tyTrongCount += (d.afyp > 0 ? d.afyp : 1);
                }
            }
        });

        p.tyTrong = p.tyTrongCount? (p.tyTrongWeighted / p.tyTrongCount) : 0;

        /* Wrap phong + ads in dept-section for desktop grid */
        var deptHtml = '<div class="dept-section">';
        deptHtml += buildPhongCard(p, delay);
        delay += 60;

        if (p.ads.length && !p.noAds) {
            /* Always render both mobile cards + desktop table; CSS handles visibility */
            deptHtml += '<div class="ad-grid">';
            p.ads.forEach(function(ad) {
                deptHtml += buildAdCard(ad, delay);
                delay += 30;
            });
            deptHtml += '</div>';
            deptHtml += buildAdTable(p.ads, delay);
        }
        deptHtml += '</div>';
        htmlParts.push(deptHtml);
        delay += 60;

        total.afyp += p.afyp;
        total.kh += p.kh;
        total.lhd += p.lhd;
        total.td += p.td;
        total.hdChuan += p.hdChuan;
        total.tyTrongWeighted += p.tyTrongWeighted;
        total.tyTrongCount += p.tyTrongCount;
    }

    total.tyTrong = total.tyTrongCount? (total.tyTrongWeighted / total.tyTrongCount) : 0;

    box.innerHTML = htmlParts.join('');
    /* Always render both company layouts; CSS will show the correct one */
    ctyBox.innerHTML = buildCtyCard(total) + buildCtyStrip(total);
    /* Desktop: move company card before desktop-split */
    if (window.innerWidth >= 900) {
        var split = $('desktop-split');
        if (split && ctyBox.parentNode !== split.parentNode) {
            split.parentNode.insertBefore(ctyBox, split);
        }
    }
    bindDashboardEvents();
    triggerAnimations();
    renderAfypChart();
}

/* ===== DESKTOP-SPECIFIC BUILDERS ===== */

/* Company strip: horizontal banner with KPI tiles */
function buildCtyStrip(item) {
    var pct = item.kh ? (item.afyp / item.kh * 100) : 0, cp = Math.min(pct, 100);
    var pctClass = pct >= 100 ? 'green' : pct >= 75 ? 'gold' : 'red';
    return '<div class="dsk-company">' +
        '<div class="dsk-cty-left">' +
        '<div class="dsk-cty-label"><i class="fa-solid fa-trophy" style="color:#f2b24d;margin-right:4px"></i>Tổng Công Ty</div>' +
        '<div class="dsk-cty-pct" data-pct="' + pct + '">0%</div>' +
        '<div class="dsk-cty-prog-wrap"><div class="dsk-cty-prog"><div class="dsk-cty-prog-fill" data-w="' + cp + '%"></div></div></div>' +
        '<div class="dsk-cty-afyp" data-count="' + item.afyp + '">0</div>' +
        '<div class="dsk-cty-kh">KH: ' + fmt(item.kh) + '</div>' +
        '</div>' +
        '<div class="dsk-cty-right">' +
        '<div class="dsk-cty-tile hd"><div class="dsk-cty-tile-label">Lượt HĐ</div><div class="dsk-cty-tile-val" data-count="' + item.lhd + '">0</div></div>' +
        '<div class="dsk-cty-tile td"><div class="dsk-cty-tile-label">Tuyển dụng</div><div class="dsk-cty-tile-val" data-count="' + item.td + '">0</div></div>' +
        '<div class="dsk-cty-tile chuan"><div class="dsk-cty-tile-label">Lượt chuẩn</div><div class="dsk-cty-tile-val" data-count="' + item.hdChuan + '">0</div></div>' +
        '<div class="dsk-cty-tile ip"><div class="dsk-cty-tile-label">IP/AFYP</div><div class="dsk-cty-tile-val">' + esc(fmtTyTrong(item.tyTrong)) + '</div></div>' +
        '</div>' +
        '</div>';
}

/* AD table: compact table for desktop department sections */
function buildAdTable(ads, delay) {
    var html = '<div class="dsk-ad-wrap"><table class="dsk-ad-table">';
    html += '<thead><tr>' +
        '<th>AD</th><th>% KH</th><th>AFYP</th><th>HĐ</th><th>TD</th><th>Chuẩn</th><th>IP</th><th></th>' +
        '</tr></thead><tbody>';
    ads.forEach(function(ad, i) {
        var pct = ad.kh ? (ad.afyp / ad.kh * 100) : 0;
        var cp = Math.min(pct, 100);
        var pctClass = pct >= 100 ? 'green' : pct >= 75 ? 'gold' : 'red';
        var progStart = progressColor(Math.max(pct - 24, 0));
        var progEnd = progressColor(pct);
        html += '<tr class="anim-in" data-ad-key="' + esc(ad.managerKey || '') + '" style="animation-delay:' + (delay + i * 30) + 'ms">' +
            '<td><span class="dsk-ad-name">' + esc(ad.ten) + '</span></td>' +
            '<td><span class="dsk-ad-pct ' + pctClass + '">' + pct.toFixed(0) + '%</span></td>' +
            '<td>' + fmt(ad.afyp) + '</td>' +
            '<td>' + ad.lhd + '</td>' +
            '<td>' + ad.td + '</td>' +
            '<td>' + ad.hdChuan + '</td>' +
            '<td>' + esc(fmtTyTrong(ad.tyTrong)) + '</td>' +
            '<td><span class="dsk-ad-mini-prog"><span class="dsk-ad-mini-prog-fill" data-w="' + cp + '%" style="background:linear-gradient(90deg,' + progStart + ',' + progEnd + ')"></span></span></td>' +
            '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
}

function subsHTML(lhd, td, hdc, cls) {
    var c = cls || '';
    return '<div class="subs-row ' + c + '">' +
        '<div class="sub-pill"><span class="sub-label">Lượt HĐ</span> <span class="sub-num" data-count="' + lhd + '">0</span></div>' +
        '<div class="sub-pill"><span class="sub-label">Tuyển dụng</span> <span class="sub-num" data-count="' + td + '">0</span></div>' +
        '<div class="sub-pill"><span class="sub-label">HĐ chuẩn</span> <span class="sub-num" data-count="' + hdc + '">0</span></div>' +
        '</div>';
}

function buildCtyCard(item) {
    var pct = item.kh ? (item.afyp / item.kh * 100) : 0, cp = Math.min(pct, 100), pc = pctColor(pct);
    return '<div class="kpi-card kpi-cty anim-in' + glowCls(pct) + '">' +
        '<div class="cty-inner">' +
        '<div class="cty-head">' +
        '<div class="cty-name"><i class="fa-solid fa-trophy"></i><span>Tổng Công Ty</span></div>' +
        '<div class="cty-pct-num" data-pct="' + pct + '">0%</div>' +
        '</div>' +
        '<div class="cty-body">' +
        '<div class="afyp-kh-row">' +
        '<span class="afyp-big" data-count="' + item.afyp + '">0</span>' +
        '<span class="kh-small">/ KH: ' + fmt(item.kh) + '</span>' +
        '</div>' +
        '<div class="cty-progress"><div class="cty-progress-fill" data-w="' + cp + '%"></div></div>' +
        '</div>' +
        '<div class="cty-stats">' +
        '<div class="cty-stat hd"><div class="cty-stat-label">Lượt HĐ</div><div class="cty-stat-val" data-count="' + item.lhd + '">0</div></div>' +
        '<div class="cty-stat td"><div class="cty-stat-label">TD</div><div class="cty-stat-val" data-count="' + item.td + '">0</div></div>' +
        '<div class="cty-stat chuan"><div class="cty-stat-label">Lượt chuẩn</div><div class="cty-stat-val" data-count="' + item.hdChuan + '">0</div></div>' +
        '<div class="cty-stat ip"><div class="cty-stat-label">IP/AFYP</div><div class="cty-stat-val">' + esc(fmtTyTrong(item.tyTrong)) + '</div></div>' +
        '</div>' +
        '</div>' +
        '</div>';
}

function buildPhongCard(item, delay) {
    var hasPlan = !item.noAds;
    var pct = hasPlan && item.kh ? (item.afyp / item.kh * 100) : 0, cp = Math.min(pct, 100), pc = pctColor(pct);
    var bancaKey = item.noAds && item.ads && item.ads[0] ? item.ads[0].managerKey : '';
    var afypTrd = Math.round(num(item.afyp) / 1000000);
    var khTrd = Math.round(num(item.kh) / 1000000);

    /* Progress bar gradient for desktop card */
    var progStart = progressColor(Math.max(pct - 24, 0));
    var progEnd = progressColor(pct);

    /* === MOBILE phong card (original, hidden on desktop via CSS) === */
    var html = '<div class="kpi-card kpi-phong ' + (item.noAds ? 'banca ' : '') + 'anim-in' + glowCls(pct) + '"' + (bancaKey ? ' data-ad-key="' + esc(bancaKey) + '"' : '') + ' style="animation-delay:' + delay + 'ms">' +
        '<div class="phong-inner">' +
        '<div class="phong-head">' +
        '<span class="phong-name"><i class="fa-solid fa-clipboard"></i>Tổng hợp ' + item.ten + '</span>' +
        (hasPlan ? '<span class="phong-pct" data-pct="' + pct + '">0%</span>' : '') +
        '</div>' +
        '<div class="phong-body">' +
        '<div class="afyp-kh-row">' +
        '<span class="afyp-big" data-count="' + item.afyp + '">0</span>' +
        (hasPlan ? '<span class="kh-small">/ KH: ' + fmt(item.kh) + '</span>' : '') +
        '</div>' +
        (hasPlan ? '<div class="phong-progress"><div class="phong-progress-fill" data-w="' + cp + '%"></div></div>' : '') +
        '</div>' +
        '<div class="phong-stats">' +
        '<div class="phong-stat hd"><div class="phong-stat-label">Lượt HĐ</div><div class="phong-stat-val" data-count="' + item.lhd + '">0</div></div>' +
        (hasPlan ? '<div class="phong-stat td"><div class="phong-stat-label">TD</div><div class="phong-stat-val" data-count="' + item.td + '">0</div></div>' : '') +
        '<div class="phong-stat chuan"><div class="phong-stat-label">Lượt chuẩn</div><div class="phong-stat-val" data-count="' + item.hdChuan + '">0</div></div>' +
        (!item.noAds ? '<div class="phong-stat ip"><div class="phong-stat-label">IP/AFYP</div><div class="phong-stat-val">' + esc(fmtTyTrong(item.tyTrong)) + '</div></div>' : '') +
        '</div>' +
        (item.noAds ? '<div class="phong-drill"></div>' : '') +
        '</div>' +
        '</div>' +
        '</div>';

    /* === DESKTOP phong card — same structure as AD card, just is-phong class for different color === */
    html += '<div class="kpi-ad is-phong ' + (item.noAds ? 'banca ' : '') + 'anim-in' + glowCls(pct) + '"' + (bancaKey ? ' data-ad-key="' + esc(bancaKey) + '"' : '') + ' style="animation-delay:' + delay + 'ms">' +
        '<div class="ad-inner">' +
        '<div class="ad-top">' +
        '<div class="ad-left">' +
        '<div class="ad-name-row"><span class="ad-name"><i class="fa-solid fa-clipboard"></i>' + esc(item.ten) + '</span><span class="ad-pct">' + (hasPlan ? pct.toFixed(0) + '%' : '') + '</span></div>' +
        (hasPlan ? '<span class="ad-kh">KH: ' + fmt(item.kh) + 'trđ</span>' : '') +
        '</div>' +
        '<div class="ad-right"><div class="ad-stats">' +
        '<div class="ad-stat afyp"><span class="ad-stat-label">AFYP</span><span class="ad-stat-val"><span class="ad-stat-val-main" data-count="' + afypTrd + '">0</span><span class="ad-stat-unit">trđ</span></span></div>' +
        (hasPlan ? '<div class="ad-stat kh"><span class="ad-stat-label">KH</span><span class="ad-stat-val"><span class="ad-stat-val-main" data-count="' + khTrd + '">0</span><span class="ad-stat-unit">trđ</span></span></div>' : '') +
        '<div class="ad-stat lhd"><span class="ad-stat-label">Lượt HĐ</span><span class="ad-stat-val" data-count="' + item.lhd + '">0</span></div>' +
        (hasPlan ? '<div class="ad-stat td"><span class="ad-stat-label">TD</span><span class="ad-stat-val" data-count="' + item.td + '">0</span></div>' : '') +
        '<div class="ad-stat chuan"><span class="ad-stat-label">Chuẩn</span><span class="ad-stat-val" data-count="' + item.hdChuan + '">0</span></div>' +
        (!item.noAds ? '<div class="ad-stat ip"><span class="ad-stat-label">IP/AFYP</span><span class="ad-stat-val">' + esc(fmtTyTrong(item.tyTrong)) + '</span></div>' : '') +
        '</div>' +
        (hasPlan ? '<div class="ad-progress"><div class="ad-progress-fill" data-w="' + cp + '%" style="background:linear-gradient(90deg,' + progStart + ',' + progEnd + ')"></div></div>' : '') +
        '</div>' +
        '</div>' +
        (item.noAds ? '<div class="ad-drill"></div>' : '') +
        '</div>' +
        '</div>';

    return html;
}

function buildAdCard(item, delay) {
    var pct = item.kh ? (item.afyp / item.kh * 100) : 0, cp = Math.min(pct, 100);
    var progStart = progressColor(Math.max(pct - 24, 0));
    var progEnd = progressColor(pct);
    var khTrd = Math.round(num(item.kh) / 1000000);
    return '<div class="kpi-ad anim-in' + glowCls(pct) + '" data-ad-key="' + esc(item.managerKey || '') + '" style="animation-delay:' + delay + 'ms">' +
        '<div class="ad-inner">' +
        '<div class="ad-top">' +
        '<div class="ad-left">' +
        '<div class="ad-name-row"><span class="ad-name" title="'+esc(item.ten)+'">' + esc(item.ten) + '</span><span class="ad-pct">' + pct.toFixed(0) + '%</span></div>' +
        '<span class="ad-kh">KH: ' + fmt(item.kh) + 'trđ</span>' +
        '</div>' +
        '<div class="ad-right"><div class="ad-stats">' +
        '<div class="ad-stat afyp"><span class="ad-stat-label">AFYP</span><span class="ad-stat-val"><span class="ad-stat-val-main" data-count="' + (num(item.afyp) / 1000000).toFixed(0) + '">0</span><span class="ad-stat-unit">trđ</span></span></div>' +
        (khTrd ? '<div class="ad-stat kh"><span class="ad-stat-label">KH</span><span class="ad-stat-val"><span class="ad-stat-val-main" data-count="' + khTrd + '">0</span><span class="ad-stat-unit">trđ</span></span></div>' : '') +
        '<div class="ad-stat lhd"><span class="ad-stat-label">Lượt HĐ</span><span class="ad-stat-val" data-count="' + item.lhd + '">0</span></div>' +
        '<div class="ad-stat td"><span class="ad-stat-label">TD</span><span class="ad-stat-val" data-count="' + item.td + '">0</span></div>' +
        '<div class="ad-stat chuan"><span class="ad-stat-label">L.Chuẩn</span><span class="ad-stat-val" data-count="' + item.hdChuan + '">0</span></div>' +
        '<div class="ad-stat ip"><span class="ad-stat-label">IP/AFYP</span><span class="ad-stat-val">' + esc(fmtTyTrong(item.tyTrong)) + '</span></div>' +
        '</div>' +
        '<div class="ad-progress"><div class="ad-progress-fill" data-w="' + cp + '%" style="background:linear-gradient(90deg,' + progStart + ',' + progEnd + ')"></div></div></div>' +
        '</div>' +
        '<div class="ad-drill"></div>' +
        '</div>' +
        '</div>';
}

function triggerAnimations() {
    requestAnimationFrame(function() {
        var allFills = document.querySelectorAll('.mini-progress-fill[data-w],.cty-progress-fill[data-w],.phong-progress-fill[data-w],.ad-progress-fill[data-w],.dsk-cty-prog-fill[data-w],.dsk-ad-mini-prog-fill[data-w]');
        for (var i = 0; i < allFills.length; i++) allFills[i].style.width = allFills[i].dataset.w;
        var allCounts = document.querySelectorAll('[data-count]');
        for (var i = 0; i < allCounts.length; i++) animateValue(allCounts[i], num(allCounts[i].dataset.count));
        var allPcts = document.querySelectorAll('[data-pct]');
        for (var i = 0; i < allPcts.length; i++) animatePct(allPcts[i], parseFloat(allPcts[i].dataset.pct));
    });
}

/* ================= DETAIL VIEW LOGIC ================= */
function getDetailVal(row, tid) {
    var afyp = 0, kh = 0;
    if (!isNaN(tid)) {
        var m = parseInt(tid);
        afyp = num(row['t' + m]);
        kh = num(row['kh' + m]);
    } else if (tid === 'H1') {
        for (var hm = 1; hm <= 6; hm++) {
            afyp += num(row['t' + hm]);
            kh += num(row['kh' + hm]);
        }
    } else if (tid === 'Y') {
        for (var m = 1; m <= 12; m++) {
            afyp += num(row['t' + m]);
            kh += num(row['kh' + m]);
        }
    } else {
        var f = FUNCS.find(function(x) { return x.id === tid; });
        if (f) f.ms.forEach(function(m) {
            afyp += num(row['t' + parseInt(m)]);
            kh += num(row['kh' + parseInt(m)]);
        });
    }
    return { afyp: afyp, kh: kh };
}

function renderDtPicker() {
    var cur = timeState.detail;
    var mBox = $('dt-months'), fBox = $('dt-funcs');
    var mH = '';
    for (var i = 1; i <= 12; i++) {
        var m = String(i).padStart(2, '0');
        mH += '<button class="month-cell ' + (cur === m ? 'on' : '') + '" onclick="pickDt(\'' + m + '\')"><span class="mc-label">T' + i + '</span></button>';
    }
    mH += '<button class="month-cell func-cell-inline ' + (cur === 'H1' ? 'on' : '') + '" onclick="pickDt(\'H1\')" style="font-size:8px;font-weight:800;background:' + (cur === 'H1' ? '' : '#0a3434') + ';border-color:' + (cur === 'H1' ? '' : '#008080') + ';color:' + (cur === 'H1' ? '' : '#b9ffff') + '">6T</button>';
    FUNCS.forEach(function(f) {
        mH += '<button class="month-cell func-cell-inline ' + (cur === f.id ? 'on' : '') + '" onclick="pickDt(\'' + f.id + '\')" style="font-size:8px;font-weight:800;background:' + (cur === f.id ? '' : '#251e47') + ';border-color:' + (cur === f.id ? '' : '#3b2b63') + ';color:' + (cur === f.id ? '' : '#c4b8f0') + '">' + f.n.replace('Quý ', 'Q').replace('Cả năm', 'Năm') + '</button>';
    });
    mBox.classList.add('compact-filter');
    mBox.innerHTML = mH;
    fBox.innerHTML = '';
    fBox.style.display = 'none';
}

function getTotalForMonth(m) {
    var total = 0;
    DATA.filter(function(x) { return x.ten_nhan_vien && x.ten_nhan_vien.indexOf('Nhóm') === 0; }).forEach(function(r) {
        total += num(r['t' + m]);
    });
    return total;
}

function detailMetaText(t) {
    if (!isNaN(t)) return 'Tháng ' + t + '/' + CUR_YEAR + ' — Chỉ tiêu 8.0% năm';
    if (t === 'H1') return '6 tháng đầu năm ' + CUR_YEAR + ' — Chỉ tiêu 8.0% năm';
    if (t === 'Y') return 'Toàn năm ' + CUR_YEAR + ' — Chỉ tiêu 8.0% năm';
    var f = FUNCS.find(function(x) { return x.id === t; });
    return (f ? f.n + ' ' + CUR_YEAR : 'Tháng ' + CUR_MONTH + '/' + CUR_YEAR) + ' — Chỉ tiêu 8.0% năm';
}

window.pickDt = function(v) {
    timeState.detail = v;
    renderDtPicker();
    renderDetail();
};

function renderDetail() {
    var box = $('detail-list');
    $('detail-meta').textContent = detailMetaText(timeState.detail);
    var t = timeState.detail;
    var rows = DATA.filter(function(x) { return x.ten_nhan_vien && x.ten_nhan_vien.indexOf('Nhóm') === 0; });
    
    var items = rows.map(function(r) {
        var v = getDetailVal(r, t);
        var name = r.ten_nhan_vien.replace(/^Nhóm\s*/i, '');
        /* ★ Giá trị t1-t12, kh1-kh12 là VNĐ raw → chia 1.000.000 cho đơn vị trđ */
        var afypTrd = Math.round(v.afyp / 1000000);
        var khTrd = Math.round(v.kh / 1000000);
        var pct = khTrd ? (afypTrd / khTrd * 100) : 0;
        return { name: name, afyp: afypTrd, kh: khTrd, pct: pct };
    });

    items.sort(function(a, b) { return b.pct - a.pct; });
    renderTop3(items);
    if (!items.length) {
        box.innerHTML = '<div class="empty-state">Chưa có dữ liệu nhóm</div>';
        return;
    }

    var delay = 0;
    var htmlParts = [];
    items.forEach(function(it, idx) {
        var fill = Math.min(it.pct, 100);
        var pc = it.pct >= 90 ? '#7de8c8' : it.pct >= 70 ? '#8fd0ff' : '#7a9bbf';
        htmlParts.push('<div class="grp-item ' + (idx < 3 ? 'is-top' : '') + '" style="animation-delay:' + delay + 'ms">' +
            '<div class="grp-fill" data-w="' + fill + '%"></div>' +
            '<div class="grp-top-row">' +
            '<span class="grp-name">Nhóm ' + esc(it.name) + '</span>' +
            '<span class="grp-pct" data-pct="' + it.pct + '" style="color:' + pc + '">0%</span>' +
            '</div>' +
            '<div class="grp-bot-row">' +
            '<span class="grp-stats-inline"><span class="grp-stat-main">TH: <span data-count="' + it.afyp + '">0</span>trđ</span><span class="grp-stat-kh">/ KH: ' + fmt(it.kh) + 'trđ</span></span>' +
            '</div>' +
            '<div class="grp-prog-row"><div class="grp-prog"><div class="grp-prog-fill" data-w="' + fill + '%"></div></div></div>' +
            '</div>');
        delay += 40;
    });
    box.innerHTML = htmlParts.join('');

    requestAnimationFrame(function() {
        var allFills = box.querySelectorAll('.grp-fill[data-w],.grp-prog-fill[data-w]');
        for (var i = 0; i < allFills.length; i++) allFills[i].style.width = allFills[i].dataset.w;
        var allCounts = box.querySelectorAll('[data-count]');
        for (var i = 0; i < allCounts.length; i++) animateValue(allCounts[i], num(allCounts[i].dataset.count));
        var allPcts = box.querySelectorAll('[data-pct]');
        for (var i = 0; i < allPcts.length; i++) animatePct(allPcts[i], parseFloat(allPcts[i].dataset.pct), 900, 1);
    });
}

function renderTop3(items) {
    var box = $('top3-container');
    if (!items || !items.length) { box.innerHTML = ''; return; }
    
    var filtered = items.filter(function(x) { return x.kh > 0; });
    if (!filtered.length) {
        box.innerHTML = '<div class="top3-empty"><i class="fa-solid fa-chart-simple" style="margin-right:6px;opacity:.4"></i>Chưa có dữ liệu kế hoạch</div>';
        return;
    }

    filtered.sort(function(a, b) { return b.pct - a.pct; });
    var top = filtered.slice(0, 3), order = [null, null, null], cls = ['t3-silver', 't3-gold', 't3-bronze'];
    
    order[0] = top.length > 1 ? top[1] : null; // Silver (Left)
    order[1] = top[0]; // Gold (Center)
    order[2] = top.length > 2 ? top[2] : null; // Bronze (Right)

    var crowns = ['<i class="fa-solid fa-award"></i>', '<i class="fa-solid fa-crown"></i>', '<i class="fa-solid fa-medal"></i>'];
    var h = '<div class="top3-section"><div class="top3-grid">';
    for (var i = 0; i < 3; i++) {
        var item = order[i];
        if (!item) { h += '<div></div>'; continue; }
        var isF = i === 1;
        h += '<div class="top3-card ' + (isF ? 'top3-first ' : '') + cls[i] + '" style="animation-delay:' + (i * 80) + 'ms">' +
            (isF? '<div class="top3-crown">' + crowns[i] + '</div>' : '') +
            '<div class="top3-rank"><span class="top3-rank-num">' + (i === 0 ? '2' : i === 1 ? '1' : '3') + '</span></div>' +
            '<div class="top3-name">Nhóm ' + esc(item.name) + '</div>' +
            '<div class="top3-val"><span data-count="' + item.afyp + '">0</span>trđ</div>' +
            '<div class="top3-bar"></div>' +
            '<div class="top3-pct">' + item.pct.toFixed(1) + '%</div>' +
            '</div>';
    }
    h += '</div></div>';
    box.innerHTML = h;

    requestAnimationFrame(function() {
        box.querySelectorAll('[data-count]').forEach(function(el) { animateValue(el, num(el.dataset.count), 800); });
    });
}

/* ================= CALENDAR VIEW LOGIC ================= */
function renderCalendar() {
    var box = $('calendar-body');
    var t = timeState.calendar;
    var selMonths = [];

    if (!isNaN(t)) {
        selMonths = [String(parseInt(t)).padStart(2, '0')];
    } else if (t === 'Y') {
        selMonths = MONTHS.slice();
    } else {
        var f = FUNCS.find(function(x) { return x.id === t; });
        if (f) selMonths = f.ms.slice();
    }

    var rows = DATA.filter(function(x) {
        if (!x.thangkh) return false;
        var m = String(parseInt(x.thangkh)).padStart(2, '0');
        return selMonths.indexOf(m) !== -1;
    }).sort(function(a, b) { return num(a.ngay_kh) - num(b.ngay_kh); });

    // Merge user entries from Neon API
    var userRows = (_calUserEntries || []).filter(function(x) {
        if (!x.thangkh) return false;
        return selMonths.indexOf(x.thangkh) !== -1;
    });

    if (!selMonths.length) {
        box.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--muted);font-style:italic;font-size:13px">Chưa có kế hoạch cho kỳ này</div>';
        return;
    }

    var month = selMonths[0];
    var monthNum = parseInt(month, 10);
    var daysInMonth = new Date(CUR_YEAR, monthNum, 0).getDate();
    var weekdayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    var byDay = {};
    var htmlParts = [];

    rows.forEach(function(r) {
        var day = num(r.ngay_kh);
        if (!day || day < 1 || day > daysInMonth) return;
        if (!byDay[day]) byDay[day] = [];
        r._isUser = false;
        byDay[day].push(r);
    });

    // Add user entries
    userRows.forEach(function(r) {
        var day = num(r.ngay_kh);
        if (!day || day < 1 || day > daysInMonth) return;
        if (!byDay[day]) byDay[day] = [];
        r._isUser = true;
        byDay[day].push(r);
    });

    for (var day = 1; day <= daysInMonth; day++) {
        var dateObj = new Date(CUR_YEAR, monthNum - 1, day);
        var weekday = dateObj.getDay();
        var plans = byDay[day] || [];
        var isToday = day === NOW.getDate() && month === CUR_MONTH;
        var rowCls = ['cal-row'];
        if (isToday) rowCls.push('is-today');
        if (weekday === 6 || weekday === 0) rowCls.push('is-weekend');
        if (weekday === 0) rowCls.push('is-sunday');

        // Check if any plan is user entry for row highlighting
        var hasUserEntry = plans.some(function(r) { return r._isUser; });
        if (hasUserEntry) rowCls.push('cal-entry-user');

        var contentHtml = plans.length? plans.map(function(r) {
            return '<span class="cal-line">' + esc(r.noi_dung || '') + '</span>';
        }).join('') : '<span class="cal-empty"></span>';

        var ownerMap = {}, owners = [];
        plans.forEach(function(r) {
            var owner = '';
            if (r.phu_trach) {
                owner = String(r.phu_trach).trim();
            }
            if (!owner) {
                var altKeys = ['p_trach','ptrach','nguoi_phu_trach','nguoi_thuc_hien'];
                for (var ai = 0; ai < altKeys.length; ai++) {
                    if (r[altKeys[ai]]) { owner = String(r[altKeys[ai]]).trim(); break; }
                }
            }
            if (!owner) {
                for (var k in r) {
                    if (!r.hasOwnProperty(k)) continue;
                    var nk = String(k).toLowerCase();
                    if (nk === 'phu_trach' || nk.indexOf('trach') !== -1 || nk === 'p_trach' || nk === 'ptrach' || nk === 'nguoi_thuc_hien' || nk.indexOf('nguoi_phu') !== -1 || nk.indexOf('phu_trach') !== -1 || nk.indexOf('p_tr') !== -1) {
                        var v = String(r[k] || '').trim();
                        if (v) { owner = v; break; }
                    }
                }
            }
            if (!owner && r.phong_ban) {
                owner = String(r.phong_ban).trim();
            }
            if (owner && !ownerMap[owner]) {
                ownerMap[owner] = true;
                owners.push(owner);
            }
        });
        var ownerHtml = owners.length? owners.map(function(owner) {
            return '<span class="cal-line">' + esc(owner) + '</span>';
        }).join('') : '';

        htmlParts.push('<div class="' + rowCls.join(' ') + '" style="animation-delay:' + ((day - 1) * 22) + 'ms">' +
            '<div class="cal-day"><span class="cal-day-num">' + day + '</span><span class="cal-day-week">' + weekdayNames[weekday] + '</span></div>' +
            '<div class="cal-text">' + contentHtml + '</div>' +
            '<div class="cal-owner">' + ownerHtml + '</div>' +
            '</div>');
    }
    box.innerHTML = htmlParts.join('');
}

function renderCalFilter() {
    var cur = timeState.calendar;
    var mBox = $('cal-filter'), fBox = $('cal-func');
    var mH = '';
    for (var i = 1; i <= 12; i++) {
        var m = String(i).padStart(2, '0');
        mH += '<button class="cal-fbtn ' + (cur === m ? 'on' : '') + '" onclick="pickCal(\'' + m + '\')">T' + i + '</button>';
    }
    mBox.innerHTML = mH;
    fBox.innerHTML = '';
    fBox.style.display = 'none';
}

window.pickCal = function(v) {
    timeState.calendar = v;
    renderCalFilter();
    renderCalendar();
};

/* ================= CALENDAR INLINE EDITOR (Neon API) ================= */
var CAL_API_BASE = '/api/entries';
var _calUnlocked = false;
var _calSelectedPT = '';
var _calEditingId = 0;
var _calUserEntries = []; // cache từ Neon API

// API base URL — tự động detect Vercel domain
function calApiUrl(path) {
    var base = window.location.origin;
    // Nếu chạy local, dùng Vercel URL
    if (base.indexOf('localhost') !== -1 || base.indexOf('127.0.0.1') !== -1) {
        base = 'https://angiang2026.vercel.app';
    }
    return base + path;
}

// Open calendar popup
window.calOpenPopup = function() {
    var overlay = document.getElementById('cal-popup-overlay');
    var popup = document.getElementById('cal-popup');
    if (!overlay || !popup) return;
    overlay.classList.add('open');
    popup.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Reset form
    if (!_calUnlocked) {
        var form = document.getElementById('cal-popup-form');
        if (form) form.classList.remove('open');
        var pwInput = document.getElementById('cal-popup-pw-input');
        var pwBtn = document.getElementById('cal-popup-pw-btn');
        if (pwInput) { pwInput.value = ''; pwInput.style.borderColor = ''; }
        if (pwBtn) { pwBtn.textContent = 'Mở khóa'; pwBtn.classList.remove('unlocked'); }
    }
    calPopupRenderList();
};

// Close calendar popup
window.calClosePopup = function() {
    var overlay = document.getElementById('cal-popup-overlay');
    var popup = document.getElementById('cal-popup');
    if (overlay) overlay.classList.remove('open');
    if (popup) popup.classList.remove('open');
    document.body.style.overflow = '';
};

// Unlock popup with password
window.calPopupUnlock = function() {
    var pwInput = document.getElementById('cal-popup-pw-input');
    var pwBtn = document.getElementById('cal-popup-pw-btn');
    var form = document.getElementById('cal-popup-form');
    if (!pwInput || !pwBtn || !form) return;

    if (_calUnlocked) {
        _calUnlocked = false;
        pwBtn.textContent = 'Mở khóa';
        pwBtn.classList.remove('unlocked');
        form.classList.remove('open');
        pwInput.value = '';
        return;
    }

    if (pwInput.value === '123456') {
        _calUnlocked = true;
        pwBtn.textContent = 'Đã mở khóa ✓';
        pwBtn.classList.add('unlocked');
        form.classList.add('open');
        // Set default month to current calendar view
        var curMonth = timeState.calendar;
        if (curMonth && !isNaN(curMonth)) {
            var mSel = document.getElementById('cal-popup-month');
            if (mSel) mSel.value = String(parseInt(curMonth)).padStart(2, '0');
        }
        // Set default day to today
        var dayInput = document.getElementById('cal-popup-day');
        if (dayInput && !dayInput.value) {
            dayInput.value = NOW.getDate();
        }
        calPopupValidateForm();
    } else {
        pwInput.style.borderColor = '#ff6b6b';
        pwInput.value = '';
        pwInput.setAttribute('placeholder', 'Sai mật khẩu!');
        setTimeout(function() {
            pwInput.style.borderColor = '';
            pwInput.setAttribute('placeholder', 'Nhập mật khẩu...');
        }, 1500);
    }
};

// Pick phu_trach inside popup
window.calPopupPickPT = function(btn) {
    var pt = btn.getAttribute('data-pt');
    var allBtns = document.querySelectorAll('.cal-popup-pt-btn');
    if (_calSelectedPT === pt) {
        _calSelectedPT = '';
        allBtns.forEach(function(b) { b.classList.remove('on'); });
    } else {
        _calSelectedPT = pt;
        allBtns.forEach(function(b) { b.classList.remove('on'); });
        btn.classList.add('on');
    }
    calPopupValidateForm();
};

// Validate popup form
function calPopupValidateForm() {
    var day = document.getElementById('cal-popup-day');
    var content = document.getElementById('cal-popup-content');
    var saveBtn = document.getElementById('cal-popup-save-btn');
    if (!saveBtn) return;
    var valid = day && day.value && content && content.value.trim() && _calSelectedPT;
    saveBtn.disabled = !valid;
}

// Save entry via popup
window.calPopupSaveEntry = async function() {
    var day = document.getElementById('cal-popup-day');
    var month = document.getElementById('cal-popup-month');
    var content = document.getElementById('cal-popup-content');
    var saveBtn = document.getElementById('cal-popup-save-btn');
    var statusEl = document.getElementById('cal-popup-status');

    if (!day || !month || !content || !saveBtn) return;

    var ngay_kh = parseInt(day.value);
    var thangkh = month.value;
    var noi_dung = content.value.trim();
    var phu_trach = _calSelectedPT;

    if (!ngay_kh || !thangkh || !noi_dung || !phu_trach) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Đang lưu...';
    if (statusEl) { statusEl.style.display = 'inline'; statusEl.className = 'cal-popup-status loading'; statusEl.textContent = 'Đang gửi...'; }

    try {
        var isEdit = _calEditingId > 0;
        var url = calApiUrl('/api/entries' + (isEdit ? '?id=' + _calEditingId + '&pw=123456' : ''));
        var response = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ngay_kh: ngay_kh, thangkh: thangkh, noi_dung: noi_dung, phu_trach: phu_trach })
        });

        if (!response.ok) {
            var errData = await response.json().catch(function() { return {}; });
            throw new Error(errData.error || 'Lỗi server');
        }

        // Clear form
        content.value = '';
        _calSelectedPT = '';
        _calEditingId = 0;
        document.querySelectorAll('.cal-popup-pt-btn').forEach(function(b) { b.classList.remove('on'); });

        saveBtn.textContent = 'Đã lưu ✓';
        if (statusEl) { statusEl.className = 'cal-popup-status ok'; statusEl.textContent = 'Lưu thành công!'; }

        setTimeout(function() {
            saveBtn.textContent = 'Lưu';
            saveBtn.disabled = true;
            if (statusEl) statusEl.style.display = 'none';
        }, 2000);

        // Refresh calendar
        await calLoadUserEntries();
        renderCalendar();
        calPopupRenderList();

    } catch (err) {
        console.error('[CalSave]', err);
        saveBtn.textContent = 'Lưu';
        saveBtn.disabled = false;
        if (statusEl) { statusEl.className = 'cal-popup-status err'; statusEl.textContent = 'Lỗi: ' + err.message; }
        setTimeout(function() { if (statusEl) statusEl.style.display = 'none'; }, 3000);
    }
};

// Edit entry from popup list
window.calPopupEditEntry = function(id) {
    var entry = _calUserEntries.find(function(e) { return e.id === id; });
    if (!entry) return;
    _calEditingId = id;
    var dayInput = document.getElementById('cal-popup-day');
    var monthSel = document.getElementById('cal-popup-month');
    var contentInput = document.getElementById('cal-popup-content');
    var saveBtn = document.getElementById('cal-popup-save-btn');

    if (dayInput) dayInput.value = entry.ngay_kh;
    if (monthSel) monthSel.value = entry.thangkh;
    if (contentInput) contentInput.value = entry.noi_dung || '';

    _calSelectedPT = entry.phu_trach || '';
    document.querySelectorAll('.cal-popup-pt-btn').forEach(function(b) {
        b.classList.toggle('on', b.getAttribute('data-pt') === _calSelectedPT);
    });

    if (saveBtn) saveBtn.textContent = 'Cập nhật';
    calPopupValidateForm();
};

// Delete entry from popup list
window.calPopupDeleteEntry = async function(id) {
    if (!confirm('Xóa mục này?')) return;
    try {
        var response = await fetch(calApiUrl('/api/entries?id=' + id + '&pw=123456'), {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Xóa thất bại');
        await calLoadUserEntries();
        renderCalendar();
        calPopupRenderList();
    } catch (err) {
        alert('Lỗi xóa: ' + err.message);
    }
};

// Render entry list in popup
function calPopupRenderList() {
    var listEl = document.getElementById('cal-popup-list-items');
    if (!listEl) return;
    var curMonth = timeState.calendar;
    var month = !isNaN(curMonth) ? String(parseInt(curMonth)).padStart(2, '0') : '';
    var entries = (_calUserEntries || []).filter(function(e) {
        if (!month) return true;
        return e.thangkh === month;
    }).sort(function(a, b) { return num(a.ngay_kh) - num(b.ngay_kh); });

    if (!entries.length) {
        listEl.innerHTML = '<div class="cal-popup-empty">Chưa có kế hoạch nào</div>';
        return;
    }

    var html = '';
    entries.forEach(function(e) {
        html += '<div class="cal-popup-item">' +
            '<span class="cal-popup-item-day">' + (e.ngay_kh || '') + '</span>' +
            '<span class="cal-popup-item-content" title="' + esc(e.noi_dung || '') + '">' + esc(e.noi_dung || '') + '</span>' +
            '<span class="cal-popup-item-pt">' + esc(e.phu_trach || '') + '</span>' +
            '<button class="cal-popup-item-btn edit" onclick="calPopupEditEntry(' + e.id + ')" title="Sửa"><i class="fa-solid fa-pen"></i></button>' +
            '<button class="cal-popup-item-btn del" onclick="calPopupDeleteEntry(' + e.id + ')" title="Xóa"><i class="fa-solid fa-trash"></i></button>' +
            '</div>';
    });
    listEl.innerHTML = html;
}

// Add event listeners for popup validation
setTimeout(function() {
    var dayEl = document.getElementById('cal-popup-day');
    var contentEl = document.getElementById('cal-popup-content');
    if (dayEl) dayEl.addEventListener('input', calPopupValidateForm);
    if (contentEl) contentEl.addEventListener('input', calPopupValidateForm);
}, 500);

// Load user entries from API
async function calLoadUserEntries() {
    try {
        // Load entries for all 12 months to have them ready
        var promises = [];
        for (var m = 1; m <= 12; m++) {
            var month = String(m).padStart(2, '0');
            promises.push(
                fetch(calApiUrl('/api/entries?month=' + month))
                    .then(function(r) { return r.ok ? r.json() : []; })
                    .catch(function() { return []; })
            );
        }
        var results = await Promise.all(promises);
        _calUserEntries = [];
        results.forEach(function(entries) {
            _calUserEntries = _calUserEntries.concat(entries);
        });
    } catch (err) {
        console.error('[CalLoad]', err);
        _calUserEntries = [];
    }
}

// Load user entries when calendar view is shown
var _calLoaded = false;

/* ================= RACE / POLICY PAGE FACTORY ================= */
var TD_PW = '922129';
var TD_SID = '1Mzag5EkMGO8YVnNDbLi7YBxuH3b6nlMknxdHsIuDA60';
try { var _ovSID = localStorage.getItem('kpi_link_TD_SID'); if (_ovSID) TD_SID = _ovSID; } catch(e) {}
var TD_TAB = 'DanhSach';
var TD_SCR = 'https://script.google.com/macros/s/AKfycbxuXDIIH5b1snWjaXUK87Kk6wx3Fs1hP4MG7akfhCVx7Cj_wSLJpeAEKcO-uJSadPRb/exec';
try { var _ovSCR = localStorage.getItem('kpi_link_TD_SCR'); if (_ovSCR) TD_SCR = _ovSCR; } catch(e) {}

function TD_gdc() { return 'https://docs.google.com/spreadsheets/d/' + TD_SID + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(TD_TAB); }
function TD_gtc(t) { return 'https://docs.google.com/spreadsheets/d/' + TD_SID + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(t); }
function TD_gdcAlt() { return 'https://docs.google.com/spreadsheets/d/' + TD_SID + '/export?format=csv&sheet=' + encodeURIComponent(TD_TAB); }
function TD_gtcAlt(t) { return 'https://docs.google.com/spreadsheets/d/' + TD_SID + '/export?format=csv&sheet=' + encodeURIComponent(t); }
function TD_csv(text) { if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1); return Papa.parse(text, { header: false, skipEmptyLines: 'greedy' }).data; }
function TD_fd(d) { if (!d) return '--'; var p = d.split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d; }
function TD_fdi(d) { if (!d) return ''; var p = d.split('/'); if (p.length === 3 && p[2].length === 4) return p[2] + '-' + p[1].padStart(2, '0') + '-' + p[0].padStart(2, '0'); if (d.indexOf('-') !== -1) return d; return ''; }
function TD_fdo(d) { if (!d) return ''; var p = d.split('-'); if (p.length === 3) return p[2] + '/' + p[1] + '/' + p[0]; return d; }
function TD_ced(rc, dc) {
    var c = 0;
    for (var i = 0; i < dc; i++) {
        var val = String(rc[i] || '').trim().toLowerCase();
        if (val === 'đạt' || val === '10000001111') c++;
    }
    return c;
}
async function TD_fetchText(urls) {
    var lastErr = new Error('Không tải được dữ liệu');
    for (var i = 0; i < urls.length; i++) {
        try {
            var res = await fetch(urls[i], { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            var text = await res.text();
            if (text && text.trim()) return text;
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr;
}

/* Compact group filter pinned to top-right of each table wrapper.
   groupColIdx = 0-based data column index of the "nhom" column,
   tdOffset    = number of leading <td> in tbody rows before data cells (1 if STT auto-prepended, 0 otherwise). */
function TD_attachGroupFilter(ct, groupColIdx, tdOffset) {
    if (groupColIdx == null || groupColIdx < 0) return;
    if (tdOffset == null) tdOffset = 1;
    var wraps = ct.querySelectorAll('.ptw');
    wraps.forEach(function(wrap) {
        var table = wrap.querySelector('table');
        if (!table || !table.tBodies.length) return;
        var tbody = table.tBodies[0];
        var rows = Array.prototype.slice.call(tbody.rows);
        if (rows.length < 2) return;
        var tdIdx = groupColIdx + tdOffset;
        var counts = {};
        rows.forEach(function(tr) {
            var td = tr.cells[tdIdx];
            if (!td) return;
            var v = (td.textContent || '').trim();
            if (v) counts[v] = (counts[v] || 0) + 1;
        });
        var keys = Object.keys(counts).sort(function(a, b) { return a.localeCompare(b, 'vi'); });
        if (keys.length < 2) return;
        /* Remove any previous filter bar that belongs to this wrapper */
        var prev = wrap.previousElementSibling;
        if (prev && prev.classList && prev.classList.contains('tbl-filter-bar')) prev.remove();
        var holder = document.createElement('div');
        holder.className = 'tbl-filter-bar';
        var pill = document.createElement('div');
        pill.className = 'tbl-filter';
        var optsHtml = '<option value="">Tất cả nhóm</option>';
        keys.forEach(function(k) {
            optsHtml += '<option value="' + esc(k) + '">' + esc(k) + ' (' + counts[k] + ')</option>';
        });
        pill.innerHTML = '<i class="fa-solid fa-filter"></i><select aria-label="Lọc theo nhóm">' + optsHtml + '</select>';
        holder.appendChild(pill);
        wrap.parentNode.insertBefore(holder, wrap);
        var sel = pill.querySelector('select');
        sel.addEventListener('change', function() {
            var v = sel.value;
            pill.classList.toggle('active', !!v);
            rows.forEach(function(tr) {
                var td = tr.cells[tdIdx];
                if (!v) { tr.style.display = ''; return; }
                tr.style.display = (td && (td.textContent || '').trim() === v) ? '' : 'none';
            });
        });
        sel.addEventListener('click', function(e) { e.stopPropagation(); });
    });
}

function TD_ws(data) {
    return fetch(TD_SCR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(function(r) { return r.json(); }).then(function(r) {
        if (!r.ok) throw new Error(r.error || 'Lỗi ghi');
        return true;
    }).catch(function() { return false; });
}

function createTDPage(cfg) {
    var P = cfg.prefix, pv = cfg.varName;
    var s = { programs: [], adm: false, er: null, dr: null, pd: null, ddOpen: false, inited: false, csvData: null, csvName: '' };

    function gid(id) { return document.getElementById(id); }
    
    function ha() {
        ['LoadW', 'ErrW', 'EmptyW', 'Grid'].forEach(function(k) { gid(P + k).style.display = 'none'; });
        gid(P + 'SyncOk').style.display = 'none';
        gid(P + 'SyncErr').style.display = 'none';
    }

    function ca() {
        try { s.adm = sessionStorage.getItem('td_a') === '1'; } catch (e) { s.adm = false; }
        uu();
    }

    function sa(v) {
        s.adm = v;
        try { sessionStorage.setItem('td_a', v ? '1' : '0'); } catch (e) { }
        uu();
    }

    function uu() {
        var a = gid(P + 'AdmBtn');
        if (a) a.classList.toggle('on', s.adm);
        ['DdLinks', 'DdOut', 'DdLock'].forEach(function(id) {
            var el = gid(P + id);
            if (el) el.style.display = s.adm ? 'flex': 'none';
        });
        var sp = gid(P + 'DdSep');
        if (sp) sp.style.display = s.adm ? 'block': 'none';
        
        var pe = gid(P + 'PopEdt');
        if (pe) pe.style.display = s.adm ? 'flex': 'none';
        
        gid(P + 'Container').querySelectorAll('.pcard-acts').forEach(function(el) {
            el.style.display = s.adm ? 'flex': 'none';
        });
    }

    function na(cb) { s.adm ? cb() : apw(cb); }
    function togDD() {
        if (!s.adm) { na(function() { s.ddOpen = true; gid(P + 'AdmDD').classList.add('show'); }); return; }
        s.ddOpen = !s.ddOpen;
        gid(P + 'AdmDD').classList.toggle('show', s.ddOpen);
    }
    /* admAdd removed - no manual input */
function admOut() { s.ddOpen = false; gid(P + 'AdmDD').classList.remove('show'); sa(false); toast('Đã đăng xuất', 'ok'); }
function admLock() { s.ddOpen = false; gid(P + 'AdmDD').classList.remove('show'); sa(false); toast('Đã khóa', 'ok'); }
    function admReload() { s.ddOpen = false; gid(P + 'AdmDD').classList.remove('show'); lfs(); }
    function admLinks() { s.ddOpen = false; gid(P + 'AdmDD').classList.remove('show'); na(openLinks); }

    function openLinks() {
        gid(P + 'LnkCSV').value = CSV_URL || '';
        gid(P + 'LnkPC').value = PHU_CAP_CSV_URL || '';
        gid(P + 'LnkSID').value = TD_SID || '';
        gid(P + 'LnkSCR').value = TD_SCR || '';
        gid(P + 'LinksMdl').classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function cLinks() { gid(P + 'LinksMdl').classList.remove('open'); document.body.style.overflow = ''; }
    function svLnk(key, inputId) {
        var val = gid(inputId).value.trim();
        if (!val) { toast('Nhập URL/ID', 'err'); return; }
        try { localStorage.setItem('kpi_link_' + key, val); } catch(e) {}
        if (key === 'CSV_URL') CSV_URL = val;
        else if (key === 'PHU_CAP_CSV_URL') { PHU_CAP_CSV_URL = val; HIERARCHY_CSV_URL = val; }
        else if (key === 'TD_SID') TD_SID = val;
        else if (key === 'TD_SCR') TD_SCR = val;
        cLinks();
        toast('Đã lưu! Đang tải lại...', 'ok');
        if (key === 'CSV_URL' || key === 'PHU_CAP_CSV_URL') { syncData(); }
        else { lfs(); }
    }

    function apw(cb) {
        s._pcb = cb;
        gid(P + 'PwInp').value = '';
        gid(P + 'PwErr').textContent = '';
        gid(P + 'PwInp').classList.remove('err');
        gid(P + 'PwMdl').classList.add('open');
        document.body.style.overflow = 'hidden';
        setTimeout(function() { gid(P + 'PwInp').focus(); }, 300);
    }
    function cpw() { gid(P + 'PwMdl').classList.remove('open'); document.body.style.overflow = ''; s._pcb = null; }
    function spw() {
        if (gid(P + 'PwInp').value === TD_PW) {
            sa(true); cpw(); toast('Đăng nhập thành công', 'ok');
            if (typeof s._pcb === 'function') s._pcb();
            s._pcb = null;
        } else {
            gid(P + 'PwInp').classList.add('err');
            gid(P + 'PwErr').textContent = 'Sai mật khẩu';
            gid(P + 'PwInp').value = '';
            setTimeout(function() { gid(P + 'PwInp').focus(); }, 100);
        }
    }

    async function lfs() {
        ha();
        gid(P + 'LoadW').style.display = 'block';
        try {
            var csv = await TD_fetchText([TD_gdc(), TD_gdcAlt()]);
            if (!csv || !csv.trim()) throw new Error('Tab trống.');
            var rows = TD_csv(csv);
            if (rows.length < 2) throw new Error('Chỉ có tiêu đề.');
            
            /* Ánh xạ tên cột → vị trí cột từ hàng tiêu đề */
            var dsHeaders = rows[0] || [];
            var dsColMap = {};
            for (var hi = 0; hi < dsHeaders.length; hi++) {
                var hn = normalizeHeaderName(dsHeaders[hi]);
                if (hn && !dsColMap.hasOwnProperty(hn)) dsColMap[hn] = hi;
            }
            /* Tìm chỉ mục cột theo nhiều tên có thể có */
            function dsCol(/* candidates */) {
                for (var ai = 0; ai < arguments.length; ai++) {
                    if (dsColMap.hasOwnProperty(arguments[ai])) return dsColMap[arguments[ai]];
                }
                return -1;
            }
            var ciName = dsCol('ten_chuong_trinh','ten','name','chuong_trinh');
            var ciPoster = dsCol('poster','poster_url','hinh','hinh_anh','image','url_hinh');
            var ciSheet = dsCol('sheet','sheet_name','ten_sheet','tab');
            var ciDateS = dsCol('ngay_bat_dau','date_start','tu_ngay','ngay_bd','bat_dau','ngay_bat_dau_kt');
            var ciDateE = dsCol('ngay_ket_thuc','date_end','den_ngay','ngay_kt','ket_thuc');
            var ciDatePH = dsCol('ngay_ph','ph_date','ph_han','han_ph','ngay_phat_hanh');
            var ciCols = dsCol('so_cot','cols','columns','so_cot_hien_thi','cot');
            var ciRows = dsCol('so_hang','rows','so_hang_hien_thi','hang');

            s.programs = [];
            for (var i = 1; i < rows.length; i++) {
                var r = rows[i];
                var nameVal = ciName >= 0 ? (r[ciName] || '').trim() : (r[0] || '').trim();
                if (!nameVal) continue;
                s.programs.push({
                    row: i + 1,
                    name: nameVal,
                    posterUrl: ciPoster >= 0 ? (r[ciPoster] || '').trim() : (r[1] || '').trim(),
                    sheetName: ciSheet >= 0 ? (r[ciSheet] || '').trim() : (r[2] || '').trim(),
                    dateStart: TD_fdi(ciDateS >= 0 ? (r[ciDateS] || '').trim() : (r[3] || '').trim()),
                    dateEnd: TD_fdi(ciDateE >= 0 ? (r[ciDateE] || '').trim() : (r[4] || '').trim()),
                    datePH: TD_fdi(ciDatePH >= 0 ? (r[ciDatePH] || '').trim() : (r[5] || '').trim()),
                    cols: parseInt(ciCols >= 0 ? r[ciCols] : r[6]) || 0,
                    rows: parseInt(ciRows >= 0 ? r[ciRows] : r[7]) || 0
                });
            }
            gid(P + 'SyncOk').style.display = 'inline-flex';
            gid(P + 'SyncErr').style.display = 'none';
            rc();
            uu();
        } catch (e) {
            gid(P + 'ErrMsg').textContent = e.message || 'Lỗi';
            gid(P + 'ErrW').style.display = 'block';
            gid(P + 'SyncErr').style.display = 'inline-flex';
        }
        gid(P + 'LoadW').style.display = 'none';
    }

    function rc() {
        var g = gid(P + 'Grid'), ew = gid(P + 'EmptyW');
        var filtered = s.programs.filter(function(p) { return cfg.filterFn(p.name); });
        if (!filtered.length) {
            ew.style.display = 'block';
            g.style.display = 'none';
            gid(P + 'CntB').style.display = 'none';
            return;
        }
        ew.style.display = 'none';
        g.style.display = 'grid';
        gid(P + 'CntB').style.display = 'inline-flex';
        gid(P + 'CntN').textContent = filtered.length;
        
        var h = '';
        for (var i = 0; i < filtered.length; i++) {
            var p = filtered[i], hasImg = !!p.posterUrl, dl = i * .06, pidx = s.programs.indexOf(p);
            h += '<div class="pcard" style="animation-delay:' + dl + 's" onclick="' + pv + '.op(' + pidx + ')">' +
                '<div class="pcard-acts" style="display:' + (s.adm ? 'flex' : 'none') + '">' +
                '<button class="ca-btn edt" onclick="event.stopPropagation();' + pv + '.na(function(){' + pv + '.oe(' + pidx + ')})" aria-label="Sửa"><i class="fa-solid fa-pen"></i></button>' +
                '<button class="ca-btn del" onclick="event.stopPropagation();' + pv + '.na(function(){' + pv + '.ad(' + pidx + ')})" aria-label="Xóa"><i class="fa-solid fa-trash"></i></button>' +
                '</div>' +
                '<div class="pcard-img">' +
                (hasImg ? '<img src="' + esc(p.posterUrl) + '" alt="' + esc(p.name) + '" loading="lazy" onerror="this.onerror=null;this.style.display=\'none\'">' : '') +
                (!hasImg ? '<div class="pcard-noimg"><i class="fa-regular fa-image"></i></div>' : '') +
                '<div class="pcard-grad"></div>' +
                '<div class="pcard-body">' +
                '<div class="pcard-name">' + esc(p.name) + '</div>' +
                '<div class="pcard-dates">' +
                '<span class="pcard-d"><i class="fa-solid fa-calendar-days"></i>' + TD_fd(p.dateStart) + '–' + TD_fd(p.dateEnd) + '</span>' +
                (p.datePH ? '<span class="pcard-d"><i class="fa-solid fa-flag-checkered"></i>PH: ' + TD_fd(p.datePH) + '</span>' : '') +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';
        }
        g.innerHTML = h;
    }

    /* oa() removed - no manual input for new programs */

    function oe(idx) {
        var p = s.programs[idx];
        if (!p) return;
        s.er = p.row;
        s._editIdx = idx;
        gid(P + 'MTtl').textContent = 'Sửa cột & hàng';
        gid(P + 'MSub').textContent = 'Cập nhật hàng ' + p.row;
        gid(P + 'MCols').value = p.cols || '';
        gid(P + 'MRows').value = p.rows || '';
        gid(P + 'Mdl').classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function cm() { gid(P + 'Mdl').classList.remove('open'); document.body.style.overflow = ''; s.er = null; }

    async function autoDet() {
        var tab = '';
        if (s.er && s._editIdx != null) { var prog = s.programs[s._editIdx]; if (prog) tab = prog.sheetName; }
        if (!tab) { toast('Không tìm thấy tên sheet', 'err'); return; }
        var btn = gid(P + 'AutoBtn');
        btn.classList.add('ld');
        btn.innerHTML = '<i class="fa-solid fa-spinner mr-1"></i>Nhận diện...';
        try {
            var csv = await TD_fetchText([TD_gtc(tab), TD_gtcAlt(tab)]);
            var rows = TD_csv(csv);
            if (!rows.length) throw new Error('Tab trống');
            gid(P + 'MCols').value = rows[0].length;
            gid(P + 'MRows').value = Math.max(rows.length - 1, 1);
            toast(rows[0].length + ' cột, ' + (rows.length - 1) + ' hàng', 'ok');
        } catch (e) { toast(e.message || 'Lỗi', 'err'); }
        finally {
            btn.classList.remove('ld');
            btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Tự động';
        }
    }

    async function savePrg() {
        var cols = parseInt(gid(P + 'MCols').value) || 0,
            rows = parseInt(gid(P + 'MRows').value) || 0;

        if (cols < 1 || cols > 20) { toast('Số cột 1-20', 'err'); return; }
        if (rows < 1 || rows > 500) { toast('Số hàng 1-500', 'err'); return; }

        var data = {
            action: 'edit',
            row: s.er,
            cot: cols,
            hang: rows
        };

        var ok = await TD_ws(data);
        if (ok) {
            toast('Đã cập nhật', 'ok');
            cm();
            await lfs();
        }
    }

    function ad(idx) {
        s.dr = s.programs[idx].row;
        gid(P + 'CfmTxt').textContent = '"' + s.programs[idx].name + '" sẽ bị xóa khỏi Sheet.';
        gid(P + 'CfmDel').classList.add('open');
    }

    function ccf() { gid(P + 'CfmDel').classList.remove('open'); s.dr = null; }
    async function ddl() {
        if (!s.dr) return;
        var ok = await TD_ws({ action: 'delete', row: s.dr });
if (ok) { toast('Đã xóa', 'ok'); ccf(); await lfs(); }
    }

    async function op(idx) {
        var p = s.programs[idx];
        if (!p) return;
        s.pd = p;
        var pw = gid(P + 'PopPoster'), hasImg = !!p.posterUrl;
        pw.innerHTML = '';
        if (hasImg) {
            var img = document.createElement('img');
            img.className = 'pop-poster';
            img.alt = p.name;
            img.src = p.posterUrl;
            img.onerror = function() { this.outerHTML = '<div class="pop-ph"><i class="fa-regular fa-image text-3xl" style="opacity:.3"></i></div>'; };
            pw.appendChild(img);
        } else {
            pw.innerHTML += '<div class="pop-ph"><i class="fa-regular fa-image text-3xl" style="opacity:.3"></i></div>';
        }
        gid(P + 'PopName').textContent = p.name;
        gid(P + 'PopName').className = 'fd text-xl font-bold' + (cfg.prefix === 'po' ? ' po-title' : '');
        gid(P + 'PopTag').style.display = 'none';
        var dateInfo = '';
        if (p.dateStart || p.dateEnd) dateInfo += '<i class="fa-solid fa-calendar-days"></i> ' + TD_fd(p.dateStart) + ' – ' + TD_fd(p.dateEnd);
        if (p.datePH) dateInfo += (dateInfo ? '    ' : '') + '<i class="fa-solid fa-flag-checkered"></i> PH: ' + TD_fd(p.datePH);
        if (dateInfo) {
            gid(P + 'PopSub').style.display = 'inline-flex';
            gid(P + 'PopSub').innerHTML = dateInfo;
        } else {
            gid(P + 'PopSub').style.display = 'none';
        }
        
        var ct = gid(P + 'PopCt');
        // Skeleton Loading for table
        var sc = Math.min(p.cols, 8), sr = Math.min(p.rows, 5);
        var sh = '', sb = '';
        for(var c=0; c<sc; c++) sh += '<th><div class="sk" style="width:'+(55+Math.random()*55)+'px"></div></th>';
        for(var r=0; r<sr; r++) {
            sb += '<tr>';
            for(var c2=0; c2<sc; c2++) sb += '<td><div class="sk" style="width:'+(45+Math.random()*60)+'px"></div></td>';
            sb += '</tr>';
        }
        var skTableHtml = '<div class="ptw"><table class="pt"><thead><tr>'+sh+'</thead><tbody>'+sb+'</tbody></table></div>';
        ct.innerHTML = skTableHtml;

        gid(P + 'Popup').classList.add('open');
        document.body.style.overflow = 'hidden';

        // Load real data
        try {
            var csv = await TD_fetchText([TD_gtc(p.sheetName), TD_gtcAlt(p.sheetName)]);
            rpt(ct, csv, p.cols, p.rows, P, p.name);
        } catch (err) {
            ct.innerHTML = '<div style="text-align:center;padding:50px 20px;color:var(--td-fgm)"><i class="fa-solid fa-circle-exclamation block text-3xl mb-3" style="color:var(--td-red)"></i><p class="text-base font-semibold mb-1">Lỗi tải dữ liệu</p><p class="text-sm mb-4">' + esc(err.message || '') + '</p><button onclick="' + pv + '.rpop()" class="bp text-sm"><i class="fa-solid fa-rotate mr-1"></i>Thử lại</button></div>';
        }
    }

    function rpop() { if (!s.pd) return; var idx = s.programs.indexOf(s.pd); if (idx >= 0) op(idx); }
    function cpop() { gid(P + 'Popup').classList.remove('open'); document.body.style.overflow = ''; s.pd = null; }
    function efp() { if (!s.pd) return; var idx = s.programs.indexOf(s.pd); cpop(); na(function() { setTimeout(function() { oe(idx); }, 350); }); }

    /* === UNIFIED TABLE RENDERER — cùng 1 quy tắc cho 3 trang === */
    function rpt(ct, csv, cols, rows, pagePrefix, programName) {
        var all = TD_csv(csv);
        if (!all.length) { ct.innerHTML = '<div style="text-align:center;padding:40px;color:var(--td-fgm)">Tab trống</div>'; return; }
        /* Lưu dữ liệu CSV vào state để export Excel */
        s.csvData = all;
        s.csvName = programName || 'Du_lieu';

        /* === HÀM TIỆN ÍCH === */
        /* Normalize: bỏ dấu, lowercase, chỉ giữ a-z0-9 */
        function hk(v) {
            return String(v || '').trim().toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[đĐ]/g, 'd').replace(/[^a-z0-9]+/g, ' ')
                .replace(/\s+/g, ' ').trim();
        }
        function escH(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

        /* === PHÂN LOẠI CỘT — 6 NHÓM ===
           Quy tắc (từ người dùng):
           - Cột 1–4 (index 0–3): luôn là 'info' → nền header #000044, nền body trắng
           - Từ cột 5 (index 4+) phân loại theo NỘI DUNG header:
             1) textInfo: thông tin phụ (ngày cấp, sl tvv, chức vụ, chặng...) → header #103667, body #CAE5E8
             2) numdata: số liệu (FYP, IP, AFYP, tổng...) → header #002200, body #CCCCFF
             3) percent: tỷ lệ % → header orangered, body #FFFFCC / xám
             4) condition: chỉ tiêu có ĐIỀU KIỆN (>=, <=, >, <, hoặc chữ "chỉ tiêu"/"điều kiện")
                → 2 hàng header: trên #BD6B09 (danh hiệu/mức), dưới #EC870E (chi tiết >=)
                → body lemonchiffon
             5) money: phần thưởng/tiền thưởng → header #000044 chữ vàng, body lightyellow
        */
        /* Số cột đầu tiên thuộc nhóm "info" (STT + cột 1-4 gốc) */
        /* Will be set after STT insertion */
        var infoColCount = 4; /* default: cột 1-4, sẽ cập nhật sau khi chèn STT */
        var isTD_TCS = programName && /tcs/i.test(hk(programName));

        function colCategory(header, colIdx) {
            var raw = String(header || '').trim();
            var k = hk(raw);

            /* Cột info (STT + cột 1-4 gốc) → luôn info */
            if (colIdx < infoColCount) return 'info';

            /* ★ Phát hiện cột "vé" (01 vé, 02 vé...) → luôn là condition (phân hạng) */
            /* VD: "01 vé vàng", "02 vé Bạch kim", "01 vé Kim cương (FYP≥680tr)" */
            if (/\d+\s*vé/i.test(raw) || /\bve\b/i.test(k) && /vàng|bach kim|bạc kim|kim cương|kim cuong/i.test(k)) return 'condition';

            /* ★ Phát hiện >=/≥ chỉ nằm trong ngoặc → là số liệu có điều kiện phụ, KHÔNG phải cột phân hạng */
            /* VD: "IP tháng 4 (Đk ≥ 12 triệu)" → numdataIp, không phải condition */
            var rawNoParen = raw.replace(/\([^)]*\)/g, '');
            if (!/>=|<=|[\u2265\u2264]/.test(rawNoParen) && />=|<=|[\u2265\u2264]/.test(raw)) {
                return 'numdataIp';
            }

            /* ★ QUAN TRỌNG: kiểm tra HEADER GỐC (chưa normalize) cho >=, <=, ≥, ≤ */
            /* Phải kiểm tra condition TRƯỚC money vì "Thưởng tháng (FYP>=500tr)" có cả 2 */
            if (/>=|<=|>[^=]|<(?!=)|[\u2265\u2264]/.test(raw)) return 'condition';
            if (/chi\s*tieu|dieu\s*kien/i.test(raw)) return 'condition';

            /* Phần thưởng / tiền thưởng */
            if (/thuong|ph\s+thuong|tien.*thuong|thu.*nhap|du.*kien/i.test(raw)) return 'money';
            if (/(thuong|ph thuong|tien thuong|thu nhap|du kien thuong)/.test(k)) return 'money';

            /* Tỷ lệ % — kiểm tra % trên header gốc trước */
            /* ★ NHƯNG: "FYC (TLHH 25%)" → phải là FYC, không phải percent → kiểm tra FYC trước % */
            if (/\bfyc\b/i.test(raw) || /\bfyc\b/.test(k)) return 'numdataFyc';

            if (raw.indexOf('%') >= 0) return 'percent';
            if (/(ty le|tlht|phan tram)/.test(k)) return 'percent';

            /* Thông tin phụ (cột 5+) */
            if (/(ngay|thang lam|chang|so luong|sl tvv|ngay hieu luc|ngay cap|thoi gian|chuc vu|^cv$|thoi han|ngay bat dau|ngay ket thuc|han)/.test(k)) return 'textInfo';

            /* ★ Cột tên người (TVV, NTD, Họ tên, Người TD...) → nameInfo: căn trái, padding */
            if (/(^tvv$|^ntd$|ho\s*ten|nguoi\s*td|nguoi\s*tuyen\s*dung|ten\s*tvv|ten\s*ntd)/.test(k)) return 'nameInfo';

            /* ★ Số liệu FYP: nền xanh nhạt + in đậm */
            if (/^fyp|fyp/i.test(raw) || /\bfyp\b/.test(k)) return 'numdataFyp';

            /* Số liệu */
            if (/(afyp|ip|tong|quy mo|tvv hd|doanh so|so tien|hdc|thuc hien|kenh|so hd)/.test(k)) return 'numdata';

            /* Mặc định cột 5+ → numdata */
            return 'numdata';
        }

        /* Căn chỉnh cột info: col1 STT(center), col2(left), col3(center), col4(left), col5(center) */
        var sttAutoInserted = false; /* sẽ cập nhật sau khi chèn STT */
        function infoAlign(colIdx) {
            /* Quy tắc: cột chẵn (0,2,4...) = center, cột lẻ (1,3...) = left */
            /* → STT(center), Nhóm(left), col3(center), Họ tên(left), col5(center) */
            if (colIdx % 2 === 1) return 'left';
            return 'center';
        }

        /* === LẤY HEADERS, CẮT CỘT TRỐNG === */
        var hd = all[0] || [];
        var dc = hd.length;
        while (dc > 0 && !String(hd[dc - 1] || '').trim()) {
            var hasData = false;
            for (var rr = 1; rr < all.length; rr++) {
                if (all[rr] && String(all[rr][dc - 1] || '').trim()) { hasData = true; break; }
            }
            if (hasData) break;
            dc--;
        }
        if (dc === 0) { ct.innerHTML = '<div style="text-align:center;padding:40px;color:var(--td-fgm)">Không có dữ liệu</div>'; return; }

        /* Detect nhóm column for filter */
        var groupCol = -1;
        for (var gi = 0; gi < dc; gi++) {
            if (/(^|\s)nhom(\s|$)|nhom kd/.test(hk(hd[gi]))) { groupCol = gi; break; }
        }

        /* === KIỂM TRA CỘT STT === */
        /* Nếu cột đầu tiên là STT → dùng STT từ CSV, không thêm auto-STT */
        var hasSttCol = (hk(hd[0]) === 'stt' || hk(hd[0]).indexOf('stt') === 0 || /xep hang/.test(hk(hd[0])));
        var sttColIdx = -1;

        /* === THÊM CỘT STT TỰ ĐỘNG NẾU CHƯA CÓ === */
        if (!hasSttCol) {
            /* Chèn header "STT" vào đầu */
            hd.unshift('STT');
            dc++;
            /* Chèn số thứ tự vào mỗi dòng dữ liệu */
            for (var sr = 1; sr < all.length; sr++) {
                if (all[sr]) all[sr].unshift(String(sr));
            }
            /* Đánh dấu cột STT là index 0 */
            hasSttCol = true;
            sttColIdx = 0;
            sttAutoInserted = true;
            /* STT chèn thêm 1 cột → nhóm info mở rộng: STT + cột 1-4 gốc = 5 cột */
            infoColCount = 5;
            /* Cập nhật groupCol vì tất cả index dịch chuyển +1 */
            if (groupCol >= 0) groupCol++;
        } else {
            sttColIdx = 0;
            /* CSV đã có cột STT → info group: STT + 4 cột gốc = 5 cột */
            infoColCount = 5;
        }

        /* === PHÂN LOẠI TẤT CẢ CỘT === */
        var colCats = [];
        for (var ci = 0; ci < dc; ci++) {
            colCats.push(colCategory(hd[ci], ci));
        }

        /* ★ XỬ LÝ RIÊNG: Thi đua TCS — phân loại lại cột NGƯỜI TD thành textInfo (thu gọn) */
        if (isTD_TCS) {
            for (var tci = infoColCount; tci < dc; tci++) {
                var tch = hk(hd[tci]);
                if (/nguoi\s*td|nguoi\s*tuyen\s*dung/.test(tch)) {
                    colCats[tci] = 'textInfo';
                }
            }
        }

        /* ★ QUAN TRỌNG: Scan dữ liệu phát hiện cột condition bị phân loại sai */
        /* Nếu cột chứa "11111" hoặc "Thiếu..." → chắc chắn là condition, dù header không có >= */
        for (var sci = infoColCount; sci < dc; sci++) {
            if (colCats[sci] === 'condition' || colCats[sci] === 'money' || colCats[sci] === 'percent' || colCats[sci] === 'numdataIp' || colCats[sci] === 'numdataFyp' || colCats[sci] === 'numdataFyc') continue;
            var hasCondVal = false;
            for (var sri = 1; sri < all.length; sri++) {
                var sv = String(all[sri] && all[sri][sci] || '').trim();
                var svNorm = sv.replace(/[\s\u00A0]+/g, '');
                if (svNorm === '11111' || /^Thiếu/i.test(sv) || /^Chưa\s*đạt/i.test(sv)) { hasCondVal = true; break; }
            }
            if (hasCondVal) colCats[sci] = 'condition';
        }

        /* === PHÁT HIỆN NHÓM ĐIỀU KIỆN → TẠO 2 HÀNG TIÊU ĐỀ === */
        /* Gom các cột condition liên tiếp có cùng "tên danh hiệu/mức" → gộp colspan hàng trên */
        var condGroups = []; /* {start, end, topLabel, groupIdx} */

        /* Hàm trích topLabel: cắt tại boundary markers để lấy tên danh hiệu */
        function extractTopLabel(rawHdr) {
            /* ★ Ưu tiên: phát hiện header "vé" → trích tên hạng */
            /* VD: "01 vé vàng" → "Hạng Vàng", "02 vé Bạch kim" → "Hạng Bạch Kim" */
            var veMatch = rawHdr.match(/(\d+)\s*vé\s+(vàng|bạc\s*kim|bach\s*kim|bạch\s*kim|kim\s*cương|kim\s*cuong)/i);
            if (veMatch) {
                var rankPart = veMatch[2].trim();
                if (/vàng/i.test(rankPart)) return 'Hạng Vàng';
                if (/bạch\s*kim|bach\s*kim|bạc\s*kim/i.test(rankPart)) return 'Hạng Bạch Kim';
                if (/kim\s*cương|kim\s*cuong/i.test(rankPart)) return 'Hạng Kim Cương';
                return 'Hạng ' + rankPart;
            }

            var pCut = rawHdr.length;
            /* Boundary markers: ( , >= , <= , ≥ , ≤ , > , < , FYP , AFYP , SL (số lượng) */
            var mParen = rawHdr.indexOf('(');
            var mGe = rawHdr.indexOf('>=');
            var mLe = rawHdr.indexOf('<=');
            var mUge = rawHdr.indexOf('\u2265'); /* ≥ */
            var mUle = rawHdr.indexOf('\u2264'); /* ≤ */
            var mGt = rawHdr.indexOf('>');
            var mLt = rawHdr.indexOf('<');
            /* FYP/AFYP boundary: tìm vị trí từ FYP/AFYP đứng sau khoảng trắng */
            var mFyp = -1, mAfyp = -1;
            var fypMatch = rawHdr.match(/\sFYP/i); if (fypMatch) mFyp = rawHdr.indexOf(fypMatch[0]);
            var afypMatch = rawHdr.match(/\sAFYP/i); if (afypMatch) mAfyp = rawHdr.indexOf(afypMatch[0]);
            /* SL boundary: "SL TVVm", "SL HD", v.v. — từ SL đứng sau khoảng trắng */
            var mSl = -1;
            var slMatch = rawHdr.match(/\sSL[\s\u00A0]/i); if (slMatch) mSl = rawHdr.indexOf(slMatch[0]);
            if (mParen > 0) pCut = Math.min(pCut, mParen);
            if (mGe > 0) pCut = Math.min(pCut, mGe);
            if (mLe > 0) pCut = Math.min(pCut, mLe);
            if (mUge > 0) pCut = Math.min(pCut, mUge);
            if (mUle > 0) pCut = Math.min(pCut, mUle);
            if (mGt > 0 && mGt !== mGe && mGt !== mUge) pCut = Math.min(pCut, mGt);
            if (mLt > 0 && mLt !== mLe && mLt !== mUle) pCut = Math.min(pCut, mLt);
            if (mFyp > 0) pCut = Math.min(pCut, mFyp);
            if (mAfyp > 0) pCut = Math.min(pCut, mAfyp);
            if (mSl > 0) pCut = Math.min(pCut, mSl);
            return rawHdr.substring(0, pCut).trim();
        }

        /* Hàm trích botText: lấy phần header SAU topLabel (chỉ tiêu/điều kiện) */
        function extractBotText(rawHdr, topLbl) {
            /* ★ Ưu tiên: phát hiện header "vé" → trích phần "01 vé"/"02 vé" + điều kiện */
            /* VD: "01 vé vàng (FYP≥250tr)" → "01 vé (FYP≥250tr)" */
            /* VD: "02 vé Bạch kim" → "02 vé" */
            var veBotMatch = rawHdr.match(/^(\d+\s*vé)\s+/i);
            if (veBotMatch) {
                var vePart = veBotMatch[1]; /* "01 vé" or "02 vé" */
                /* Tìm phần điều kiện sau tên hạng (trong ngoặc hoặc sau tên hạng) */
                var afterVeAndRank = rawHdr.substring(veBotMatch.index + veBotMatch[0].length);
                /* Bỏ phần tên hạng (vàng, Bạch kim, Kim cương...) */
                var afterRank = afterVeAndRank.replace(/^(vàng|bạc\s*kim|bach\s*kim|bạch\s*kim|kim\s*cương|kim\s*cuong)\s*/i, '');
                if (afterRank.trim()) return vePart + ' ' + afterRank.trim();
                return vePart;
            }

            /* Tìm vị trí bắt đầu của topLabel trong header */
            var topPos = rawHdr.indexOf(topLbl);
            if (topPos >= 0) {
                var afterTop = rawHdr.substring(topPos + topLbl.length).trim();
                if (afterTop) return afterTop;
            }
            /* Fallback: dùng logic cũ */
            var bParen = rawHdr.indexOf('(');
            var bGe = rawHdr.indexOf('>=');
            var bLe = rawHdr.indexOf('<=');
            var bUge = rawHdr.indexOf('\u2265');
            var bUle = rawHdr.indexOf('\u2264');
            if (bParen >= 0) return rawHdr.substring(bParen);
            if (bGe >= 0) return rawHdr.substring(bGe);
            if (bLe >= 0) return rawHdr.substring(bLe);
            if (bUge >= 0) return rawHdr.substring(bUge);
            if (bUle >= 0) return rawHdr.substring(bUle);
            return rawHdr;
        }

        var ii = 0;
        var groupIdxCounter = 0;
        /* Kiểm tra topLabel có chứa từ khóa phân hạng không */
        var rankKeywordRe = /hang|vàng|bach kim|kim cuong|chiến|sao|cup|sieu/i;
        while (ii < dc) {
            if (colCats[ii] === 'condition') {
                var cStart = ii;
                var rawHdr = String(hd[ii] || '').trim();
                var topLabel = extractTopLabel(rawHdr);

                var hasRankKeyword = rankKeywordRe.test(topLabel);

                /* Gom các cột condition liên tiếp */
                var cEnd = ii;
                if (hasRankKeyword) {
                    /* Có từ khóa phân hạng → gom cùng topLabel */
                    while (cEnd + 1 < dc && colCats[cEnd + 1] === 'condition') {
                        var nextRaw = String(hd[cEnd + 1] || '').trim();
                        var nextTop = extractTopLabel(nextRaw);
                        if (nextTop === topLabel) {
                            cEnd++;
                        } else {
                            break;
                        }
                    }
                } else {
                    /* ★ Không có từ khóa phân hạng → gom theo cặp chỉ tiêu */
                    /* Cột có topLabel KHÁC với cột trước = cùng 1 hạng (VD: FYP TVVm + TVVm HDC) */
                    /* Cột có topLabel GIỐNG cột đầu = hạng mới (VD: FYP TVVm lặp lại → hạng khác) */
                    var firstTopLabel = topLabel;
                    while (cEnd + 1 < dc && colCats[cEnd + 1] === 'condition') {
                        var pairNextRaw = String(hd[cEnd + 1] || '').trim();
                        var pairNextTop = extractTopLabel(pairNextRaw);
                        if (pairNextTop !== firstTopLabel) {
                            /* Khác topLabel → cùng hạng (chỉ tiêu khác của cùng mức) → gom */
                            cEnd++;
                        } else {
                            /* Trùng topLabel với cột đầu → hạng mới → dừng */
                            break;
                        }
                    }
                }
                condGroups.push({ start: cStart, end: cEnd, topLabel: topLabel, groupIdx: groupIdxCounter });
                groupIdxCounter++;
                ii = cEnd + 1;
            } else {
                ii++;
            }
        }

        /* ★ Gán tên phân hạng cho các nhóm không có từ khóa phân hạng */
        /* Thứ tự: Hạng Vàng → Hạng Bạch Kim → Hạng Kim Cương */
        var RANK_NAMES = ['Hạng Vàng', 'Hạng Bạch Kim', 'Hạng Kim Cương'];
        for (var rni = 0; rni < condGroups.length; rni++) {
            /* Kiểm tra cả topLabel và header gốc có chứa từ khóa phân hạng không */
            var hasRankInGroup = rankKeywordRe.test(condGroups[rni].topLabel);
            if (!hasRankInGroup) {
                for (var rhni = condGroups[rni].start; rhni <= condGroups[rni].end; rhni++) {
                    if (rankKeywordRe.test(String(hd[rhni] || ''))) { hasRankInGroup = true; break; }
                }
            }
            if (!hasRankInGroup && rni < RANK_NAMES.length) {
                condGroups[rni].topLabel = RANK_NAMES[rni];
            }
        }

        /* ★ GỘP CÁC NHÓM ĐIỀU KIỆN KHÔNG PHÂN HẠNG (CHƯƠNG TRÌNH THƯỞNG QUÝ) */
        /* Khi các cột condition có header bắt đầu bằng "FYP" + chứa tỷ lệ % → không phân hạng */
        /* → Gộp tất cả thành 1 nhóm với topLabel = "FYP/tỷ lệ thưởng" */
        /* ★ Sao Việt 5 cột → 1 Vàng + 2 Bạch Kim + 2 Kim Cương, KHÔNG gộp */
        if (condGroups.length > 1) {
            var allFypPercent = true;
            var firstCondIdx = condGroups[0].start;
            var lastCondIdx = condGroups[condGroups.length - 1].end;
            var totalCondCols = lastCondIdx - firstCondIdx + 1;
            for (var fpei = firstCondIdx; fpei <= lastCondIdx; fpei++) {
                if (colCats[fpei] !== 'condition') { allFypPercent = false; break; }
                var fpHdr = String(hd[fpei] || '').trim();
                /* Kiểm tra: header bắt đầu bằng FYP và có chứa % */
                if (!/^FYP/i.test(fpHdr) || fpHdr.indexOf('%') < 0) {
                    allFypPercent = false; break;
                }
            }
            if (allFypPercent && totalCondCols >= 6) {
                /* Gộp tất cả thành 1 nhóm duy nhất: "FYP/tỷ lệ thưởng" */
                condGroups = [{
                    start: firstCondIdx,
                    end: lastCondIdx,
                    topLabel: 'FYP/tỷ lệ thưởng',
                    groupIdx: 0
                }];
                groupIdxCounter = 1;
            }
        }

        var hasCond = condGroups.length > 0;

        var isPolicyPage = (pagePrefix === 'po');
        var isCSTuyenNgang = programName && /tuyen\s*ngang/i.test(hk(programName));
        /* isTD_TCS đã định nghĩa phía trên (sau infoColCount) */

        /* ★ TRANG CHÍNH SÁCH KHÔNG PHÂN HẠNG → gộp tất cả cột điều kiện thành 1 nhóm */
        /* ★ NGOẠI LỆ: CS Tuyển Ngang 2026 → KHÔNG gộp, sẽ xử lý riêng phía dưới */
        if (isPolicyPage && condGroups.length >= 1 && !isCSTuyenNgang) {
            var poFirstIdx = condGroups[0].start;
            var poLastIdx = condGroups[condGroups.length - 1].end;
            /* Kiểm tra tất cả đều là condition */
            var poAllCond = true;
            for (var poi = poFirstIdx; poi <= poLastIdx; poi++) {
                if (colCats[poi] !== 'condition') { poAllCond = false; break; }
            }
            if (poAllCond) {
                /* Gộp tất cả thành 1 nhóm duy nhất, không phân hạng */
                condGroups = [{
                    start: poFirstIdx,
                    end: poLastIdx,
                    topLabel: 'FYP/tỷ lệ thưởng',
                    groupIdx: 0
                }];
                groupIdxCounter = 1;
            }
        }

        /* ★ ÉP PHÂN NHÓM CỘT ĐIỀU KIỆN THEO QUY TẮC CỐ ĐỊNH */
        /* 5 cột → 1 Vàng + 2 Bạch Kim + 2 Kim Cương */
        /* 4 cột → 2 Vàng + 2 Bạch Kim */
        /* 3 cột → 1 Vàng + 1 Bạch Kim + 1 Kim Cương */
        /* CHỈ áp dụng khi KHÔNG phải trang Chính Sách và KHÔNG phải chương trình thưởng quý */
        if (condGroups.length > 0 && !isPolicyPage) {
            var firstCondGrp = condGroups[0];
            var lastCondGrp = condGroups[condGroups.length - 1];
            var condStart = firstCondGrp.start;
            var condEnd = lastCondGrp.end;
            var condTotal = condEnd - condStart + 1;
            /* Kiểm tra tất cả cột giữa condStart và condEnd đều là condition */
            var allCondBetween = true;
            for (var acbi = condStart; acbi <= condEnd; acbi++) {
                if (colCats[acbi] !== 'condition') { allCondBetween = false; break; }
            }
            /* Kiểm tra có phải chương trình thưởng quý (FYP + %, 6+ cột) không — Sao Việt 5 cột cũng có FYP+% nhưng vẫn phân hạng */
            var isThuongProgram = false;
            if (allCondBetween && condTotal >= 6) {
                var allFypPct = true;
                for (var fpi = condStart; fpi <= condEnd; fpi++) {
                    var fpH = String(hd[fpi] || '').trim();
                    if (!/^FYP/i.test(fpH) || fpH.indexOf('%') < 0) { allFypPct = false; break; }
                }
                if (allFypPct) isThuongProgram = true;
            }
            if (allCondBetween && !isThuongProgram) {
                if (condTotal === 5) {
                    /* ★ 5 cột → 1 Vàng + 2 Bạch Kim + 2 Kim Cương */
                    var t5_1 = extractTopLabel(String(hd[condStart] || '').trim());
                    var t5_2 = extractTopLabel(String(hd[condStart + 1] || '').trim());
                    var t5_3 = extractTopLabel(String(hd[condStart + 3] || '').trim());
                    if (!rankKeywordRe.test(t5_1)) t5_1 = 'Hạng Vàng';
                    if (!rankKeywordRe.test(t5_2)) t5_2 = 'Hạng Bạch Kim';
                    if (!rankKeywordRe.test(t5_3)) t5_3 = 'Hạng Kim Cương';
                    condGroups = [
                        { start: condStart, end: condStart, topLabel: t5_1, groupIdx: 0 },
                        { start: condStart + 1, end: condStart + 2, topLabel: t5_2, groupIdx: 1 },
                        { start: condStart + 3, end: condEnd, topLabel: t5_3, groupIdx: 2 }
                    ];
                    groupIdxCounter = 3;
                } else if (condTotal === 3) {
                    /* ★ 3 cột → 1 Vàng + 1 Bạch Kim + 1 Kim Cương */
                    var t3_1 = extractTopLabel(String(hd[condStart] || '').trim());
                    var t3_2 = extractTopLabel(String(hd[condStart + 1] || '').trim());
                    var t3_3 = extractTopLabel(String(hd[condStart + 2] || '').trim());
                    if (!rankKeywordRe.test(t3_1)) t3_1 = 'Hạng Vàng';
                    if (!rankKeywordRe.test(t3_2)) t3_2 = 'Hạng Bạch Kim';
                    if (!rankKeywordRe.test(t3_3)) t3_3 = 'Hạng Kim Cương';
                    condGroups = [
                        { start: condStart, end: condStart, topLabel: t3_1, groupIdx: 0 },
                        { start: condStart + 1, end: condStart + 1, topLabel: t3_2, groupIdx: 1 },
                        { start: condStart + 2, end: condEnd, topLabel: t3_3, groupIdx: 2 }
                    ];
                    groupIdxCounter = 3;
                } else if (condTotal === 4) {
                    /* ★ 4 cột → 2 Vàng + 2 Bạch Kim */
                    var t4_1 = extractTopLabel(String(hd[condStart] || '').trim());
                    var t4_2 = extractTopLabel(String(hd[condStart + 2] || '').trim());
                    if (!rankKeywordRe.test(t4_1)) t4_1 = 'Hạng Vàng';
                    if (!rankKeywordRe.test(t4_2)) t4_2 = 'Hạng Bạch Kim';
                    condGroups = [
                        { start: condStart, end: condStart + 1, topLabel: t4_1, groupIdx: 0 },
                        { start: condStart + 2, end: condEnd, topLabel: t4_2, groupIdx: 1 }
                    ];
                    groupIdxCounter = 2;
                }
            }
        }

        /* ★ XỬ LÝ RIÊNG: Thi đua TCS - PTB → không phân hạng, gộp điều kiện thành 1 nhóm "TIẾN ĐỘ THỰC HIỆN" */
        if (isTD_TCS && condGroups.length > 0) {
            var tcsCondFirst = condGroups[0].start;
            var tcsCondLast = condGroups[condGroups.length - 1].end;
            condGroups = [{
                start: tcsCondFirst,
                end: tcsCondLast,
                topLabel: 'TIẾN ĐỘ THỰC HIỆN',
                groupIdx: 0
            }];
            groupIdxCounter = 1;
        }

        /* ★ XỬ LÝ RIÊNG: CS Tuyển Ngang 2026 — ép phân tầng CHỈ TIÊU / THỰC HIỆN / THỰC HIỆN LŨY KẾ */
        /* Mẫu: 3 cột condition → CHỈ TIÊU, 3 cột numdata → THỰC HIỆN, bỏ qua cột THƯỞNG, 3 cột cuối → THỰC HIỆN LŨY KẾ */

        /* ★ PHÁT HIỆN MẪU CHỈ TIÊU / THỰC HIỆN / THỰC HIỆN LŨY KẾ */
        /* Khi có block condition columns theo sau bởi block numdata/numdataFyp/numdataIp/percent */
        /* → condition cols = CHỈ TIÊU, numdata cols = THỰC HIỆN */
        /* Nếu sau đó còn block numdata thứ 2 → THỰC HIỆN LŨY KẾ */
        /* HOẶC khi có 6+ condition columns liên tiếp (không phải thưởng quý) → chia đôi: nửa đầu = CHỈ TIÊU, nửa sau = THỰC HIỆN */
        /* → Tạo hàng header thứ 3 (hRow0) ở trên cùng */
        var chiTieuRange = null;   /* {start, end} — cột CHỈ TIÊU */
        var thucHienRange = null;  /* {start, end} — cột THỰC HIỆN */
        var thucHienLKRange = null; /* {start, end} — cột THỰC HIỆN LŨY KẾ */
        var hasChiThucGrouping = false;
        var thucHienAllCond = false; /* true nếu THỰC HIỆN cũng là condition columns */
        var tuyenNgangSkipMoney = -1; /* cột THƯỞNG cần bỏ qua trong CS Tuyển Ngang */

        if (isCSTuyenNgang) {
            /* ★ XỬ LÝ RIÊNG CS Tuyển Ngang 2026 */
            /* Mẫu: 3 cột condition → CHỈ TIÊU | 3 cột numdata → THỰC HIỆN | THƯỞNG (bỏ qua) | 3 cột cuối → THỰC HIỆN LŨY KẾ */
            var condStart = -1, condEnd = -1;
            for (var tni = infoColCount; tni < dc; tni++) {
                if (colCats[tni] === 'condition') {
                    if (condStart < 0) condStart = tni;
                    condEnd = tni;
                } else if (condStart >= 0) {
                    break; /* dừng khi hết block condition liên tiếp đầu tiên */
                }
            }
            if (condStart >= 0 && condEnd >= condStart) {
                chiTieuRange = { start: condStart, end: condEnd };
                hasChiThucGrouping = true;

                /* Tìm 3 cột numdata ngay sau condition → THỰC HIỆN */
                var thStartTN = condEnd + 1;
                var thEndTN = thStartTN - 1;
                for (var tni2 = thStartTN; tni2 < dc; tni2++) {
                    var tnCat = colCats[tni2];
                    if (tnCat === 'numdata' || tnCat === 'numdataFyp' || tnCat === 'numdataFyc' || tnCat === 'numdataIp' || tnCat === 'percent') {
                        thEndTN = tni2;
                    } else {
                        break;
                    }
                }
                if (thEndTN >= thStartTN) {
                    thucHienRange = { start: thStartTN, end: thEndTN };
                }

                /* Tìm cột THƯỞNG (money) sau THỰC HIỆN để bỏ qua */
                var afterTH = (thEndTN >= thStartTN) ? thEndTN + 1 : condEnd + 1;
                for (var tni3 = afterTH; tni3 < dc; tni3++) {
                    if (colCats[tni3] === 'money') {
                        tuyenNgangSkipMoney = tni3;
                        break;
                    }
                }

                /* Tìm 3 cột numdata cuối cùng → THỰC HIỆN LŨY KẾ */
                /* Bắt đầu tìm từ sau cột THƯỞNG (hoặc sau THỰC HIỆN nếu không có THƯỞNG) */
                var lkSearchTN = tuyenNgangSkipMoney >= 0 ? tuyenNgangSkipMoney + 1 : afterTH;
                var lkStartTN = -1, lkEndTN = -1;
                for (var tni4 = lkSearchTN; tni4 < dc; tni4++) {
                    var tnCat2 = colCats[tni4];
                    if (tnCat2 === 'numdata' || tnCat2 === 'numdataFyp' || tnCat2 === 'numdataFyc' || tnCat2 === 'numdataIp' || tnCat2 === 'percent') {
                        if (lkStartTN < 0) lkStartTN = tni4;
                        lkEndTN = tni4;
                    } else if (lkStartTN >= 0) {
                        break;
                    }
                }
                if (lkStartTN >= 0 && lkEndTN >= lkStartTN) {
                    thucHienLKRange = { start: lkStartTN, end: lkEndTN };
                }
            }
        } else if (condGroups.length > 0) {
            var ctFirstStart = condGroups[0].start;
            var ctLastEnd = condGroups[condGroups.length - 1].end;
            /* Trường hợp 1: condition columns theo sau bởi numdata/numdataFyp/numdataFyc/numdataIp/percent */
            var thStart = ctLastEnd + 1;
            var thEnd = thStart - 1;
            for (var thi2 = thStart; thi2 < dc; thi2++) {
                var thCat = colCats[thi2];
                if (thCat === 'numdata' || thCat === 'numdataFyp' || thCat === 'numdataFyc' || thCat === 'numdataIp' || thCat === 'percent') {
                    thEnd = thi2;
                } else {
                    break;
                }
            }
            if (thEnd >= thStart) {
                chiTieuRange = { start: ctFirstStart, end: ctLastEnd };
                thucHienRange = { start: thStart, end: thEnd };
                hasChiThucGrouping = true;

                /* ★ Tìm thêm block THỰC HIỆN LŨY KẾ: block numdata thứ 2 sau THỰC HIỆN */
                /* Có thể có cột gap (money, percent...) giữa 2 block numdata */
                var lkSearchStart = thEnd + 1;
                var lkStart = -1, lkEnd = -1;
                /* Bỏ qua các cột không phải numdata (gap columns) */
                for (var lki = lkSearchStart; lki < dc; lki++) {
                    var lkCat = colCats[lki];
                    if (lkCat === 'numdata' || lkCat === 'numdataFyp' || lkCat === 'numdataFyc' || lkCat === 'numdataIp' || lkCat === 'percent') {
                        if (lkStart < 0) lkStart = lki;
                        lkEnd = lki;
                    } else if (lkStart >= 0) {
                        /* Đã tìm thấy block → dừng */
                        break;
                    }
                    /* Nếu chưa tìm thấy block → tiếp tục tìm (bỏ qua gap) */
                }
                if (lkStart >= 0 && lkEnd >= lkStart) {
                    thucHienLKRange = { start: lkStart, end: lkEnd };
                }
            } else {
                /* Trường hợp 2: Tất cả là condition columns, đủ số → chia đôi */
                var totalCondCols2 = ctLastEnd - ctFirstStart + 1;
                /* Kiểm tra không phải thưởng quý (6+ FYP+%) */
                var isCTThuong = false;
                if (totalCondCols2 >= 6) {
                    var allFP2 = true;
                    for (var fpi2 = ctFirstStart; fpi2 <= ctLastEnd; fpi2++) {
                        var fpH2 = String(hd[fpi2] || '').trim();
                        if (!/^FYP/i.test(fpH2) || fpH2.indexOf('%') < 0) { allFP2 = false; break; }
                    }
                    if (allFP2) isCTThuong = true;
                }
                if (totalCondCols2 >= 6 && !isCTThuong && !isPolicyPage) {
                    var halfPoint = Math.ceil(totalCondCols2 / 2);
                    chiTieuRange = { start: ctFirstStart, end: ctFirstStart + halfPoint - 1 };
                    thucHienRange = { start: ctFirstStart + halfPoint, end: ctLastEnd };
                    hasChiThucGrouping = true;
                    thucHienAllCond = true;
                }
            }
        }

        /* ★ XỬ LÝ RIÊNG: Thi đua TCS → không dùng CHỈ TIÊU/THỰC HIỆN grouping */
        /* TCS chỉ dùng 2 hàng header: "TIẾN ĐỘ THỰC HIỆN" (top) + chi tiết cột (bottom) */
        if (isTD_TCS) {
            chiTieuRange = null;
            thucHienRange = null;
            thucHienLKRange = null;
            hasChiThucGrouping = false;
            thucHienAllCond = false;
            tuyenNgangSkipMoney = -1;
        }

        /* ★ Phát hiện cột có nội dung ngày tháng → xuống dòng, thu gọn */
        var dateColSet = {};
        for (var dci = infoColCount; dci < dc; dci++) {
            if (colCats[dci] === 'condition' || colCats[dci] === 'money') continue;
            /* Kiểm tra header có chứa ngày */
            var hdrRaw = String(hd[dci] || '').trim();
            var hasDateInHeader = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(hdrRaw);
            /* Kiểm tra body có chứa ngày (5 dòng đầu) */
            var dateCount = 0, totalNonEmpty = 0;
            for (var dri = 1; dri < Math.min(all.length, 6); dri++) {
                var dv = String(all[dri] && all[dri][dci] || '').trim();
                if (dv) {
                    totalNonEmpty++;
                    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(dv)) dateCount++;
                }
            }
            var hasDateInBody = totalNonEmpty > 0 && dateCount / totalNonEmpty > 0.3;
            if (hasDateInHeader || hasDateInBody) {
                dateColSet[dci] = true;
            }
        }

        /* ★ Hàm định dạng tiêu đề cột có ngày tháng */
        /* Phần ngày (dd/mm/yy) → xuống hàng mới, nhỏ hơn */
        function formatHeaderText(rawHeader) {
            var text = String(rawHeader || '').trim();
            if (!text) return '';
            /* Tìm pattern ngày: dd/mm/yy hoặc dd/mm/yyyy hoặc dd-mm-yy */
            var datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
            var match = text.match(datePattern);
            if (!match) return escH(text);
            var dateIdx = match.index;
            var before = text.substring(0, dateIdx).trim();
            var datePart = text.substring(dateIdx);
            if (before) {
                return escH(before) + '<br><span class="hdr-date">' + escH(datePart) + '</span>';
            }
            return '<span class="hdr-date">' + escH(datePart) + '</span>';
        }

        /* ★ Hàm định dạng text hàng tiêu đề dưới */
        /* "01 vé", "02 vé", "%" → xuống hàng, đỏ, in đậm, nền nổi bật */
        /* ★ "tỷ lệ thưởng" (tỷ lệ %) → xuống hàng mới, đỏ, in đậm, nền nổi bật */
        function formatCondBotText(text, rawHeader) {
            if (!text) return '';
            var rawH = String(rawHeader || '').trim();

            /* ★ Xử lý đặc biệt: header FYP + tỷ lệ % (chương trình thưởng) */
            /* VD: "FYP ≥ 450tr+TVVm 18%" → dòng 1: "FYP ≥ 450tr+TVVm", dòng 2: "tỷ lệ thưởng 18%" */
            if (/^FYP/i.test(rawH) && rawH.indexOf('%') >= 0) {
                /* Tách phần trước số % và phần tỷ lệ */
                var pctMatch = rawH.match(/^(.+?)\s+(\d+(?:[.,]\d+)?%)\s*$/);
                if (pctMatch) {
                    var fypPart = pctMatch[1].trim(); /* "FYP ≥ 450tr+TVVm" */
                    var ratePart = pctMatch[2].trim(); /* "18%" */
                    return escH(fypPart) + '<br><span class="ty-le-highlight">tỷ lệ thưởng ' + escH(ratePart) + '</span>';
                }
                /* Fallback: tìm số % cuối cùng */
                var lastPctIdx = rawH.lastIndexOf('%');
                if (lastPctIdx > 0) {
                    /* Tìm bắt đầu của số trước % */
                    var beforePct = rawH.substring(0, lastPctIdx);
                    var numBeforeMatch = beforePct.match(/(\d+(?:[.,]\d+)?)\s*$/);
                    if (numBeforeMatch) {
                        var fypBefore = rawH.substring(0, numBeforeMatch.index).trim();
                        var rateValue = numBeforeMatch[1] + '%';
                        return escH(fypBefore) + '<br><span class="ty-le-highlight">tỷ lệ thưởng ' + escH(rateValue) + '</span>';
                    }
                }
            }

            /* Xử lý chung: tìm các pattern "01 vé", "02 vé", "XX vé" hoặc "%" */
            var remaining = text;
            var vePattern = /(\d+\s*vé)/gi;
            var parts = [];
            var lastIdx = 0;
            vePattern.lastIndex = 0;
            var veMatch;
            while ((veMatch = vePattern.exec(remaining)) !== null) {
                if (veMatch.index > lastIdx) {
                    parts.push({ text: remaining.substring(lastIdx, veMatch.index), highlight: false });
                }
                parts.push({ text: veMatch[1], highlight: true });
                lastIdx = veMatch.index + veMatch[1].length;
            }
            var afterVe = remaining.substring(lastIdx);
            if (afterVe.indexOf('%') >= 0) {
                /* Tìm số trước % để đưa xuống dòng mới */
                var pctIdx = afterVe.indexOf('%');
                var beforePctSign = afterVe.substring(0, pctIdx);
                var afterPctSign = afterVe.substring(pctIdx + 1);
                /* Tìm số liền trước % */
                var numBeforeMatch = beforePctSign.match(/(\d+(?:[.,]\d+)?)\s*$/);
                if (numBeforeMatch) {
                    var numBefore = numBeforeMatch[1];
                    var textBeforeNum = beforePctSign.substring(0, numBeforeMatch.index);
                    if (textBeforeNum) parts.push({ text: textBeforeNum, highlight: false });
                    /* Số + % → xuống dòng mới, nổi bật */
                    parts.push({ text: numBefore + '%', highlight: true, newline: true });
                } else {
                    if (beforePctSign) parts.push({ text: beforePctSign, highlight: false });
                    parts.push({ text: '%', highlight: true, newline: true });
                }
                if (afterPctSign) parts.push({ text: afterPctSign, highlight: false });
            } else if (afterVe) {
                parts.push({ text: afterVe, highlight: false });
            }
            var hasHighlight = false;
            for (var pi = 0; pi < parts.length; pi++) {
                if (parts[pi].highlight) { hasHighlight = true; break; }
            }
            if (!hasHighlight) return escH(text);
            var html = '';
            var needBr = false;
            for (var pj = 0; pj < parts.length; pj++) {
                if (parts[pj].highlight) {
                    if (parts[pj].newline) {
                        html += '<span class="pct-newline">' + escH(parts[pj].text) + '</span>';
                    } else {
                        if (needBr) html += '<br>';
                        html += '<span class="ve-highlight">' + escH(parts[pj].text) + '</span>';
                    }
                    needBr = false;
                } else {
                    var t = escH(parts[pj].text);
                    if (t) {
                        html += t;
                        needBr = true;
                    }
                }
            }
            return html;
        }

        /* === TẠO HTML TIÊU ĐỀ === */
        /* ★ Hỗ trợ 2 hoặc 3 hàng header:
           - Không có condition + CHỈ TIÊU/THỰC HIỆN: 1 hàng
           - Có condition, không CHỈ TIÊU/THỰC HIỆN: 2 hàng (hRow1 + hRow2)
           - Có CHỈ TIÊU/THỰC HIỆN: 3 hàng (hRow0 + hRow1 + hRow2)
        */
        var totalHeaderRows = 1;
        if (hasCond) totalHeaderRows = 2;
        if (hasChiThucGrouping) totalHeaderRows = 3;

        var hRow0 = ''; /* Hàng 0 (top): CHỈ TIÊU / THỰC HIỆN grouping — chỉ khi hasChiThucGrouping */
        var hRow1 = ''; /* Hàng 1: info + numdata + percent + cond-top(gộp) + money */
        var hRow2 = ''; /* Hàng 2: chỉ cond-bot (chi tiết điều kiện) */

        var chiTieuProcessed = false;
        var thucHienProcessed = false;
        var thucHienLKProcessed = false;
        var condProcessed = {};

        for (var hi = 0; hi < dc; hi++) {
            var cat = colCats[hi];
            var hdrText = formatHeaderText(hd[hi] || ('Cột ' + (hi + 1)));
            var hCls = '';

            /* ★ Kiểm tra cột có thuộc CHỈ TIÊU, THỰC HIỆN, hoặc THỰC HIỆN LŨY KẾ không */
            var inChiTieu = hasChiThucGrouping && chiTieuRange && hi >= chiTieuRange.start && hi <= chiTieuRange.end;
            var inThucHien = hasChiThucGrouping && thucHienRange && hi >= thucHienRange.start && hi <= thucHienRange.end;
            var inThucHienLK = hasChiThucGrouping && thucHienLKRange && hi >= thucHienLKRange.start && hi <= thucHienLKRange.end;

            if (cat === 'info') {
                /* Cột 1–4: nền #000044, chữ trắng → rowspan = totalHeaderRows */
                hCls = 'h-info';
                if (hi === sttColIdx) hCls += ' pst-h';
                if (hasChiThucGrouping) {
                    hRow0 += '<th class="' + hCls + '" rowspan="3">' + hdrText + '</th>';
                } else {
                    hRow1 += '<th class="' + hCls + '" rowspan="' + totalHeaderRows + '">' + hdrText + '</th>';
                }
            } else if (cat === 'textInfo') {
                hCls = 'h-text-info';
                if (hasChiThucGrouping) {
                    hRow0 += '<th class="' + hCls + '" rowspan="3">' + hdrText + '</th>';
                } else {
                    hRow1 += '<th class="' + hCls + '" rowspan="' + totalHeaderRows + '">' + hdrText + '</th>';
                }
            } else if (cat === 'nameInfo') {
                /* ★ Cột tên người (TVV, NTD...): header giống textInfo */
                hCls = 'h-text-info';
                if (hasChiThucGrouping) {
                    hRow0 += '<th class="' + hCls + '" rowspan="3">' + hdrText + '</th>';
                } else {
                    hRow1 += '<th class="' + hCls + '" rowspan="' + totalHeaderRows + '">' + hdrText + '</th>';
                }
            } else if (cat === 'numdata') {
                hCls = 'h-num';
                if (inThucHienLK) {
                    /* ★ THỰC HIỆN LŨY KẾ group */
                    if (!thucHienLKProcessed) {
                        var lkSpan = thucHienLKRange.end - thucHienLKRange.start + 1;
                        hRow0 += '<th class="h-thuc-hien-lk" colspan="' + lkSpan + '">THỰC HIỆN LŨY KẾ</th>';
                        thucHienLKProcessed = true;
                    }
                    hRow1 += '<th class="' + hCls + '" rowspan="2">' + hdrText + '</th>';
                } else if (inThucHien) {
                    /* ★ THỰC HIỆN group: thêm hRow0 header (1 lần) + hRow1 header */
                    if (!thucHienProcessed) {
                        var thSpan = thucHienRange.end - thucHienRange.start + 1;
                        hRow0 += '<th class="h-thuc-hien" colspan="' + thSpan + '">THỰC HIỆN</th>';
                        thucHienProcessed = true;
                    }
                    hRow1 += '<th class="' + hCls + '" rowspan="2">' + hdrText + '</th>';
                } else if (hasChiThucGrouping) {
                    hRow0 += '<th class="' + hCls + '" rowspan="3">' + hdrText + '</th>';
                } else {
                    hRow1 += '<th class="' + hCls + '" rowspan="' + totalHeaderRows + '">' + hdrText + '</th>';
                }
            } else if (cat === 'numdataFyp') {
                hCls = 'h-num-fyp';
                if (inThucHienLK) {
                    if (!thucHienLKProcessed) {
                        var lkSpan2 = thucHienLKRange.end - thucHienLKRange.start + 1;
                        hRow0 += '<th class="h-thuc-hien-lk" colspan="' + lkSpan2 + '">THỰC HIỆN LŨY KẾ</th>';
                        thucHienLKProcessed = true;
                    }
                    hRow1 += '<th class="' + hCls + '" rowspan="2">' + hdrText + '</th>';
                } else if (inThucHien) {
                    if (!thucHienProcessed) {
                        var thSpan2 = thucHienRange.end - thucHienRange.start + 1;
                        hRow0 += '<th class="h-thuc-hien" colspan="' + thSpan2 + '">THỰC HIỆN</th>';
                        thucHienProcessed = true;
                    }
                    hRow1 += '<th class="' + hCls + '" rowspan="2">' + hdrText + '</th>';
                } else if (hasChiThucGrouping) {
                    hRow0 += '<th class="' + hCls + '" rowspan="3">' + hdrText + '</th>';
                } else {
                    hRow1 += '<th class="' + hCls + '" rowspan="' + totalHeaderRows + '">' + hdrText + '</th>';
                }
            } else if (cat === 'numdataFyc') {
                hCls = 'h-num-fyc';
                if (inThucHienLK) {
                    if (!thucHienLKProcessed) {
                        var lkSpanFyc = thucHienLKRange.end - thucHienLKRange.start + 1;
                        hRow0 += '<th class="h-thuc-hien-lk" colspan="' + lkSpanFyc + '">THỰC HIỆN LŨY KẾ</th>';
                        thucHienLKProcessed = true;
                    }
                    hRow1 += '<th class="' + hCls + '" rowspan="2">' + hdrText + '</th>';
                } else if (inThucHien) {
                    if (!thucHienProcessed) {
                        var thSpanFyc = thucHienRange.end - thucHienRange.start + 1;
                        hRow0 += '<th class="h-thuc-hien" colspan="' + thSpanFyc + '">THỰC HIỆN</th>';
                        thucHienProcessed = true;
                    }
                    hRow1 += '<th class="' + hCls + '" rowspan="2">' + hdrText + '</th>';
                } else if (hasChiThucGrouping) {
                    hRow0 += '<th class="' + hCls + '" rowspan="3">' + hdrText + '</th>';
                } else {
                    hRow1 += '<th class="' + hCls + '" rowspan="' + totalHeaderRows + '">' + hdrText + '</th>';
                }
            } else if (cat === 'numdataIp') {
                hCls = 'h-num-ip';
                if (inThucHienLK) {
                    if (!thucHienLKProcessed) {
                        var lkSpan3 = thucHienLKRange.end - thucHienLKRange.start + 1;
                        hRow0 += '<th class="h-thuc-hien-lk" colspan="' + lkSpan3 + '">THỰC HIỆN LŨY KẾ</th>';
                        thucHienLKProcessed = true;
                    }
                    hRow1 += '<th class="' + hCls + '" rowspan="2">' + hdrText + '</th>';
                } else if (inThucHien) {
                    if (!thucHienProcessed) {
                        var thSpan3 = thucHienRange.end - thucHienRange.start + 1;
                        hRow0 += '<th class="h-thuc-hien" colspan="' + thSpan3 + '">THỰC HIỆN</th>';
                        thucHienProcessed = true;
                    }
                    hRow1 += '<th class="' + hCls + '" rowspan="2">' + hdrText + '</th>';
                } else if (hasChiThucGrouping) {
                    hRow0 += '<th class="' + hCls + '" rowspan="3">' + hdrText + '</th>';
                } else {
                    hRow1 += '<th class="' + hCls + '" rowspan="' + totalHeaderRows + '">' + hdrText + '</th>';
                }
            } else if (cat === 'percent') {
                hCls = 'h-percent';
                if (inThucHienLK) {
                    if (!thucHienLKProcessed) {
                        var lkSpan4 = thucHienLKRange.end - thucHienLKRange.start + 1;
                        hRow0 += '<th class="h-thuc-hien-lk" colspan="' + lkSpan4 + '">THỰC HIỆN LŨY KẾ</th>';
                        thucHienLKProcessed = true;
                    }
                    hRow1 += '<th class="' + hCls + '" rowspan="2">' + hdrText + '</th>';
                } else if (inThucHien) {
                    if (!thucHienProcessed) {
                        var thSpan4 = thucHienRange.end - thucHienRange.start + 1;
                        hRow0 += '<th class="h-thuc-hien" colspan="' + thSpan4 + '">THỰC HIỆN</th>';
                        thucHienProcessed = true;
                    }
                    hRow1 += '<th class="' + hCls + '" rowspan="2">' + hdrText + '</th>';
                } else if (hasChiThucGrouping) {
                    hRow0 += '<th class="' + hCls + '" rowspan="3">' + hdrText + '</th>';
                } else {
                    hRow1 += '<th class="' + hCls + '" rowspan="' + totalHeaderRows + '">' + hdrText + '</th>';
                }
            } else if (cat === 'money') {
                hCls = 'h-money';
                if (hasChiThucGrouping) {
                    hRow0 += '<th class="' + hCls + '" rowspan="3">' + hdrText + '</th>';
                } else {
                    hRow1 += '<th class="' + hCls + '" rowspan="' + totalHeaderRows + '">' + hdrText + '</th>';
                }
            } else if (cat === 'condition') {
                /* ★ Xử lý THỰC HIỆN header cho condition columns trong thucHienRange */
                if (inThucHien && !thucHienProcessed) {
                    var thSpanCond = thucHienRange.end - thucHienRange.start + 1;
                    hRow0 += '<th class="h-thuc-hien" colspan="' + thSpanCond + '">THỰC HIỆN</th>';
                    thucHienProcessed = true;
                }
                /* ★ CHỈ TIÊU group: condition columns */
                if (inChiTieu && !chiTieuProcessed) {
                    /* hRow0: CHỈ TIÊU header */
                    var ctSpan = chiTieuRange.end - chiTieuRange.start + 1;
                    hRow0 += '<th class="h-chi-tieu" colspan="' + ctSpan + '">CHỈ TIÊU</th>';
                    chiTieuProcessed = true;
                }
                /* Tìm group chứa cột này */
                var grp = null;
                for (var gci = 0; gci < condGroups.length; gci++) {
                    if (hi >= condGroups[gci].start && hi <= condGroups[gci].end) { grp = condGroups[gci]; break; }
                }
                if (grp && !condProcessed[grp.start]) {
                    /* Hàng trên: gộp colspan, chỉ hiện tên danh hiệu/mức */
                    var span = grp.end - grp.start + 1;
                    var gCls = 'h-cond-top h-cond-g' + (grp.groupIdx % 5);
                    /* ★ Phát hiện nhóm điều kiện chứa vé hoặc % → thêm class xanh lá */
                    var gHasVe = false, gHasPct = false;
                    for (var gvei = grp.start; gvei <= grp.end; gvei++) {
                        var gveHdr = String(hd[gvei] || '').trim();
                        if (/\d+\s*vé/i.test(gveHdr)) gHasVe = true;
                        if (gveHdr.indexOf('%') >= 0) gHasPct = true;
                    }
                    if (gHasVe) gCls += ' h-cond-ve';
                    if (gHasPct) gCls += ' h-cond-pct';
                    hRow1 += '<th class="' + gCls + '" colspan="' + span + '">' + escH(grp.topLabel) + '</th>';
                    condProcessed[grp.start] = true;
                }
                /* Hàng dưới: chi tiết điều kiện — trích phần SAU topLabel */
                var rawH = String(hd[hi] || '').trim();
                /* Tìm group chứa cột này để lấy topLabel */
                var condGrpForBot = null;
                for (var bgci2 = 0; bgci2 < condGroups.length; bgci2++) {
                    if (hi >= condGroups[bgci2].start && hi <= condGroups[bgci2].end) { condGrpForBot = condGroups[bgci2]; break; }
                }
                /* ★ XỬ LÝ RIÊNG: Thi đua TCS → hiển thị đầy đủ tiêu đề cột (không trích botText) */
                /* VD: "SLHĐ >= 6" hiện đủ thay vì chỉ ">= 6" */
                var botText;
                if (isTD_TCS) {
                    botText = rawH;
                } else {
                    botText = (condGrpForBot && rawH.indexOf(condGrpForBot.topLabel) === 0)
                        ? extractBotText(rawH, condGrpForBot.topLabel)
                        : extractBotText(rawH, extractTopLabel(rawH));
                }
                /* ★ Định dạng botText: "01 vé", "02 vé", "%" → xuống hàng, đỏ, in đậm, nền nổi bật */
                var formattedBot = isTD_TCS ? escH(botText) : formatCondBotText(botText, rawH);
                /* Group class cho màu */
                var botCls = 'h-cond-bot';
                if (condGrpForBot) botCls += ' h-cond-g' + (condGrpForBot.groupIdx % 5);
                /* ★ Phát hiện cột điều kiện chứa vé hoặc % → thêm class xanh lá */
                if (/\d+\s*vé/i.test(rawH)) botCls += ' h-cond-ve';
                if (rawH.indexOf('%') >= 0) botCls += ' h-cond-pct';
                hRow2 += '<th class="' + botCls + '">' + formattedBot + '</th>';
            }
        }

        var theadHtml = '';
        if (hasChiThucGrouping) {
            theadHtml += '<tr class="chi-thuc-row">' + hRow0 + '</tr>';
            theadHtml += '<tr>' + hRow1 + '</tr>';
            theadHtml += '<tr class="cond-row">' + hRow2 + '</tr>';
        } else {
            theadHtml += '<tr>' + hRow1 + '</tr>';
            if (hasCond) {
                theadHtml += '<tr class="cond-row">' + hRow2 + '</tr>';
            }
        }

        /* === TẠO HTML NỘI DUNG === */
        var data = all.slice(1);

        /* ★ SẮP XẾP DÒNG THEO TỔNG IP / TỔNG FYP GIẢM DẦN */
        (function sortDataByMainCol() {
            /* Ưu tiên 1: cột "Tổng IP" */
            /* Ưu tiên 2: cột "Tổng FYP" */
            /* Ưu tiên 3: cột có chứa "tong" + ("ip" hoặc "fyp") */
            /* Ưu tiên 4: cột numdata/numdataFyp cuối cùng */
            var sortCol = -1;
            for (var sci = 0; sci < dc; sci++) {
                var sh = hk(hd[sci] || '');
                if (sh === 'tong ip') { sortCol = sci; break; }
            }
            if (sortCol < 0) {
                for (var sci2 = 0; sci2 < dc; sci2++) {
                    var sh2 = hk(hd[sci2] || '');
                    if (sh2 === 'tong fyp') { sortCol = sci2; break; }
                }
            }
            if (sortCol < 0) {
                /* Tìm cột header chứa "tong" + ("ip" hoặc "fyp") */
                for (var sci3 = 0; sci3 < dc; sci3++) {
                    var sh3 = hk(hd[sci3] || '');
                    if (/tong/.test(sh3) && /(ip|fyp)/.test(sh3)) { sortCol = sci3; break; }
                }
            }
            if (sortCol < 0) {
                /* Fallback: cột numdata hoặc numdataFyp hoặc numdataFyc cuối cùng */
                for (var sci4 = dc - 1; sci4 >= infoColCount; sci4--) {
                    var cat = colCats[sci4];
                    if (cat === 'numdata' || cat === 'numdataFyp' || cat === 'numdataFyc' || cat === 'numdataIp') { sortCol = sci4; break; }
                }
            }
            if (sortCol < 0) return; /* không tìm thấy cột sắp xếp → giữ nguyên */

            /* Hàm parse số từ chuỗi CSV (hỗ trợ định dạng Việt Nam: 1.234,56) */
            function parseNum(s) {
                var v = String(s || '').trim().replace(/\s/g, '');
                if (!v) return -Infinity;
                /* Dấu chấm = hàng nghìn, dấu phẩy = thập phân (Việt Nam) */
                var n = Number(v.replace(/\./g, '').replace(',', '.'));
                return isFinite(n) ? n : -Infinity;
            }

            data.sort(function(a, b) {
                var va = parseNum(a[sortCol]);
                var vb = parseNum(b[sortCol]);
                return vb - va; /* giảm dần */
            });

            /* Cập nhật lại số thứ tự STT sau khi sắp xếp */
            if (sttColIdx >= 0) {
                for (var si = 0; si < data.length; si++) {
                    if (data[si]) data[si][sttColIdx] = String(si + 1);
                }
            }
        })();

        /* ★ Tìm cột textInfo cuối cùng → dùng để căn lề trái (Người TD) */
        var lastTextInfoCol = -1;
        for (var ltic = dc - 1; ltic >= infoColCount; ltic--) {
            if (colCats[ltic] === 'textInfo') { lastTextInfoCol = ltic; break; }
        }

        var bHtml = '';
        for (var r = 0; r < data.length; r++) {
            var rc = data[r] || [];
            bHtml += '<tr data-row-index="' + r + '">';
            /* Đếm số cột condition đã qua để tính shade */
            var condCounter = 0;
            for (var c = 0; c < dc; c++) {
                var val = rc[c] || '';
                var rawVal = String(val).trim();
                var header = hd[c] || ('Cột ' + (c + 1));
                var cat2 = colCats[c];

                /* Format giá trị hiển thị - định dạng số */
                var displayVal = rawVal;
                var compact = rawVal.replace(/\s/g, '');
                if (/^-?\d+(?:[.,]\d+)?$/.test(compact)) {
                    var n = Number(compact.replace(/\./g, '').replace(',', '.'));
                    if (isFinite(n)) {
                        var kh2 = hk(header);
                        if (/(thuong|thu nhap|du kien|fyp|fyc|afyp|doanh so|tien|tong fyp|tong fyc)/.test(kh2)) {
                            displayVal = n.toLocaleString('vi-VN');
                        } else if (/(sl|so luong|tvv|count|tong|quy mo)/.test(kh2)) {
                            displayVal = n.toLocaleString('vi-VN');
                        }
                    }
                }

                /* === BƯỚC 1: Xác định class CSS theo nhóm cột === */
                var tdCls = '';
                if (cat2 === 'info') {
                    var align = infoAlign(c);
                    tdCls = 'd-info-' + align;
                    if (c === sttColIdx) tdCls = 'pst';
                } else if (cat2 === 'textInfo') {
                    tdCls = 'd-text-info';
                    /* ★ Cột textInfo cuối cùng (Người TD) → căn lề trái */
                    if (c === lastTextInfoCol) tdCls = 'd-text-info d-text-info-last';
                } else if (cat2 === 'nameInfo') {
                    /* ★ Cột tên người (TVV, NTD, Họ tên...): căn trái, padding */
                    tdCls = 'd-text-info d-name-left';
                } else if (cat2 === 'numdata') {
                    tdCls = 'd-numdata';
                } else if (cat2 === 'numdataFyp') {
                    tdCls = 'd-numdata-fyp';
                } else if (cat2 === 'numdataFyc') {
                    tdCls = 'd-numdata-fyc';
                } else if (cat2 === 'numdataIp') {
                    tdCls = 'd-numdata-ip';
                } else if (cat2 === 'percent') {
                    var pctNum = parseFloat(rawVal.replace('%', '').replace(',', '.'));
                    if (!isNaN(pctNum) && pctNum > 0) {
                        tdCls = 'd-percent-pos';
                    } else {
                        tdCls = 'd-percent-zero';
                    }
                } else if (cat2 === 'condition') {
                    /* Tìm group index cho cột này → dùng màu theo nhóm */
                    var cellGrp = null;
                    for (var cgci = 0; cgci < condGroups.length; cgci++) {
                        if (c >= condGroups[cgci].start && c <= condGroups[cgci].end) { cellGrp = condGroups[cgci]; break; }
                    }
                    if (cellGrp) {
                        tdCls = 'd-cond d-cond-g' + (cellGrp.groupIdx % 5);
                    } else {
                        tdCls = 'd-cond';
                    }
                    /* ★ Phát hiện cột điều kiện chứa vé hoặc % → thêm class xanh lá */
                    var hdrForCls = String(hd[c] || '').trim();
                    if (/\d+\s*vé/i.test(hdrForCls)) tdCls += ' d-cond-ve';
                    if (hdrForCls.indexOf('%') >= 0) tdCls += ' d-cond-pct';
                    condCounter++;
                } else if (cat2 === 'money') {
                    tdCls = 'd-money';
                } else {
                    tdCls = 'd-numdata';
                }

                /* ★ Thêm class d-date-wrap cho cột có ngày tháng */
                if (dateColSet[c]) {
                    tdCls += ' d-date-wrap';
                }

                /* === BƯỚC 2: Xác định nội dung ô — áp dụng quy tắc giá trị đặc biệt === */
                /* ★ QUAN TRỌNG: Các quy tắc này áp dụng cho TẤT CẢ cột, không chỉ condition */
                var cellContent = '';

                /* ★ Chuẩn hóa giá trị để kiểm tra */
                var valNorm = rawVal.replace(/[\s\u00A0]+/g, '').toLowerCase();
                /* ★ Chuẩn hóa thêm: bỏ dấu chấm (ngàn) để bắt "11.111" = 11111 */
                var valNormNoDot = valNorm.replace(/\./g, '');

                if (cat2 === 'info') {
                    /* Cột info: hiển thị bình thường */
                    cellContent = escH(displayVal);
                } else if (valNorm === '11111' || valNormNoDot === '11111') {
                    /* ★ Số 11111 (có thể có khoảng trắng) → luôn chuyển thành "Đạt" với dấu tích */
                    cellContent = '<span class="dat-badge"><i class="fa-solid fa-check"></i>Đạt</span>';
                } else if (valNorm === 'đạt' || valNorm === 'dat') {
                    /* Chữ "Đạt" → làm nổi bật với dấu tích */
                    cellContent = '<span class="dat-badge"><i class="fa-solid fa-check"></i>Đạt</span>';
                } else if (/^thiếu/i.test(rawVal) || /^chưa\s*đạt/i.test(rawVal) || valNorm === 'chuadat' || valNorm === 'chuađat') {
                    /* ★ "Thiếu...", "chưa đạt" → đỏ, in nghiêng, KHÔNG in đậm */
                    cellContent = '<span class="thieu-val">' + escH(displayVal) + '</span>';
                } else if (/^-\d[\d.,]*/.test(rawVal) && cat2 !== 'money') {
                    /* ★ Giá trị âm (như -76, -100, -0.5, -1,234) trong cột không phải money → đỏ, in nghiêng, KHÔNG in đậm */
                    cellContent = '<span class="thieu-val">' + escH(displayVal) + '</span>';
                } else if (cat2 === 'money') {
                    /* Phần thưởng: in nghiêng, bỏ icon cúp */
                    if (rawVal && rawVal !== '0' && rawVal !== '-' && rawVal !== '') {
                        cellContent = '<span class="thuong-highlight">' + escH(displayVal) + '</span>';
                    } else {
                        cellContent = escH(displayVal);
                    }
                } else {
                    /* Các ô còn lại: hiển thị bình thường */
                    cellContent = escH(displayVal);
                }

                /* ★ Nếu cột điều kiện có % trong header → thêm con số % xuống dòng */
                if (cat2 === 'condition' && String(hd[c] || '').indexOf('%') >= 0 && rawVal && rawVal !== '0' && rawVal !== '') {
                    /* Thêm label % dưới giá trị */
                    if (cellContent.indexOf('dat-badge') < 0 && cellContent.indexOf('thieu-val') < 0) {
                        cellContent = cellContent + '<span class="pct-body-val">%</span>';
                    }
                }

                bHtml += '<td class="' + tdCls + '">' + cellContent + '</td>';
            }
            bHtml += '</tr>';
        }

        /* === LẮP RÁP BẢNG === */
        /* Tạo colgroup để quản lý độ rộng cột — thu gọn tối đa */
        /* ★ Khi có phân tầng CHỈ TIÊU/THỰC HIỆN → các cột con trong cùng nhóm phải bằng nhau */
        var colgroupHtml = '<colgroup>';
        /* Tính chiều rộng bằng nhau cho CHỈ TIÊU, THỰC HIỆN và THỰC HIỆN LŨY KẾ groups */
        var chiTieuColWidth = '';
        var thucHienColWidth = '';
        var thucHienLKColWidth = '';
        if (hasChiThucGrouping) {
            /* CHỈ TIÊU columns: condition cols — rộng vừa */
            var ctColCount = chiTieuRange.end - chiTieuRange.start + 1;
            chiTieuColWidth = 'width:' + Math.max(50, Math.floor(350 / ctColCount)) + 'px;min-width:40px';
            /* THỰC HIỆN columns: numdata cols — rộng vừa */
            var thColCount = thucHienRange.end - thucHienRange.start + 1;
            thucHienColWidth = 'width:' + Math.max(50, Math.floor(350 / thColCount)) + 'px;min-width:40px';
            /* THỰC HIỆN LŨY KẾ columns */
            if (thucHienLKRange) {
                var lkColCount = thucHienLKRange.end - thucHienLKRange.start + 1;
                thucHienLKColWidth = 'width:' + Math.max(50, Math.floor(350 / lkColCount)) + 'px;min-width:40px';
            }
        }
        for (var cgi = 0; cgi < dc; cgi++) {
            var cgCat = colCats[cgi];
            /* ★ Kiểm tra cột có thuộc CHỈ TIÊU, THỰC HIỆN, hoặc THỰC HIỆN LŨY KẾ group không */
            var cgInChiTieu = hasChiThucGrouping && chiTieuRange && cgi >= chiTieuRange.start && cgi <= chiTieuRange.end;
            var cgInThucHien = hasChiThucGrouping && thucHienRange && cgi >= thucHienRange.start && cgi <= thucHienRange.end;
            var cgInThucHienLK = hasChiThucGrouping && thucHienLKRange && cgi >= thucHienLKRange.start && cgi <= thucHienLKRange.end;

            if (cgi === sttColIdx) {
                colgroupHtml += '<col style="width:28px;min-width:22px">';
            } else if (cgCat === 'info' || cgi < infoColCount) {
                /* Cột info: quy tắc — cột lẻ (Nhóm, Họ tên...) rộng hơn, cột chẵn hẹp */
                if (cgi % 2 === 1) {
                    /* Cột lẻ = Nhóm, Họ tên → rộng hơn, căn trái */
                    colgroupHtml += '<col style="min-width:60px">';
                } else {
                    /* Cột chẵn = STT, mã, số... → hẹp, căn giữa */
                    colgroupHtml += '<col style="width:45px;min-width:32px">';
                }
            } else if (cgInChiTieu) {
                /* ★ CHỈ TIÊU group → cột bằng nhau */
                colgroupHtml += '<col style="' + chiTieuColWidth + '">';
            } else if (cgInThucHien) {
                /* ★ THỰC HIỆN group → cột bằng nhau */
                colgroupHtml += '<col style="' + thucHienColWidth + '">';
            } else if (cgInThucHienLK) {
                /* ★ THỰC HIỆN LŨY KẾ group → cột bằng nhau */
                colgroupHtml += '<col style="' + thucHienLKColWidth + '">';
            } else if (dateColSet[cgi]) {
                /* ★ Cột có ngày tháng → đủ rộng cho ngày dd/mm/yyyy */
                colgroupHtml += '<col style="width:92px;min-width:78px">';
            } else if (cgCat === 'textInfo') {
                /* ★ Cột textInfo (sau info group) → rộng vừa cho tên, không kéo dãn */
                colgroupHtml += '<col style="width:80px;min-width:40px">';
            } else if (cgCat === 'nameInfo') {
                /* ★ Cột tên người (TVV, NTD...) → rộng cho tên, căn trái */
                colgroupHtml += '<col style="width:100px;min-width:60px">';
            } else if (/tvv/i.test(String(hd[cgi] || '').trim())) {
                /* ★ Cột TVV/TVVM (số lượng tư vấn viên) → rộng hơn để hiển thị đủ */
                colgroupHtml += '<col style="width:62px;min-width:45px">';
            } else {
                colgroupHtml += '<col style="min-width:30px">';
            }
        }
        colgroupHtml += '</colgroup>';
        var tableHtml = '<div class="ptw"><table class="pt">' + colgroupHtml + '<thead>' + theadHtml + '</thead><tbody>' + bHtml + '</tbody></table></div>';
        ct.innerHTML = tableHtml;
        TD_attachGroupFilter(ct, groupCol, 0);

        /* === CẬP NHẬT STICKY TOP CHO HÀNG HEADER === */
        if (hasChiThucGrouping) {
            /* 3 hàng header: chi-thuc-row → row1 → cond-row */
            try {
                var row0El = ct.querySelector('.pt thead tr.chi-thuc-row');
                var row1El = ct.querySelector('.pt thead tr:nth-child(2)');
                var row2El = ct.querySelector('.pt thead tr.cond-row');
                if (row0El) {
                    var h0 = row0El.offsetHeight;
                    /* Row 1: sticky top = h0 */
                    if (row1El) {
                        row1El.querySelectorAll('th').forEach(function(th) {
                            th.style.top = h0 + 'px';
                            th.style.zIndex = '3';
                        });
                    }
                    /* Row 2 (cond-row): sticky top = h0 + h1 */
                    if (row2El && row1El) {
                        var h1 = row1El.offsetHeight;
                        row2El.querySelectorAll('th').forEach(function(th) {
                            th.style.top = (h0 + h1) + 'px';
                            th.style.zIndex = '3';
                        });
                    }
                }
            } catch(e) {}
        } else if (hasCond) {
            try {
                var firstRowH = ct.querySelector('.pt thead tr:first-child');
                if (firstRowH) {
                    var fHeight = firstRowH.offsetHeight;
                    var secondRowCells = ct.querySelectorAll('.pt thead tr.cond-row th');
                    secondRowCells.forEach(function(th) {
                        th.style.top = fHeight + 'px';
                        th.style.zIndex = '3';
                    });
                }
            } catch(e) {}
        }

        /* Row click highlight */
        ct.querySelectorAll('tbody tr').forEach(function(row) {
            row.addEventListener('click', function() {
                ct.querySelectorAll('tbody tr.is-focus').forEach(function(ar) { ar.classList.remove('is-focus'); });
                row.classList.add('is-focus');
            });
        });
    }

    /* === EXPORT EXCEL === */
    function expXls() {
        if (!s.csvData || !s.csvData.length) { toast('Chưa có dữ liệu để tải', 'err'); return; }
        var all = s.csvData;
        var progName = s.csvName || 'Du_lieu';

        /* === PHÂN LOẠI CỘT (giống hệt hàm rpt) === */
        var hk = function(v) { return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim(); };
        var infoColCount = 5;
        var isTD_TCS = progName && /tcs/i.test(hk(progName));

        function colCategory(header, colIdx) {
            var raw = String(header||'').trim(); var k = hk(raw);
            if (colIdx < infoColCount) return 'info';
            if (/\d+\s*vé/i.test(raw) || /\bve\b/i.test(k) && /vàng|bach kim|bạc kim|kim cương|kim cuong/i.test(k)) return 'condition';
            var rawNoParen = raw.replace(/\([^)]*\)/g, '');
            if (!/>=|<=|[\u2265\u2264]/.test(rawNoParen) && />=|<=|[\u2265\u2264]/.test(raw)) return 'numdataIp';
            if (/>=|<=|>[^=]|<(?!=)|[\u2265\u2264]/.test(raw)) return 'condition';
            if (/chi\s*tieu|dieu\s*kien/i.test(raw)) return 'condition';
            if (/thuong|ph\s+thuong|tien.*thuong|thu.*nhap|du.*kien/i.test(raw)) return 'money';
            if (/(thuong|ph thuong|tien thuong|thu nhap|du kien thuong)/.test(k)) return 'money';
            if (/\bfyc\b/i.test(raw) || /\bfyc\b/.test(k)) return 'numdataFyc';
            if (raw.indexOf('%') >= 0) return 'percent';
            if (/(ty le|tlht|phan tram)/.test(k)) return 'percent';
            if (/(ngay|thang lam|chang|so luong|sl tvv|ngay hieu luc|ngay cap|thoi gian|chuc vu|^cv$|thoi han|ngay bat dau|ngay ket thuc|han)/.test(k)) return 'textInfo';
            /* ★ Cột tên người (TVV, NTD, Họ tên, Người TD...) → nameInfo */
            if (/(^tvv$|^ntd$|ho\s*ten|nguoi\s*td|nguoi\s*tuyen\s*dung|ten\s*tvv|ten\s*ntd)/.test(k)) return 'nameInfo';
            if (/^fyp|fyp/i.test(raw) || /\bfyp\b/.test(k)) return 'numdataFyp';
            if (/(afyp|ip|tong|quy mo|tvv hd|doanh so|so tien|hdc|thuc hien|kenh|so hd)/.test(k)) return 'numdata';
            return 'numdata';
        }

        var hd = all[0] || [];
        var dc = hd.length;
        while (dc > 0 && !String(hd[dc-1]||'').trim()) { var hasD=false; for(var rr=1;rr<all.length;rr++){if(all[rr]&&String(all[rr][dc-1]||'').trim()){hasD=true;break;}} if(hasD)break; dc--; }
        if (dc === 0) { toast('Không có dữ liệu', 'err'); return; }

        /* Kiểm tra STT */
        var hasSttCol = (hk(hd[0])==='stt'||hk(hd[0]).indexOf('stt')===0||/xep hang/.test(hk(hd[0])));
        if (!hasSttCol) { hd.unshift('STT'); dc++; for(var sr=1;sr<all.length;sr++){if(all[sr])all[sr].unshift(String(sr));} infoColCount=5; }
        else { infoColCount=5; }

        var colCats = [];
        for (var ci=0; ci<dc; ci++) colCats.push(colCategory(hd[ci], ci));

        if (isTD_TCS) { for(var tci=infoColCount;tci<dc;tci++){var tch=hk(hd[tci]);if(/nguoi\s*td|nguoi\s*tuyen\s*dung/.test(tch)){colCats[tci]='textInfo';}} }

        /* Phát hiện condition bị sai */
        for(var sci=infoColCount;sci<dc;sci++){
            if(colCats[sci]==='condition'||colCats[sci]==='money'||colCats[sci]==='percent'||colCats[sci]==='numdataIp'||colCats[sci]==='numdataFyp'||colCats[sci]==='numdataFyc') continue;
            var hasCondVal=false;
            for(var sri=1;sri<all.length;sri++){var sv=String(all[sri]&&all[sri][sci]||'').trim();var svn=sv.replace(/[\s\u00A0]+/g,'');if(svn==='11111'||/^Thiếu/i.test(sv)||/^Chưa\s*đạt/i.test(sv)){hasCondVal=true;break;}}
            if(hasCondVal) colCats[sci]='condition';
        }

        /* Gom nhóm condition */
        var condGroups=[];
        for(var ii=0;ii<dc;ii++){
            if(colCats[ii]==='condition'){
                var start=ii; while(ii+1<dc&&colCats[ii+1]==='condition')ii++;
                condGroups.push({start:start,end:ii,groupIdx:condGroups.length});
            }
        }

        /* === MAPPING STYLE CHO EXCEL === */
        var hStyles = {
            info:      'background:#000044;color:#ffffff;font-weight:bold;text-align:center;',
            textInfo:  'background:#103667;color:#ffffff;font-weight:bold;text-align:center;',
            nameInfo:  'background:#1B3A5C;color:#d4e0f0;font-weight:bold;text-align:left;',
            numdata:   'background:#002200;color:#ffffff;font-weight:bold;text-align:center;',
            numdataFyp:'background:#1a5c1a;color:#ccffcc;font-weight:bold;text-align:center;',
            numdataFyc:'background:#0d47a1;color:#ffffff;font-weight:bold;text-align:center;',
            numdataIp: 'background:#1a3d1a;color:#ccffcc;font-weight:bold;text-align:center;',
            percent:   'background:orangered;color:#00008B;font-weight:bold;text-align:center;',
            money:     'background:#000044;color:#FFD700;font-weight:bold;text-align:center;',
            condition: 'background:#BD6B09;color:#00008B;font-weight:bold;text-align:center;',
            condBot:   'background:#EC870E;color:#00008B;font-weight:bold;text-align:center;'
        };
        var condGroupTopColors = ['#B8860B','#607D8B','#00695C','#2E7D32','#7B1FA2'];
        var condGroupBotColors = ['#DAA520','#90A4AE','#00897B','#4CAF50','#AB47BC'];
        var condGroupCellBgs   = ['#FFF8DC','#ECEFF1','#E0F2F1','#E0F2E0','#F0E0F8'];

        var dStyles = {
            info:      'background:#ffffff;color:#1e3a5f;text-align:center;',
            infoLeft:  'background:#ffffff;color:#1e3a5f;text-align:left;padding-left:6px;',
            textInfo:  'background:#CAE5E8;color:#1e3a5f;text-align:center;',
            nameInfo:  'background:#ffffff;color:#111111;text-align:left;padding-left:6px;',
            numdata:   'background:#CCCCFF;color:#111111;text-align:center;font-weight:600;',
            numdataFyp:'background:#D4EDDA;color:#1a3a1a;text-align:center;font-weight:700;',
            numdataFyc:'background:transparent;color:#cc0000;text-align:center;font-style:italic;',
            numdataIp: 'background:#DBDBFF;color:#111111;text-align:center;font-weight:600;',
            percentPos:'background:#FFFFCC;color:#111111;text-align:center;font-weight:700;font-style:italic;',
            percentZero:'background:transparent;color:#999999;text-align:center;font-style:italic;',
            condition: 'background:lemonchiffon;color:#111111;text-align:center;font-weight:600;',
            money:     'background:lightyellow;color:#000044;text-align:center;font-weight:900;',
            datBadge:  'background:#22c55e;color:#ffffff;font-weight:bold;text-align:center;',
            thieu:     'background:transparent;color:red;font-style:italic;',
            thuongHL:  'background:lightyellow;color:#000044;font-weight:900;text-align:center;font-style:italic;'
        };

        /* Hàm tìm condGroup cho 1 cột */
        function getCondGroup(c) {
            for(var g=0;g<condGroups.length;g++){if(c>=condGroups[g].start&&c<=condGroups[g].end) return condGroups[g];} return null;
        }

        /* === TẠO HTML EXCEL === */
        var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>' + esc(progName) + '</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style>td,th{font-family:Tahoma,Arial,sans-serif;font-size:11px;padding:3px 5px;border:1px solid #ccc;white-space:nowrap;}th{font-size:10px;}</style></head><body><table border="1" cellspacing="0" cellpadding="3" style="mso-number-format:\\#">';

        /* === HÀNG TIÊU ĐỀ === */
        /* Tìm xem có condition không → 2 hàng header */
        var hasCond = colCats.some(function(c){return c==='condition';});

        /* Hàng 1: header chính */
        html += '<tr>';
        for(var h1=0;h1<dc;h1++){
            var cat1=colCats[h1];
            var hdr1=String(hd[h1]||'').trim();
            var s1='';
            if(cat1==='condition'){
                var cg1=getCondGroup(h1);
                if(cg1&&h1===cg1.start){
                    var topLbl=hdr1.replace(/\([^)]*\)/g,'').replace(/>=|<=|[\u2265\u2264].*/g,'').trim();
                    var gIdx=cg1.groupIdx%5;
                    var gTopBg=condGroupTopColors[gIdx]||'#BD6B09';
                    s1='background:'+gTopBg+';color:#ffffff;font-weight:bold;text-align:center;';
                    var span=cg1.end-cg1.start+1;
                    html+='<th colspan="'+span+'" style="'+s1+'">'+esc(topLbl)+'</th>';
                }
                /* Skip các cột condition không phải start của group */
            } else {
                s1=hStyles[cat1]||hStyles.numdata;
                html+='<th style="'+s1+'">'+esc(hdr1)+'</th>';
            }
        }
        html+='</tr>';

        /* Hàng 2: header chi tiết (chỉ condition cols) */
        if(hasCond){
            html+='<tr>';
            for(var h2=0;h2<dc;h2++){
                var cat2=colCats[h2];
                if(cat2==='condition'){
                    var cg2=getCondGroup(h2);
                    var hdr2=String(hd[h2]||'').trim();
                    var gIdx2=cg2?cg2.groupIdx%5:0;
                    var gBotBg=condGroupBotColors[gIdx2]||'#EC870E';
                    var s2='background:'+gBotBg+';color:#00008B;font-weight:bold;text-align:center;';
                    html+='<th style="'+s2+'">'+esc(hdr2)+'</th>';
                } else {
                    /* Non-condition cols: rowspan=2 trong hàng 1, bỏ qua hàng 2 */
                }
            }
            html+='</tr>';
        }

        /* === HÀNG DỮ LIỆU === */
        var data = all.slice(1);
        for(var r=0;r<data.length;r++){
            var rc=data[r]||[];
            html+='<tr>';
            for(var c=0;c<dc;c++){
                var val=String(rc[c]||'').trim();
                var cat=colCats[c];
                var cs='';

                /* Format giá trị hiển thị - giữ số nguyên gốc, không thêm dấu chấm phân cách */
                var displayVal=val;
                var compact=val.replace(/\s/g,'');
                var isNumeric=/^-?\d+(?:[.,]\d+)?$/.test(compact);
                if(isNumeric){
                    /* Bỏ dấu chấm phân cách hàng nghìn, giữ nguyên các chữ số */
                    displayVal=compact.replace(/\./g,'').replace(',','.');
                }

                /* Xác định style theo loại cột */
                var valNorm=val.replace(/[\s\u00A0]+/g,'').toLowerCase();
                var valNormNoDot=valNorm.replace(/\./g,'');

                if(cat==='info'){
                    cs=c%2===1?dStyles.infoLeft:dStyles.info;
                } else if(cat==='textInfo'){
                    cs=dStyles.textInfo;
                } else if(cat==='numdata'){
                    cs=dStyles.numdata;
                } else if(cat==='numdataFyp'){
                    cs=dStyles.numdataFyp;
                } else if(cat==='numdataFyc'){
                    cs=dStyles.numdataFyc;
                } else if(cat==='numdataIp'){
                    cs=dStyles.numdataIp;
                } else if(cat==='percent'){
                    var pctNum=parseFloat(val.replace('%','').replace(',','.'));
                    cs=(!isNaN(pctNum)&&pctNum>0)?dStyles.percentPos:dStyles.percentZero;
                } else if(cat==='condition'){
                    var cg=getCondGroup(c);
                    if(cg){
                        var gci=cg.groupIdx%5;
                        cs='background:'+(condGroupCellBgs[gci]||'lemonchiffon')+';color:#111111;text-align:center;font-weight:600;';
                    } else {
                        cs=dStyles.condition;
                    }
                } else if(cat==='money'){
                    cs=dStyles.money;
                } else {
                    cs=dStyles.numdata;
                }

                /* Xử lý giá trị đặc biệt */
                var cellContent='';
                if(valNorm==='11111'||valNormNoDot==='11111'){
                    cs=dStyles.datBadge;
                    cellContent='✓ Đạt';
                } else if(valNorm==='đạt'||valNorm==='dat'){
                    cs=dStyles.datBadge;
                    cellContent='✓ Đạt';
                } else if(/^thiếu/i.test(val)||/^chưa\s*đạt/i.test(val)||valNorm==='chuadat'){
                    cs=dStyles.thieu;
                    cellContent=esc(displayVal);
                } else if(/^-\d[\d.,]*/.test(val)&&cat!=='money'){
                    cs=dStyles.thieu;
                    cellContent=esc(displayVal);
                } else if(cat==='money'&&val&&val!=='0'&&val!=='-'&&val!==''){
                    cs=dStyles.thuongHL;
                    cellContent=esc(displayVal);
                } else {
                    cellContent=esc(displayVal);
                }

                /* Thêm mso-number-format để Excel không tự thêm dấu chấm phân cách */
                var numFmt='';
                if(isNumeric && cat!=='info' && cat!=='textInfo' && cat!=='condition'){
                    numFmt='mso-number-format:"\\#";';
                }
                html+='<td style="'+cs+numFmt+'">'+cellContent+'</td>';
            }
            html+='</tr>';
        }

        html+='</table></body></html>';

        /* Tạo blob và tải */
        var blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=UTF-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = progName.replace(/[^\w\s\-àáạảãâầấậẩẫèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗùúụủũưừứựửữỳýỵỷỹĐđ]/g, '').trim() || 'Du_lieu';
        a.download += '.xls';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('Đã tải file Excel (có định dạng)', 'ok');
    }

    function buildHTML() {
        return '<div class="td-bg-a"></div><div class="tw" id="' + P + 'Tw"></div>' +
            '<nav class="td-topnav"><div class="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">' +
            '<div class="flex items-center gap-3">' +
            '<button class="admin-btn" onclick="go(\'view-main\')" aria-label="Quay lại"><i class="fa-solid fa-arrow-left"></i></button>' +
            '<span class="td-sub-title">' + esc(cfg.title) + '</span></div>' +
            '<div class="flex items-center gap-3">' +
            '<span class="sync-badge" id="' + P + 'SyncOk" style="display:none"><i class="fa-solid fa-cloud"></i>Đã đồng bộ</span>' +
            '<span class="err-badge" id="' + P + 'SyncErr" style="display:none"><i class="fa-solid fa-cloud-xmark"></i>Lỗi</span>' +
            '<span class="text-xs px-2.5 py-1 rounded-full border items-center gap-1" style="border-color:var(--td-border);color:var(--td-fgm);display:none" id="' + P + 'CntB"><i class="fa-solid fa-layer-group" style="font-size:9px"></i><span id="' + P + 'CntN">0</span></span>' +
            '<div style="position:relative" id="' + P + 'AdmWrap">' +
            '<button class="admin-btn" id="' + P + 'AdmBtn" onclick="' + pv + '.togDD()" aria-label="Quản trị"><i class="fa-solid fa-user-shield"></i></button>' +
            '<div class="admin-dd" id="' + P + 'AdmDD">' +
            '<button class="dd-item" onclick="' + pv + '.admLinks()" id="' + P + 'DdLinks" style="display:none"><i class="fa-solid fa-link"></i>Cập nhật liên kết</button>' +
            '<button class="dd-item" onclick="' + pv + '.admReload()"><i class="fa-solid fa-arrows-rotate"></i>Đồng bộ ngay</button>' +
            '<button class="dd-item" onclick="' + pv + '.admOut()" id="' + P + 'DdOut" style="display:none"><i class="fa-solid fa-right-from-bracket"></i>Đăng xuất</button>' +
            '<div class="dd-sep" id="' + P + 'DdSep" style="display:none"></div>' +
            '<button class="dd-item dng" onclick="' + pv + '.admLock()" id="' + P + 'DdLock" style="display:none"><i class="fa-solid fa-lock"></i>Khóa quản trị</button>' +
            '</div></div></div></div>' +
            '<div class="td-sub-line-wrap"><div class="td-sub-line"></div></div>' +
            '</nav>' +
            '<div id="' + P + 'Container" class="relative z-10">' +
            '<div class="td-shell">' +
            '<div id="' + P + 'LoadW" style="display:none"><div class="loading-g"><i class="fa-solid fa-cloud-arrow-down block"></i><p class="text-base font-semibold mb-1">Đang đồng bộ...</p></div></div>' +
            '<div id="' + P + 'ErrW" style="display:none"><div class="err-g"><i class="fa-solid fa-circle-exclamation block"></i><p class="text-base font-semibold mb-1" style="color:var(--td-fg)">Lỗi kết nối</p><p class="text-sm" id="' + P + 'ErrMsg" style="color:var(--td-fgm)"></p></div></div>' +
            '<div id="' + P + 'EmptyW"><div class="empty-g"><i class="fa-regular fa-folder-open block"></i><p class="text-base font-semibold mb-1">' + esc(cfg.emptyTitle) + '</p><p class="text-sm" style="color:var(--td-fgm)">' + esc(cfg.emptyDesc) + '</p></div></div>' +
            '<div class="card-grid" id="' + P + 'Grid" style="display:none"></div>' +
            '</div></div>' +
            '<div class="pop-bg" id="' + P + 'Popup"><div class="pop-box" id="' + P + 'PopBox"><div class="pop-head"><div class="pop-media" id="' + P + 'PopPoster"></div><div class="pop-bar"><div class="pop-bar-head"><button type="button" onclick="' + pv + '.cpop()" class="pop-back" style="position:static;flex-shrink:0" aria-label="Trở về"><i class="fa-solid fa-arrow-left"></i></button><div class="pop-bar-main"><h2 class="fd text-xl font-bold" id="' + P + 'PopName"></h2><div class="pop-meta"><span class="tag" id="' + P + 'PopTag"></span><p class="pop-subline" id="' + P + 'PopSub"></p></div></div><div class="flex gap-2 mt-1 shrink-0"><button onclick="' + pv + '.expXls()" class="ca-btn" style="opacity:1;position:static;background:#1a7a3a;border-color:#2ecc71" aria-label="Tải Excel" title="Tải file Excel"><i class="fa-solid fa-file-excel"></i></button><button onclick="' + pv + '.efp()" class="ca-btn edt" style="opacity:1;position:static;display:none" id="' + P + 'PopEdt" aria-label="Sửa"><i class="fa-solid fa-pen"></i></button></div></div></div></div><div class="pop-ct" id="' + P + 'PopCt"></div></div></div>' +
            '<div class="pw-bg" id="' + P + 'PwMdl"><div class="pw-box"><div class="pw-ico"><i class="fa-solid fa-shield-halved"></i></div><h3 class="fd text-lg font-bold mb-1">Quản trị viên</h3><p class="text-xs mb-5" style="color:var(--td-fgm)">Nhập mật khẩu để tiếp tục</p><input type="password" class="pw-inp" id="' + P + 'PwInp" placeholder="Mật khẩu" autocomplete="off"><p class="pw-err" id="' + P + 'PwErr"></p><button onclick="' + pv + '.spw()" class="bp" style="width:100%;margin-top:16px"><i class="fa-solid fa-unlock mr-2"></i>Xác nhận</button><button onclick="' + pv + '.cpw()" class="bs" style="width:100%;margin-top:8px">Huỷ</button></div></div>' +
            '<div class="mdl-bg" id="' + P + 'Mdl"><div class="mdl-box"><div class="flex items-center justify-between mb-5"><div><h3 class="fd text-lg font-bold" id="' + P + 'MTtl">Sửa cột & hàng</h3><p class="text-xs mt-0.5" style="color:var(--td-fgm)" id="' + P + 'MSub"></p></div><button onclick="' + pv + '.cm()" class="w-8 h-8 rounded-lg flex items-center justify-content:center" style="color:var(--td-fgm);background:none;border:none;cursor:pointer" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button></div><div class="space-y-4"><div><div class="flex items-center justify-between mb-2"><label class="fl mb-0"><i class="fa-solid fa-table-columns"></i>Số cột & hàng</label><button type="button" class="abtn" id="' + P + 'AutoBtn" onclick="' + pv + '.autoDet()"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Tự động</button></div><div class="grid grid-cols-2 gap-3"><div><input type="number" class="inp" id="' + P + 'MCols" placeholder="Cột" min="1" max="20"></div><div><input type="number" class="inp" id="' + P + 'MRows" placeholder="Hàng" min="1" max="500"></div></div></div></div><div class="flex gap-3 mt-6"><button onclick="' + pv + '.savePrg()" class="bp flex-1"><i class="fa-solid fa-check mr-2"></i>Lưu lên Sheet</button><button onclick="' + pv + '.cm()" class="bs">Huỷ</button></div></div></div>' +
            '<div class="mdl-bg" id="' + P + 'LinksMdl"><div class="mdl-box" style="max-height:85vh;overflow-y:auto"><div class="flex items-center justify-between mb-5"><div><h3 class="fd text-lg font-bold">Cập nhật liên kết</h3><p class="text-xs mt-0.5" style="color:var(--td-fgm)">Dán link mới để thay đổi nguồn dữ liệu</p></div><button onclick="' + pv + '.cLinks()" class="w-8 h-8 rounded-lg flex items-center justify-content:center" style="color:var(--td-fgm);background:none;border:none;cursor:pointer" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button></div><div class="space-y-4"><div style="padding:10px 12px;border-radius:10px;background:rgba(108,199,138,0.08);border:1px solid rgba(108,199,138,0.2)"><div style="font-size:11px;font-weight:800;color:#6cc78a;margin-bottom:8px;text-transform:uppercase;letter-spacing:.03em"><i class="fa-solid fa-house" style="margin-right:6px"></i>Trang Chính (Dashboard)</div><div><label class="fl"><i class="fa-solid fa-database"></i>Dữ liệu KPI chính – AFYP, HĐ, Tuyển dụng...</label><div class="flex gap-2"><input type="url" class="inp flex-1" id="' + P + 'LnkCSV" placeholder="Dán link CSV Google Sheet"><button onclick="' + pv + '.svLnk(&#39;CSV_URL&#39;,&#39;' + P + 'LnkCSV&#39;)" class="bp text-xs px-3">Lưu</button></div></div><div style="margin-top:10px"><label class="fl"><i class="fa-solid fa-sitemap"></i>Phụ cấp & Cơ cấu tổ chức – Nhóm, TVV...</label><div class="flex gap-2"><input type="url" class="inp flex-1" id="' + P + 'LnkPC" placeholder="Dán link CSV Google Sheet"><button onclick="' + pv + '.svLnk(&#39;PHU_CAP_CSV_URL&#39;,&#39;' + P + 'LnkPC&#39;)" class="bp text-xs px-3">Lưu</button></div></div></div><div style="padding:10px 12px;border-radius:10px;background:rgba(245,200,66,0.08);border:1px solid rgba(245,200,66,0.2)"><div style="font-size:11px;font-weight:800;color:#f5c842;margin-bottom:8px;text-transform:uppercase;letter-spacing:.03em"><i class="fa-solid fa-trophy" style="margin-right:6px"></i>Trang Thi Đua / Chính Sách / CLB</div><div><label class="fl"><i class="fa-solid fa-table"></i>Google Sheet ID – Bảng dữ liệu thi đua</label><div class="flex gap-2"><input type="text" class="inp flex-1" id="' + P + 'LnkSID" placeholder="Dán Sheet ID"><button onclick="' + pv + '.svLnk(&#39;TD_SID&#39;,&#39;' + P + 'LnkSID&#39;)" class="bp text-xs px-3">Lưu</button></div></div><div style="margin-top:10px"><label class="fl"><i class="fa-solid fa-code"></i>Script URL – Ghi dữ liệu lên Sheet</label><div class="flex gap-2"><input type="url" class="inp flex-1" id="' + P + 'LnkSCR" placeholder="Dán link Google Apps Script"><button onclick="' + pv + '.svLnk(&#39;TD_SCR&#39;,&#39;' + P + 'LnkSCR&#39;)" class="bp text-xs px-3">Lưu</button></div></div></div></div></div></div>' +
            '<div class="cfm-bg" id="' + P + 'CfmDel"><div class="cfm-box"><i class="fa-solid fa-triangle-exclamation text-3xl mb-3" style="color:var(--td-red)"></i><p class="text-base font-semibold mb-1">Xóa chương trình?</p><p class="text-sm mb-5" style="color:var(--td-fgm)" id="' + P + 'CfmTxt"></p></div><div class="flex gap-3 justify-center"><button onclick="' + pv + '.ddl()" class="bp text-sm px-5" style="background:linear-gradient(135deg,var(--td-red),#8a2a22);border-radius:8px"><i class="fa-solid fa-trash mr-1"></i>Xóa</button><button onclick="' + pv + '.ccf()" class="bs text-sm px-5">Huỷ</button></div></div></div>';
    }

    function init() {
        var container = gid(cfg.containerId);
        if (!s.inited) {
            container.innerHTML = buildHTML();
            gid(P + 'PwInp').addEventListener('keydown', function(e) { if (e.key === 'Enter') spw(); });
            gid(P + 'Mdl').addEventListener('click', function(e) { if (e.target === e.currentTarget) cm(); });
            gid(P + 'LinksMdl').addEventListener('click', function(e) { if (e.target === e.currentTarget) cLinks(); });
            gid(P + 'Popup').addEventListener('click', function(e) { if (e.target === e.currentTarget) cpop(); });
            document.addEventListener('click', function(e) {
                if (gid(P + 'AdmWrap') && !gid(P + 'AdmWrap').contains(e.target)) {
                    s.ddOpen = false;
                    gid(P + 'AdmDD').classList.remove('show');
                }
            });
            s.inited = true;
        }
        ca();
        lfs();
    }


    return {
        gid: gid, init: init, togDD: togDD, admLinks: admLinks, admReload: admReload, admOut: admOut, admLock: admLock, na: na, spw: spw, cpw: cpw, cpop: cpop, rpop: rpop, efp: efp, expXls: expXls, cm: cm, cLinks: cLinks, svLnk: svLnk, autoDet: autoDet, savePrg: savePrg, ad: ad, ccf: ccf, ddl: ddl, oe: oe, op: op
    };
};

var tdPage = createTDPage({
    prefix: 'td', varName: 'tdPage', containerId: 'view-race', title: 'Tiến Độ Thi Đua', badge: 'Thi đua', badgeIcon: 'fa-trophy', emptyTitle: 'Chưa có chương trình thi đua', emptyDesc: 'Nhấn icon <i class="fa-solid fa-user-shield" style="color:var(--td-accent)"></i> để quản trị.', filterFn: function(n) { return /^thi\s*đua/i.test(n); }
});

var poPage = createTDPage({
    prefix: 'po', varName: 'poPage', containerId: 'view-policy', title: 'Chính Sách', badge: 'Chính sách', badgeIcon: 'fa-book', emptyTitle: 'Chưa có chính sách nào', emptyDesc: 'Nhấn icon <i class="fa-solid fa-user-shield" style="color:var(--td-accent)"></i> để quản trị.', filterFn: function(n) { return /^chính\s*sách/i.test(n); }
});

var clbPage = createTDPage({
    prefix: 'cb', varName: 'clbPage', containerId: 'view-clb', title: 'CLB Sao Việt', badge: 'CLB', badgeIcon: 'fa-star', emptyTitle: 'Chưa có chương trình CLB nào', emptyDesc: 'Nhấn icon <i class="fa-solid fa-user-shield" style="color:var(--td-accent)"></i> để quản trị.', filterFn: function(n) { return /CLB/i.test(n); }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Close calendar popup if open
        var calOverlay = document.getElementById('cal-popup-overlay');
        if (calOverlay && calOverlay.classList.contains('open')) {
            calClosePopup();
            return;
        }
        [tdPage, poPage, clbPage].forEach(function(pg) {
            if (!pg) return;
            ['PwMdl', 'CfmDel', 'Mdl', 'Popup'].forEach(function(s) {
                var el = pg.gid(s);
                if (el && el.classList.contains('open')) {
                    if (s === 'PwMdl') pg.cpw();
                    else if (s === 'CfmDel') pg.ccf();
                    else if (s === 'Popup') pg.cpop();
                    else if (s === 'Mdl') pg.cm();
                }
            });
        });
    }
});

function renderTodayPill() {
    var el = document.getElementById('today-pill');
    if (!el) return;
    var d = new Date();
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yy = d.getFullYear();
    el.innerHTML = '<i class="fa-solid fa-calendar-day"></i><span class="cdp-day">' + dd + '/' + mm + '/' + yy + '</span>';
}
renderTodayPill();
setInterval(renderTodayPill, 60000);

syncData();

/* Resize: cập nhật biểu đồ AFYP + re-render desktop layout */
var _afypResizeTimer;
window.addEventListener('resize', function() {
    clearTimeout(_afypResizeTimer);
    _afypResizeTimer = setTimeout(function() {
        renderAfypChart();
        /* On significant resize, re-render to switch between desktop/mobile layouts */
    }, 200);
});
