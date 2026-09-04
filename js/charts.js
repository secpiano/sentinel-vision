/* ============ charts.js — 纯 Canvas 图表引擎（零依赖） ============ */
(function(){
'use strict';
const SV = (window.SV = window.SV || {});

/* ---- 通用：创建 HiDPI canvas ---- */
function mkCanvas(container){
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = container.clientWidth || 300, h = container.clientHeight || 160;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }
  return { canvas, ctx, resize };
}
const F = "'Cascadia Code',Consolas,monospace";

/* ---- 迷你趋势 sparkline ---- */
function sparkline(container, values, color){
  const { ctx, resize } = mkCanvas(container);
  function draw(){
    const { w, h } = resize();
    ctx.clearRect(0, 0, w, h);
    const max = Math.max(1, ...values);
    const step = w / (values.length - 1 || 1);
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = i * step, y = h - 3 - (v / max) * (h - 6);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.strokeStyle = color; ctx.lineWidth = 1.6;
    ctx.shadowColor = color; ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, color.replace(')', ',.28)').replace('rgb', 'rgba'));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fill();
  }
  draw();
  window.addEventListener('resize', draw);
  return { draw };
}

/* ---- 14 日趋势面积图 ---- */
function trendChart(container, series){
  const { ctx, resize } = mkCanvas(container);
  const hover = { x: -1, i: -1 };
  container.addEventListener('pointermove', e => {
    const r = container.getBoundingClientRect();
    hover.x = e.clientX - r.left;
    hover.i = Math.round((hover.x - 34) / ((r.width - 50) / Math.max(1, series.length - 1)));
    hover.i = Math.max(0, Math.min(series.length - 1, hover.i));
  });
  container.addEventListener('pointerleave', () => { hover.i = -1; });
  function draw(){
    const { w, h } = resize();
    ctx.clearRect(0, 0, w, h);
    const padL = 34, padR = 16, padT = 14, padB = 22;
    const iw = w - padL - padR, ih = h - padT - padB;
    const max = Math.max(4, ...series.map(s => s.count));
    // 网格
    ctx.strokeStyle = 'rgba(0,229,255,.07)'; ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(109,132,168,.8)'; ctx.font = '10px ' + F;
    for(let g=0; g<=3; g++){
      const y = padT + ih * g / 3;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      ctx.fillText(String(Math.round(max * (3 - g) / 3)), 6, y + 3);
    }
    const step = iw / Math.max(1, series.length - 1);
    // 面积
    ctx.beginPath();
    series.forEach((s, i) => {
      const x = padL + i * step, y = padT + ih - (s.count / max) * ih;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineTo(padL + iw, padT + ih); ctx.lineTo(padL, padT + ih); ctx.closePath();
    const g2 = ctx.createLinearGradient(0, padT, 0, padT + ih);
    g2.addColorStop(0, 'rgba(0,229,255,.25)'); g2.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = g2; ctx.fill();
    // 日期刻度
    ctx.fillStyle = 'rgba(109,132,168,.8)'; ctx.font = '9px ' + F;
    series.forEach((s, i) => {
      if(series.length > 8 && i % 2 !== 0 && i !== series.length - 1) return;
      const x = padL + i * step;
      ctx.fillText(s.label.slice(5), x - 12, h - 6);
    });
    // 悬浮
    if(hover.i >= 0){
      const s = series[hover.i];
      const x = padL + hover.i * step, y = padT + ih - (s.count / max) * ih;
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + ih); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      const label = s.label + ' · ' + s.count + ' 条';
      ctx.font = '10px ' + F;
      const tw = ctx.measureText(label).width + 14;
      const bx = Math.min(w - tw - 4, Math.max(4, x - tw / 2));
      ctx.fillStyle = 'rgba(6,12,26,.92)';
      ctx.strokeStyle = 'rgba(0,229,255,.4)';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, 4, tw, 18, 4) : ctx.rect(bx, 4, tw, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d8ecff';
      ctx.fillText(label, bx + 7, 17);
    }
  }
  draw();
  window.addEventListener('resize', draw);
  return { draw };
}

/* ---- 严重度环形图 ---- */
function donutChart(container, dist){
  const { ctx, resize } = mkCanvas(container);
  function draw(){
    const { w, h } = resize();
    ctx.clearRect(0, 0, w, h);
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 8;
    if(!total){
      ctx.fillStyle = 'rgba(109,132,168,.7)'; ctx.font = '11px ' + F;
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据', cx, cy + 4);
      ctx.textAlign = 'left';
      return;
    }
    const colors = { crit:'#ff2d78', high:'#ff4d5e', med:'#ffb020', low:'#00e5ff', info:'#6d84a8' };
    const names = { crit:'严重', high:'高危', med:'中危', low:'关注', info:'情报' };
    let a0 = -Math.PI / 2;
    const order = ['crit','high','med','low','info'];
    order.forEach(k => {
      const v = dist[k] || 0;
      if(!v) return;
      const a1 = a0 + (v / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0 + 0.02, a1 - 0.02);
      ctx.strokeStyle = colors[k]; ctx.lineWidth = Math.max(10, R * 0.24);
      ctx.lineCap = 'butt';
      ctx.shadowColor = colors[k]; ctx.shadowBlur = 10;
      ctx.stroke();
      a0 = a1;
    });
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(R*0.5) + 'px ' + F;
    ctx.fillText(String(total), cx, cy + 2);
    ctx.fillStyle = 'rgba(109,132,168,.9)'; ctx.font = '9px ' + F;
    ctx.fillText('TOTAL', cx, cy + R*0.42);
    ctx.textAlign = 'left';
    // 图例
    let ly = 6;
    ctx.font = '10px ' + F;
    order.slice().reverse().forEach(k => {
      const v = dist[k] || 0;
      ctx.fillStyle = colors[k];
      ctx.fillRect(6, ly + 2, 8, 8);
      ctx.fillStyle = 'rgba(216,236,255,.85)';
      ctx.fillText(names[k] + ' ' + v, 18, ly + 10);
      ly += 15;
    });
  }
  draw();
  window.addEventListener('resize', draw);
  return { draw };
}

/* ---- 威胁等级仪表 ---- */
function gaugeChart(container, score){
  const { ctx, resize } = mkCanvas(container);
  function draw(){
    const { w, h } = resize();
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.78, R = Math.min(w * 0.4, h * 0.72);
    const a0 = Math.PI * 1.05, a1 = Math.PI * 1.95;
    // 背景弧
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1);
    ctx.strokeStyle = 'rgba(0,229,255,.1)'; ctx.lineWidth = 10; ctx.stroke();
    // 分段刻度
    const lvlColor = score >= 80 ? '#ff2d78' : score >= 60 ? '#ff4d5e' : score >= 38 ? '#ffb020' : '#00e5ff';
    const lvName = score >= 80 ? '警戒' : score >= 60 ? '高危' : score >= 38 ? '提升' : '平稳';
    const aScore = a0 + (a1 - a0) * Math.min(1, Math.max(0, score / 100));
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, aScore);
    ctx.strokeStyle = lvlColor; ctx.lineWidth = 10;
    ctx.shadowColor = lvlColor; ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // 刻度点
    for(let i=0;i<=10;i++){
      const a = a0 + (a1 - a0) * i / 10;
      const x1 = cx + Math.cos(a) * (R + 9), y1 = cy + Math.sin(a) * (R + 9);
      const x2 = cx + Math.cos(a) * (R + 14), y2 = cy + Math.sin(a) * (R + 14);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(0,229,255,.3)'; ctx.lineWidth = 1.4; ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = lvlColor;
    ctx.font = '700 ' + Math.round(R * 0.44) + 'px ' + F;
    ctx.shadowColor = lvlColor; ctx.shadowBlur = 16;
    ctx.fillText(String(score), cx, cy - 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(216,236,255,.85)';
    ctx.font = '10px "Segoe UI","Microsoft YaHei",sans-serif';
    ctx.fillText('当前威胁等级 · ' + lvName, cx, cy + 20);
    ctx.textAlign = 'left';
  }
  draw();
  window.addEventListener('resize', draw);
  return { draw };
}

/* ---- 排行条（DOM 渲染，辅助） ---- */
function rankHTML(rows){
  const max = Math.max(1, ...rows.map(r => r.count));
  return rows.map((r, i) => `
    <div class="rank-row">
      <span class="rank-idx">${String(i+1).padStart(2,'0')}</span>
      <span class="rank-name" title="${SV.data.esc(r.name)}">${SV.data.esc(r.name)}</span>
      <span class="rank-bar"><i style="width:${Math.round(r.count / max * 100)}%"></i></span>
      <span class="rank-val">${r.count}</span>
    </div>`).join('');
}

/* ---- 力导向威胁图谱 ---- */
function forceGraph(container, nodes, edges, opts){
  opts = opts || {};
  const { ctx, resize } = mkCanvas(container);
  const W2 = () => container.clientWidth || 800;
  const H2 = () => container.clientHeight || 500;
  const sim = { nodes: nodes.map(n => ({ ...n })), edges, alpha: 1 };
  sim.nodes.forEach(n => { n.fx = null; });
  // 初始布局：按类型环形分布
  const groups = {};
  sim.nodes.forEach((n, i) => {
    (groups[n.type] = groups[n.type] || []).push(n);
  });
  Object.keys(groups).forEach((g, gi) => {
    const arr = groups[g];
    const baseA = (gi / Object.keys(groups).length) * Math.PI * 2;
    arr.forEach((n, i) => {
      const rr = 150 + i * 12;
      n.x = W2()/2 + Math.cos(baseA + i * 0.35) * rr * 0.7;
      n.y = H2()/2 + Math.sin(baseA + i * 0.35) * rr * 0.55;
    });
  });
  const idx = new Map(sim.nodes.map((n, i) => [n.id, i]));
  const TYPE_COLOR = { org:'#ff2d78', malware:'#ff4d5e', cve:'#ffb020', domain:'#00e5ff', ip:'#00ff9d', country:'#8b5cf6', source:'#4d9fff' };
  const TYPE_NAME = { org:'威胁组织', malware:'恶意软件', cve:'漏洞 CVE', domain:'恶意域名', ip:'C2/主机', country:'国家/地区', source:'情报源' };
  let hoverNode = null, dragNode = null, panX = 0, panY = 0, dragging = false, lx = 0, ly = 0;

  function locate(e){
    const r = container.getBoundingClientRect();
    return { x: e.clientX - r.left - panX, y: e.clientY - r.top - panY };
  }
  container.addEventListener('pointerdown', e => {
    const p = locate(e);
    dragNode = hit(p.x, p.y);
    if(dragNode){ dragNode.pin = true; }
    else { dragging = true; lx = e.clientX; ly = e.clientY; }
    container.setPointerCapture(e.pointerId);
  });
  container.addEventListener('pointermove', e => {
    const p = locate(e);
    if(dragNode){ dragNode.x = p.x; dragNode.y = p.y; sim.alpha = Math.max(sim.alpha, 0.4); return; }
    if(dragging){
      panX += e.clientX - lx; panY += e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      return;
    }
    hoverNode = hit(p.x, p.y);
    container.style.cursor = hoverNode ? 'pointer' : 'default';
  });
  container.addEventListener('pointerup', () => { if(dragNode) dragNode.pin = false; dragNode = null; dragging = false; });
  container.addEventListener('pointerleave', () => { hoverNode = null; dragging = false; });

  function hit(x, y){
    for(let i = sim.nodes.length - 1; i >= 0; i--){
      const n = sim.nodes[i];
      const dx = x - n.x, dy = y - n.y;
      if(dx*dx + dy*dy < (n.r + 6) * (n.r + 6)) return n;
    }
    return null;
  }
  function tick(){
    const a = sim.alpha;
    if(a < 0.002) return;
    sim.alpha *= 0.992;
    // 斥力（网格加速简化：O(n^2) n<120 可接受）
    const ns = sim.nodes;
    for(let i=0;i<ns.length;i++){
      for(let j=i+1;j<ns.length;j++){
        const A = ns[i], B = ns[j];
        let dx = B.x - A.x, dy = B.y - A.y;
        let d2 = dx*dx + dy*dy;
        if(d2 < 1){ dx = (Math.random()-0.5); dy = (Math.random()-0.5); d2 = dx*dx+dy*dy; }
        const d = Math.sqrt(d2);
        const rep = (A.rep || 2600) / d2;
        const fx = dx / d * rep, fy = dy / d * rep;
        A.fx2 = (A.fx2||0) - fx; A.fy2 = (A.fy2||0) - fy;
        B.fx2 = (B.fx2||0) + fx; B.fy2 = (B.fy2||0) + fy;
      }
    }
    // 弹簧
    sim.edges.forEach(e => {
      const A = sim.nodes[idx.get(e.s)], B = sim.nodes[idx.get(e.t)];
      if(!A || !B) return;
      const dx = B.x - A.x, dy = B.y - A.y;
      const d = Math.max(1, Math.sqrt(dx*dx + dy*dy));
      const want = 128;
      const f = (d - want) * 0.012;
      const fx = dx / d * f, fy = dy / d * f;
      A.fx2 = (A.fx2||0) + fx; A.fy2 = (A.fy2||0) + fy;
      B.fx2 = (B.fx2||0) - fx; B.fy2 = (B.fy2||0) - fy;
    });
    // 向心 + 积分
    const cx = W2()/2, cy = H2()/2;
    ns.forEach(n => {
      if(n === dragNode) return;
      n.fx2 = (n.fx2||0) + (cx - n.x) * 0.0016;
      n.fy2 = (n.fy2||0) + (cy - n.y) * 0.0016;
      const damp = n.pin ? 0 : 0.86;
      n.vx = ((n.vx||0) + (n.fx2||0)) * damp;
      n.vy = ((n.vy||0) + (n.fy2||0)) * damp;
      n.fx2 = 0; n.fy2 = 0;
      if(!n.pin){ n.x += n.vx * a * 60 * 0.016; n.y += n.vy * a * 60 * 0.016; }
    });
  }
  function draw(clock){
    const { w, h } = resize();
    ctx.clearRect(0, 0, w, h);
    tick();
    ctx.save();
    ctx.translate(panX, panY);
    // 边
    sim.edges.forEach(e => {
      const A = sim.nodes[idx.get(e.s)], B = sim.nodes[idx.get(e.t)];
      if(!A || !B) return;
      const hl = hoverNode && (hoverNode.id === e.s || hoverNode.id === e.t);
      ctx.strokeStyle = hl ? 'rgba(0,229,255,.5)' : 'rgba(0,229,255,.1)';
      ctx.lineWidth = hl ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    });
    // 节点
    sim.nodes.forEach(n => {
      const c = TYPE_COLOR[n.type] || '#00e5ff';
      const isH = hoverNode && hoverNode.id === n.id;
      const r = n.r + (isH ? 2.5 : 0) + Math.sin(clock * 2 + n.id.length) * 0.4;
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2);
      ctx.fillStyle = c;
      ctx.shadowColor = c; ctx.shadowBlur = isH ? 18 : 8;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      // label
      if(n.r >= 6 || isH || (hoverNode && sim.edges.some(e => (e.s===hoverNode.id&&e.t===n.id)||(e.t===hoverNode.id&&e.s===n.id)))){
        ctx.font = '10px ' + F;
        ctx.fillStyle = 'rgba(216,236,255,.85)';
        ctx.fillText(n.label, n.x + r + 4, n.y + 3);
      }
    });
    // 悬浮详情
    if(hoverNode){
      const n = hoverNode;
      const lines = [TYPE_NAME[n.type] || n.type, n.label, n.meta || ''];
      ctx.font = '11px ' + F;
      const bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 22;
      const bx = Math.min(w - bw - 8, n.x + 16), by = n.y - 14;
      ctx.fillStyle = 'rgba(6,12,26,.94)';
      ctx.strokeStyle = 'rgba(0,229,255,.4)';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by - 8, bw, 58, 7) : ctx.rect(bx, by - 8, bw, 58); ctx.fill(); ctx.stroke();
      ctx.fillStyle = TYPE_COLOR[n.type] || '#00e5ff';
      ctx.fillText(lines[0], bx + 11, by + 8);
      ctx.fillStyle = '#d8ecff';
      ctx.font = '10.5px ' + F;
      ctx.fillText(lines[1].slice(0, 30), bx + 11, by + 24);
      if(lines[2]){ ctx.fillStyle = 'rgba(109,132,168,.9)'; ctx.fillText(lines[2].slice(0, 34), bx + 11, by + 40); }
    }
    ctx.restore();
  }
  let clock = 0, lastT = performance.now(), running = true;
  function frame(now){
    if(!running) return;
    const dt = (now - lastT) / 1000; lastT = now;
    clock += dt;
    draw(clock);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { stop(){ running = false; } };
}

