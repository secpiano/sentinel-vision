/* ============ app.js — 主控制器：路由 · 大屏 · 情报流 · 图谱 · 实时模拟 ============ */
(function(){
'use strict';
const SV = (window.SV = window.SV || {});
const D = SV.data;

const state = {
  items: [],
  route: 'dashboard',
  globe: null,
  trend: null, donut: null, gauge: null,
  graphInst: null,
  filterSev: 'all', filterCat: 'all', query: '',
  termLines: [], termTyping: false,
  simTimer: null, demoIdx: 0, uiTimers: []
};

/* ================= 工具 ================= */
function toast(msg){
  let t = document.getElementById('toast');
  if(!t){ t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  clearTimeout(t._h);
  t._h = setTimeout(() => t.remove(), 2600);
}
function showModal(html, after){
  closeModal();
  const mask = document.createElement('div');
  mask.className = 'modal-mask'; mask.id = 'modalMask';
  mask.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(mask);
  mask.addEventListener('click', e => { if(e.target === mask || e.target.hasAttribute('data-x')) closeModal(); });
  after && after(mask);
}
function closeModal(){ const m = document.getElementById('modalMask'); m && m.remove(); }
function addTimer(fn, ms){ state.uiTimers.push(setTimeout(fn, ms)); }
function clearTimers(){ state.uiTimers.forEach(clearTimeout); state.uiTimers = []; if(state.termIv){ clearInterval(state.termIv); state.termIv = null; } }

/* ================= 启动 ================= */
function boot(){
  const bootStatus = document.getElementById('bootStatus');
  const fill = document.getElementById('bootBarFill');
  const steps = ['正在初始化情报网格…', '加载默认采集源…', '解密演示情报流…', '建立威胁模型…', '系统就绪'];
  let i = 0;
  const tick = () => {
    if(i < steps.length){
      bootStatus.textContent = steps[i];
      fill.style.width = Math.round((i + 1) / steps.length * 100) + '%';
      i++;
      setTimeout(tick, 260 + Math.random() * 220);
    } else {
      setTimeout(() => {
        document.getElementById('boot').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        startApp();
      }, 320);
    }
  };
  tick();
}

function startApp(){
  state.items = D.buildDemoIntel(Date.now());
  state.demoIdx = 0;
  // 时钟
  const clockEl = document.getElementById('tsClock');
  const clockTimer = setInterval(() => { clockEl.textContent = D.fmtClock(new Date()); }, 1000);
  clockEl.textContent = D.fmtClock(new Date());
  window.addEventListener('beforeunload', () => clearInterval(clockTimer));
  // 路由
  window.addEventListener('hashchange', route);
  route();
  // 实时模拟
  startSimulation();
  // 终端欢迎
  pushTerm('sys', 'SENTINEL VISION v2.6 · 情报网格已上线');
  pushTerm('ok', '已加载默认采集源 ' + D.getSources().filter(s => s.enabled).length + ' 个（含 RSS / 公众号 / X / URL 监控）');
  pushTerm('sys', '静态部署模式：数据为本地演示快照 · 真实采集接入指引见 README');
}

/* ================= 路由 ================= */
function route(){
  const hash = (location.hash || '#/dashboard').replace('#/', '');
  const r = hash.split('?')[0];
  const valid = ['dashboard', 'intel', 'graph', 'sources'];
  const dest = valid.includes(r) ? r : 'dashboard';
  // 清理旧视图
  clearTimers();
  if(state.globe){ state.globe.stop(); state.globe = null; }
  if(state.graphInst){ state.graphInst.stop(); state.graphInst = null; }
  ['trend','donut','gauge'].forEach(k => { if(state[k] && state[k].destroy) state[k].destroy(); state[k] = null; });
  (state.kpiSparks || []).forEach(s => s.destroy && s.destroy());
  state.kpiSparks = [];
  state.route = dest;
  document.querySelectorAll('#mainNav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('data-route') === dest);
  });
  const view = document.getElementById('view');
  if(dest === 'dashboard') renderDashboard(view);
  else if(dest === 'intel') renderIntel(view);
  else if(dest === 'graph') renderGraph(view);
  else if(dest === 'sources') enterAdmin(view);
  updateTopStats();
  document.getElementById('sbFeed').textContent = 'FEED · ' + (dest === 'sources' ? '后台模式' : 'LIVE · ' + state.items.length + ' 条');
}

/* ================= 顶栏统计 ================= */
function updateTopStats(){
  const sources = D.getSources().filter(s => s.enabled);
  const threats = state.items.filter(i => i.severity === 'crit' || i.severity === 'high').length;
  document.getElementById('tsSources').textContent = sources.length + ' 源在线';
  document.getElementById('tsThreats').textContent = threats + ' 活跃威胁';
  document.getElementById('sbFeed').textContent = 'FEED · LIVE · ' + state.items.length + ' 条';
}

/* ================= 大屏 ================= */
function renderDashboard(view){
  const now = Date.now();
  const items = state.items;
  const today = items.filter(i => now - i.ts < 86400000).length;
  const critHigh = items.filter(i => i.severity === 'crit' || i.severity === 'high').length;
  const iocCount = new Set(items.flatMap(i => (i.iocs || []).map(x => x.v))).size;
  const dist = sevDist(items);

  view.innerHTML = `
    <div class="screen">
      <div class="kpis">
        ${kpi('cyan', '今日情报', today, '条', 0)}
        ${kpi('magenta', '严重/高危', critHigh, '条', 1)}
        ${kpi('purple', 'IOC 指标', iocCount, '个', 2)}
        ${kpi('green', '在线源', D.getSources().filter(s=>s.enabled).length, '个', 3)}
      </div>
      <div class="grid-dash">
        <div class="panel p-globe">
          <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
          <div class="panel-title">全球威胁态势 · GLOBAL THREAT MAP</div>
          <div class="panel-body">
            <div id="globeContainer"></div>
            <div class="globe-tip">DRAG TO ROTATE · 拖拽旋转</div>
            <div class="globe-hud">
              <div>NODES <b>${D.GEO_NODES.length}</b> · ARCS <b id="hudArcs">0</b> · SIM <b>LIVE</b></div>
              <div><b style="color:var(--magenta)">■</b> 高危事件流 &nbsp;<b style="color:var(--cyan)">■</b> 常规情报流 &nbsp;<b style="color:var(--purple)">■</b> 供应链/特异</div>
            </div>
          </div>
        </div>
        <div class="panel p-feed">
          <span class="corner tl"></span><span class="corner tr"></span>
          <div class="panel-title">实时情报流 · LIVE INTEL <span style="margin-left:auto;color:var(--green);font-size:10px" class="ledBlink">● LIVE</span></div>
          <div class="feed-list" id="dashFeed"></div>
        </div>
        <div class="panel">
          <span class="corner tl"></span><span class="corner tr"></span>
          <div class="panel-title">14 日情报趋势 · TREND</div>
          <div class="panel-body" style="height:170px" id="trendBox"></div>
        </div>
        <div class="panel">
          <span class="corner tl"></span><span class="corner tr"></span>
          <div class="panel-title">威胁等级 · THREAT LEVEL</div>
          <div class="panel-body" style="height:170px" id="gaugeBox"></div>
        </div>
        <div class="panel">
          <span class="corner tl"></span><span class="corner tr"></span>
          <div class="panel-title">严重度分布 · SEVERITY</div>
          <div class="panel-body" style="height:170px" id="donutBox"></div>
        </div>
        <div class="panel" style="grid-row:span 1">
          <span class="corner tl"></span><span class="corner tr"></span>
          <div class="panel-title">活跃源排行 · TOP SOURCES</div>
          <div class="panel-body rank-list" id="rankBox" style="max-height:170px;overflow:auto"></div>
        </div>
        <div class="terminal">
          <div class="term-head"><span class="live">● LIVE</span><span>SECURITY OPERATIONS TERMINAL</span><span style="margin-left:auto">LOG STREAM</span></div>
          <div id="termBody"></div>
        </div>
      </div>
    </div>`;

  // 地球
  state.globe = SV.globe.startGlobe(document.getElementById('globeContainer'), {
    onImpact(arc){
      const n = arc.b;
      const sev = arc.hue === 340 ? 'crit' : arc.hue === 275 ? 'high' : 'ok';
      const kindText = sev === 'crit' ? '[高危事件]' : sev === 'high' ? '[威胁关联]' : '[情报流入]';
      pushTerm(sev === 'crit' ? 'crit' : sev === 'high' ? 'warn' : 'ok',
        `${kindText} ${n.name} 节点完成一次情报汇聚 · 会话 ${Math.random().toString(16).slice(2,8)}`);
      const el = document.getElementById('hudArcs');
      if(el) el.textContent = String(arcsCount());
    }
  });
  // 图表
  const trend = trendSeries(items, 14);
  state.trend = SV.charts.trendChart(document.getElementById('trendBox'), trend);
  state.donut = SV.charts.donutChart(document.getElementById('donutBox'), dist);
  state.gauge = SV.charts.gaugeChart(document.getElementById('gaugeBox'), threatLevel(items));
  // KPI 迷你趋势
  state.kpiSparks = [];
  view.querySelectorAll('.kpi-spark').forEach((box, i) => {
    const vals = trend.map(t => Math.max(1, t.count * [0.9, 0.35, 0.5, 0.12][i] + (i % 2) + 1));
    state.kpiSparks.push(SV.charts.sparkline(box, vals, ['rgb(0,229,255)', 'rgb(255,45,120)', 'rgb(139,92,246)', 'rgb(0,255,157)'][i]));
  });
  // 排行
  renderRanks();
  // 迷你情报流
  renderDashFeed();
  // 终端渲染循环
  typeLoop();
}
function kpi(color, label, num, unit, sparkIdx){
  return `
    <div class="panel kpi ${color}">
      <span class="corner tl"></span><span class="corner tr"></span>
      <div class="kpi-num">${num}<small>${unit}</small></div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-spark"></div>
    </div>`;
}
function sevDist(items){
  const d = { crit:0, high:0, med:0, low:0, info:0 };
  items.forEach(i => { if(d[i.severity] !== undefined) d[i.severity]++; });
  return d;
}
function trendSeries(items, days){
  const out = [];
  const now = new Date();
  for(let i = days - 1; i >= 0; i--){
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    out.push({ label: key.slice(5), count: items.filter(x => Number.isFinite(x.ts) && new Date(x.ts).toISOString().slice(0,10) === key).length });
  }
  return out;
}
function threatLevel(items){
  const now = Date.now();
  let score = 0, weight = 0;
  items.forEach(i => {
    const ageH = (now - i.ts) / 3600000;
    if(ageH > 72) return;
    const w = 1 - ageH / 72;
    weight += w;
    score += ({ crit: 100, high: 74, med: 46, low: 24, info: 12 }[i.severity] || 10) * w;
  });
  return weight ? Math.min(99, Math.round(score / weight)) : 20;
}
function renderRanks(){
  const box = document.getElementById('rankBox');
  if(!box) return;
  const m = {};
  state.items.forEach(i => { m[i.source] = (m[i.source] || 0) + 1; });
  const rows = Object.entries(m).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 8);
  box.innerHTML = SV.charts.rankHTML(rows);
}
function arcsCount(){
  return state.items.filter(i => i.severity === 'crit' || i.severity === 'high').length;
}
function feedItemHTML(i, now){
  const m = D.SEV_META[i.severity] || D.SEV_META.info;
  return `
    <div class="feed-item">
      <div class="feed-sev sev-${i.severity}">${m.letter}</div>
      <div class="feed-body">
        <div class="feed-title">${D.esc(i.title)}</div>
        <div class="feed-meta">
          <span class="src">${D.esc(i.source)}</span>
          <span>${D.timeAgo(i.ts, now)}</span>
          <span class="tag">${D.esc(i.category)}</span>
          ${i.region ? `<span>◉ ${D.esc(i.region)}</span>` : ''}
        </div>
      </div>
    </div>`;
}
function renderDashFeed(){
  const box = document.getElementById('dashFeed');
  if(!box) return;
  const now = Date.now();
  box.innerHTML = state.items.slice(0, 20).map(i => feedItemHTML(i, now)).join('');
}

/* ================= 情报流页 ================= */
function renderIntel(view){
  view.innerHTML = `
    <div class="screen">
      <div class="intel-layout">
        <div class="panel" style="display:flex;flex-direction:column;min-height:0">
          <span class="corner tl"></span><span class="corner tr"></span>
          <div class="panel-title">情报流 · INTEL FEED <span style="margin-left:auto;font-size:10px;color:var(--txt-faint)" id="intelCount"></span></div>
          <div class="intel-filters" style="border-bottom:none;padding-bottom:2px">
            <input class="intel-search" id="intelSearch" placeholder="搜索标题 / 来源 / 内容 / IOC…" style="margin-left:0;max-width:none;flex:1">
          </div>
          <div class="intel-filters" id="sevChips"></div>
          <div class="intel-filters" id="catChips" style="border-top:none;padding-top:0"></div>
          <div class="intel-list" id="intelList"></div>
        </div>
        <div class="intel-side">
          <div class="panel">
            <span class="corner tl"></span><span class="corner tr"></span>
            <div class="panel-title">IOC 热榜 · TOP INDICATORS</div>
            <div class="panel-body rank-list" id="iocRank"></div>
          </div>
          <div class="panel">
            <span class="corner tl"></span><span class="corner tr"></span>
            <div class="panel-title">分类占比 · CATEGORIES</div>
            <div class="panel-body rank-list" id="catRank"></div>
          </div>
        </div>
      </div>
    </div>`;
  renderSevChips();
  renderCatChips();
  renderIntelList();
  renderIocRank();
  renderCatRank();
  const sb = document.getElementById('intelSearch');
  if(sb) sb.addEventListener('input', () => { state.query = sb.value; renderIntelList(); });
}
function renderSevChips(){
  const box = document.getElementById('sevChips');
  if(!box) return;
  const dist = sevDist(state.items);
  const total = state.items.length;
  const mk = (key, label, n) =>
    `<button class="chip ${state.filterSev === key ? 'active' : ''}" data-sev="${key}">${label} <b>${n}</b></button>`;
  box.innerHTML =
    mk('all', '全部', total) +
    mk('crit', '严重', dist.crit) + mk('high', '高危', dist.high) +
    mk('med', '中危', dist.med) + mk('low', '关注', dist.low);
  box.querySelectorAll('[data-sev]').forEach(b => b.addEventListener('click', () => {
    state.filterSev = b.getAttribute('data-sev');
    renderSevChips(); renderIntelList();
  }));
}
function renderCatChips(){
  const box = document.getElementById('catChips');
  if(!box) return;
  const cats = D.CATEGORIES.filter(c => state.items.some(i => i.category === c));
  box.innerHTML = `<button class="chip ${state.filterCat === 'all' ? 'active' : ''}" data-cat="all">全部分类</button>` +
    cats.map(c => `<button class="chip ${state.filterCat === c ? 'active' : ''}" data-cat="${D.esc(c)}">${D.esc(c)}</button>`).join('');
  box.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
    state.filterCat = b.getAttribute('data-cat');
    renderCatChips(); renderIntelList();
  }));
}
function filteredItems(){
  const q = state.query.trim().toLowerCase();
  return state.items.filter(i =>
    (state.filterSev === 'all' || i.severity === state.filterSev) &&
    (state.filterCat === 'all' || i.category === state.filterCat) &&
    (!q || (i.title + ' ' + i.desc + ' ' + i.source).toLowerCase().includes(q))
  );
}
function renderIntelList(){
  const box = document.getElementById('intelList');
  if(!box) return;
  const list = filteredItems();
  const count = document.getElementById('intelCount');
  if(count) count.textContent = list.length + ' / ' + state.items.length + ' 条';
  if(!list.length){ box.innerHTML = '<div class="empty">没有符合条件的情报</div>'; return; }
  const now = Date.now();
  const safeUrl = u => /^https?:\/\//i.test(u || '') ? D.esc(u) : null;
  box.innerHTML = list.map(i => {
    const m = D.SEV_META[i.severity] || D.SEV_META.info;
    const iocs = (i.iocs || []).map(o => {
      const cls = o.kind === 'ip' ? 'ip' : o.kind === 'hash' ? 'hash' : o.kind === 'cve' ? '' : o.kind === 'domain' ? 'domain' : '';
      return `<span class="ioc ${cls}" data-copy="${D.esc(o.v)}" title="点击复制">${D.esc(o.v)}</span>`;
    }).join('');
    return `
      <div class="intel-card">
        <div class="intel-head">
          <span class="badge ${i.severity === 'crit' ? 'rss' : 'url'}" style="background:${m.color}18;color:${m.color};border-color:${m.color}55">${m.label}</span>
          <span class="intel-title">${D.esc(i.title)}</span>
        </div>
        <div class="intel-desc">${D.esc(i.desc)}</div>
        <div class="intel-foot">
          <span class="src">◉ ${D.esc(i.source)}</span>
          <span>${D.fmtDate(i.ts)}</span>
          <span class="tag" style="color:var(--purple)">${D.esc(i.category)}</span>
          ${i.region ? `<span>◉ ${D.esc(i.region)}</span>` : ''}
          ${safeUrl(i.url) ? `<a href="${safeUrl(i.url)}" target="_blank" rel="noopener">原文 ↗</a>` : ''}
          ${iocs}
        </div>
      </div>`;
  }).join('');
  box.querySelectorAll('[data-copy]').forEach(el => el.addEventListener('click', () => {
    const v = el.getAttribute('data-copy');
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject())
      .then(() => toast('已复制 ' + v))
      .catch(() => toast('复制失败'));
  }));
}
function renderIocRank(){
  const box = document.getElementById('iocRank');
  if(!box) return;
  const m = {};
  state.items.forEach(i => (i.iocs || []).forEach(o => { m[o.v] = (m[o.v] || 0) + 1; }));
  const rows = Object.entries(m).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 9);
  box.innerHTML = rows.length ? SV.charts.rankHTML(rows) : '<div class="empty">暂无指标</div>';
}
function renderCatRank(){
  const box = document.getElementById('catRank');
  if(!box) return;
  const m = {};
  state.items.forEach(i => { m[i.category] = (m[i.category] || 0) + 1; });
  const rows = Object.entries(m).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
  box.innerHTML = SV.charts.rankHTML(rows);
}

/* ================= 图谱页 ================= */
function renderGraph(view){
  view.innerHTML = `
    <div class="screen">
      <div class="graph-layout">
        <div class="panel p-graph">
          <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
          <div class="panel-title">威胁关联图谱 · THREAT GRAPH <span style="margin-left:auto;font-size:10px;color:var(--txt-faint)">拖拽节点 · 滚轮?暂不支持缩放 · 悬停查看</span></div>
          <div class="panel-body">
            <div id="graphContainer"></div>
            <div class="graph-legend">
              ${['org|威胁组织/事件组','malware|恶意软件/样本','cve|漏洞 CVE','domain|恶意域名','ip|C2 / 主机','source|情报源','country|国家地区']
                .map(s => { const [t, n] = s.split('|'); const c = { org:'#ff2d78', malware:'#ff4d5e', cve:'#ffb020', domain:'#00e5ff', ip:'#00ff9d', country:'#8b5cf6', source:'#4d9fff' }[t];
                  return `<span><span class="gl-dot" style="background:${c};box-shadow:0 0 6px ${c}"></span>${n}</span>`; }).join('')}
            </div>
          </div>
        </div>
        <div class="graph-side">
          <div class="panel">
            <span class="corner tl"></span><span class="corner tr"></span>
            <div class="panel-title">图谱说明</div>
            <div class="panel-body" style="font-size:12px;color:var(--txt-dim);line-height:1.85">
              基于 <b style="color:var(--cyan)" id="gNodeN">0</b> 个实体、<b style="color:var(--cyan)" id="gEdgeN">0</b> 条关系构建：<br>
              · 情报源 → 事件分组 → IOC / 地区<br>
              · 拖拽节点重组布局，悬停查看详情<br>
              · 接入真实后端后可扩展 STIX 2.1 关系导入
            </div>
          </div>
          <div class="panel">
            <span class="corner tl"></span><span class="corner tr"></span>
            <div class="panel-title">关键实体 · KEY ENTITIES</div>
            <div class="panel-body rank-list" id="keyEntities"></div>
          </div>
        </div>
      </div>
    </div>`;
  const { nodes, edges } = SV.charts.buildGraphData(state.items, 36);
  state.graphInst = SV.charts.forceGraph(document.getElementById('graphContainer'), nodes, edges);
  const nn = document.getElementById('gNodeN'); if(nn) nn.textContent = nodes.length;
  const en = document.getElementById('gEdgeN'); if(en) en.textContent = edges.length;
  const ke = document.getElementById('keyEntities');
  const m = {};
  state.items.forEach(i => (i.iocs || []).forEach(o => { m[o.v] = (m[o.v] || 0) + 1; }));
  ke.innerHTML = SV.charts.rankHTML(Object.entries(m).map(([name, count]) => ({ name, count })).sort((a,b)=>b.count-a.count).slice(0,8));
}