/* 图谱节点/边构建：从情报条目抽取实体关系 */
function buildGraphData(items, maxNodes){
  maxNodes = maxNodes || 34;
  const nodes = new Map(), edges = [];
  const addNode = (id, type, label, r, meta) => {
    if(!nodes.has(id)) nodes.set(id, { id, type, label, r, meta });
    return nodes.get(id);
  };
  const addEdge = (s, t) => {
    if(s === t) return;
    const key = s < t ? s + '|' + t : t + '|' + s;
    const ex = edges.find(e => e.key === key);
    if(ex) ex.w++; else edges.push({ s, t, w: 1, key });
  };
  items.slice(0, 26).forEach(it => {
    const srcId = 'src:' + it.source;
    addNode(srcId, 'source', it.source, 7, '情报来源');
    const sevId = 'sev:' + it.severity;
    addNode(sevId, it.severity === 'crit' || it.severity === 'high' ? 'org' : 'malware',
      (SV.data.SEV_META[it.severity]||{}).label + '事件', 5.5, '严重度分组');
    addEdge(srcId, sevId);
    (it.iocs || []).slice(0, 3).forEach(ioc => {
      const id = ioc.kind + ':' + ioc.v;
      addNode(id, ioc.kind === 'cve' ? 'cve' : ioc.kind === 'ip' ? 'ip' : ioc.kind === 'hash' ? 'malware' : 'domain',
        ioc.v, ioc.kind === 'cve' ? 6 : 4.5, ioc.kind.toUpperCase() + ' 指标');
      addEdge(sevId, id);
    });
    if(it.region){
      const rid = 'region:' + it.region;
      addNode(rid, 'country', it.region, 6, '关联地区（演示）');
      addEdge(sevId, rid);
    }
  });
  const list = [...nodes.values()].slice(0, maxNodes);
  const keep = new Set(list.map(n => n.id));
  const e2 = edges.filter(e => keep.has(e.s) && keep.has(e.t)).slice(0, 90);
  return { nodes: list, edges: e2 };
}

SV.charts = { sparkline, trendChart, donutChart, gaugeChart, rankHTML, forceGraph, buildGraphData };
})();