/* ================= 后台入口 ================= */
function enterAdmin(view){
  const mount = () => SV.admin.render(view);
  D.adminConfigured() ? mount() : SV.admin.loginFlow(mount);
}

/* ================= 终端 ================= */
function pushTerm(kind, text){
  state.termLines.push({ kind, text });
  if(state.termLines.length > 42) state.termLines.shift();
}
function typeLoop(){
  if(state.route !== 'dashboard') return;
  const body = document.getElementById('termBody');
  if(!body) return;
  if(!state.termTyping && state.termLines.length){
    state.termTyping = true;
    const line = state.termLines.shift();
    const cls = line.kind === 'ok' ? 't-ok' : line.kind === 'warn' ? 't-warn' : line.kind === 'crit' ? 't-crit' : 't-sys';
    const span = document.createElement('span');
    span.className = cls;
    const time = D.fmtClock(new Date());
    const full = `[${time}] ${line.text}`;
    let idx = 0;
    const cursor = document.createElement('i');
    cursor.className = 'cursor';
    body.appendChild(span); body.appendChild(cursor);
    if(state.termIv) clearInterval(state.termIv);
    const iv = state.termIv = setInterval(() => {
      idx += 2;
      span.textContent = full.slice(0, idx);
      if(idx >= full.length){
        clearInterval(iv);
        body.insertBefore(document.createTextNode('\n'), cursor);
        state.termTyping = false;
      }
      while(body.childNodes.length > 220) body.removeChild(body.firstChild);
    }, 14);
  }
  state.uiTimers.push(setTimeout(typeLoop, 60));
}

/* ================= 实时模拟引擎 ================= */
function startSimulation(){
  const settings = D.getSettings();
  if(!settings.simulation) return;
  clearInterval(state.simTimer);
  const schedule = () => {
    state.simTimer = setInterval(() => {
      if(document.hidden) return;
      if(state.items.length === 0) return;
      // 从演示池轮转生成"新"条目
      const pool = D.buildDemoIntel(Date.now());
      const pick = pool[state.demoIdx % pool.length];
      state.demoIdx++;
      const fresh = { ...pick, id: 'sim-' + Date.now().toString(36), ts: Date.now(), sim: true };
      state.items.unshift(fresh);
      if(state.items.length > 400) state.items.pop();
      // 视觉联动
      if(state.globe) state.globe.spawnArc();
      const sevTxt = { crit:'[严重] ', high:'[高危] ', med:'[中危] ', low:'[关注] ', info:'' }[fresh.severity] || '';
      pushTerm(fresh.severity === 'crit' ? 'crit' : fresh.severity === 'high' ? 'warn' : 'ok',
        sevTxt + fresh.source + ' → ' + fresh.title.slice(0, 38) + (fresh.title.length > 38 ? '…' : ''));
      // 更新当前视图
      if(state.route === 'dashboard'){
        renderDashFeed(); renderRanks();
        if(state.trend) state.trend.draw();
        if(state.donut) state.donut.draw();
        if(state.gauge) state.gauge.draw();
        typeLoop();
      } else if(state.route === 'intel'){
        renderIntelList(); renderIocRank(); renderCatRank();
      }
      updateTopStats();
    }, 14000 + Math.random() * 9000);
  };
  schedule();
}

/* ================= 导出 ================= */
SV.app = { toast, showModal, closeModal, refreshStats: updateTopStats, state };

/* ================= GO ================= */
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
