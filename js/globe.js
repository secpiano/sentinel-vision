/* ============ globe.js — 纯 Canvas 3D 威胁地球（零依赖） ============ */
/* 旋转线框地球 + 情报节点 + 攻击弧线 + 冲击波纹，鼠标/触摸可拖拽 */
(function(){
'use strict';
const SV = (window.SV = window.SV || {});

function startGlobe(container, opts){
  opts = opts || {};
  const D = SV.data;
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1;
  function resize(){
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = container.clientWidth || 600; H = container.clientHeight || 400;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---- 球体参数 ---- */
  const R = 0.36;                       // 半径占短边比例
  let rotY = 0, rotX = -0.35;           // 自转 + 俯仰
  let velY = 0.0016, velX = 0;
  let dragging = false, lastX = 0, lastY = 0, idleT = 0;
  let radius = 200;

  function computeRadius(){ radius = Math.min(W, H) * R; }
  computeRadius();

  /* ---- 交互 ---- */
  function onDown(x, y){ dragging = true; lastX = x; lastY = y; idleT = 0; }
  function onMove(x, y){
    if(!dragging) return;
    velY = (x - lastX) * 0.00016;
    velX = (y - lastY) * 0.00012;
    rotY += (x - lastX) * 0.004;
    rotX += (y - lastY) * 0.003;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    lastX = x; lastY = y; idleT = 0;
  }
  function onUp(){ dragging = false; }
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); onDown(e.offsetX, e.offsetY); });
  canvas.addEventListener('pointermove', e => onMove(e.offsetX, e.offsetY));
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onUp);

  /* ---- 3D 投影 ---- */
  function project(lat, lon, r){
    const la = lat * Math.PI / 180, lo = lon * Math.PI / 180 + rotY;
    const x0 = r * Math.cos(la) * Math.sin(lo);
    const y0 = r * Math.sin(la);
    const z0 = r * Math.cos(la) * Math.cos(lo);
    // 绕 X 轴俯仰
    const y1 = y0 * Math.cos(rotX) - z0 * Math.sin(rotX);
    const z1 = y0 * Math.sin(rotX) + z0 * Math.cos(rotX);
    return { x: W/2 + x0, y: H/2 - y1, z: z1 };
  }

  /* ---- 节点与弧线 ---- */
  const nodes = D.GEO_NODES.map((n, i) => ({ ...n, phase: i * 1.7, pop: 0 }));
  const arcs = [];
  const ripples = [];
  let sim = D.seeded(20260904);

  function spawnArc(){
    if(arcs.length > 9) return;
    const a = nodes[Math.floor(sim() * nodes.length)];
    let b = nodes[Math.floor(sim() * nodes.length)];
    if(a === b) b = nodes[(nodes.indexOf(a) + 5) % nodes.length];
    arcs.push({ a, b, t: 0, speed: 0.004 + sim() * 0.004, hue: sim() < 0.55 ? 187 : (sim() < 0.8 ? 340 : 275) });
    if(Math.random) {} /* noop */
  }
  /* 初始弧线 */
  for(let i=0;i<5;i++) spawnArc();

  function update(dt, clock){
    idleT += dt;
    if(!dragging && idleT > 1.6){
      // 回归自转
      velY += (0.0016 - velY) * 0.02;
      velX += (0 - velX) * 0.03;
      rotY += velY * 60 * dt * 60 * 0.016 + 0.000075;
    } else {
      rotY += velY * 60 * dt * 60 * 0.016 * 0.4;
    }
    computeRadius();
    // 弧线推进
    for(let i = arcs.length - 1; i >= 0; i--){
      const arc = arcs[i];
      arc.t += arc.speed * dt * 60;
      if(arc.t >= 1.25){
        arcs.splice(i, 1);
        // 冲击波纹
        ripples.push({ node: arc.b, t: 0, hue: arc.hue });
        if(opts.onImpact) opts.onImpact(arc);
        setTimeout(spawnArc, 400 + Math.random() * 2600);
      }
    }
    for(let i = ripples.length - 1; i >= 0; i--){
      ripples[i].t += dt * 1.15;
      if(ripples[i].t > 1) ripples.splice(i, 1);
    }
  }

  function drawBgStars(){
    ctx.save();
    const rnd = D.seeded(77);
    for(let i=0;i<90;i++){
      const x = rnd() * W, y = rnd() * H;
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(clock * 0.8 + i * 2.7));
      ctx.globalAlpha = 0.14 + tw * 0.3;
      ctx.fillStyle = i % 7 === 0 ? '#8b5cf6' : '#00e5ff';
      ctx.fillRect(x, y, 1.4, 1.4);
    }
    ctx.restore();
  }

  function drawSphereWire(){
    const seg = 26;
    ctx.save();
    // 大气辉光
    const glow = ctx.createRadialGradient(W/2, H/2, radius * 0.55, W/2, H/2, radius * 1.28);
    glow.addColorStop(0, 'rgba(0,229,255,0)');
    glow.addColorStop(0.78, 'rgba(0,229,255,.05)');
    glow.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(W/2, H/2, radius * 1.28, 0, Math.PI*2); ctx.fill();
    // 内部深色球体
    const body = ctx.createRadialGradient(W/2 - radius*0.3, H/2 - radius*0.3, radius*0.1, W/2, H/2, radius);
    body.addColorStop(0, 'rgba(10,22,46,.92)');
    body.addColorStop(1, 'rgba(4,8,20,.96)');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(W/2, H/2, radius, 0, Math.PI*2); ctx.fill();
    // 经线
    ctx.lineWidth = 1;
    for(let m=0;m<12;m++){
      const lon = m * 30;
      ctx.beginPath();
      for(let s=0;s<=seg;s++){
        const lat = -90 + 180 * s / seg;
        const p = project(lat, lon, radius);
        if(s === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(0,229,255,.10)';
      ctx.stroke();
    }
    // 纬线
    for(let pIdx=1;pIdx<9;pIdx++){
      const lat = -90 + 180 * pIdx / 9;
      ctx.beginPath();
      for(let s=0;s<=seg*2;s++){
        const lon = -180 + 360 * s / (seg*2);
        const p = project(lat, lon, radius);
        if(s === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = pIdx === 4 || pIdx === 5 ? 'rgba(0,229,255,.16)' : 'rgba(0,229,255,.09)';
      ctx.stroke();
    }
    // 赤道高亮
    ctx.beginPath();
    for(let s=0;s<=seg*2;s++){
      const p = project(0, -180 + 360*s/(seg*2), radius*1.001);
      if(s===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    }
    ctx.strokeStyle = 'rgba(0,229,255,.28)'; ctx.stroke();
    ctx.restore();
  }

  function drawNodes(clock){
    nodes.forEach(n => {
      const p = project(n.lat, n.lon, radius * 1.004);
      if(p.z < -radius * 0.02) { n._back = true; return; } // 背面跳过
      n._back = false;
      const pulse = 0.55 + 0.45 * Math.sin(clock * 2.2 + n.phase);
      const rr = (1.6 + n.w * 1.6) * (0.85 + pulse * 0.3);
      ctx.save();
      ctx.globalAlpha = 0.55 + pulse * 0.4;
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 10 * pulse;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      // 节点名称（较大的）
      if(n.w >= 0.8){
        ctx.save();
        ctx.globalAlpha = 0.5 + pulse * 0.3;
        ctx.font = '10px "Cascadia Code",Consolas,monospace';
        ctx.fillStyle = 'rgba(216,236,255,.8)';
        ctx.fillText(n.name, p.x + 8, p.y + 3);
        ctx.restore();
      }
    });
  }

  function drawArcs(){
    arcs.forEach(arc => {
      const A = project(arc.a.lat, arc.a.lon, radius * 1.004);
      const B = project(arc.b.lat, arc.b.lon, radius * 1.004);
      if(arc.t > 1) return;
      const head = Math.min(1, arc.t / 1);
      const tail = Math.max(0, (arc.t - 0.3) / 1);
      // 中途抬升的贝塞尔弧
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      const dx = B.x - A.x, dy = B.y - A.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const lift = dist * 0.42;
      const cx = mx - dy / (dist||1) * lift * 0.25, cy = my - lift;
      // 弧线路径（细，渐隐）
      ctx.save();
      ctx.strokeStyle = `hsla(${arc.hue},100%,62%,.20)`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(cx, cy, B.x, B.y); ctx.stroke();
      // 脉冲段
      const steps = 34;
      let started = false;
      ctx.beginPath();
      for(let s=0;s<=steps;s++){
        const tt = tail + (head - tail) * s / steps;
        if(tt < 0 || tt > 1){ if(started){ ctx.stroke(); started=false; } continue; }
        const px = (1-tt)*(1-tt)*A.x + 2*(1-tt)*tt*cx + tt*tt*B.x;
        const py = (1-tt)*(1-tt)*A.y + 2*(1-tt)*tt*cy + tt*tt*B.y;
        if(!started){ ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      }
      if(started){
        ctx.strokeStyle = `hsla(${arc.hue},100%,64%,.92)`;
        ctx.lineWidth = 2.1;
        ctx.shadowColor = `hsla(${arc.hue},100%,60%,.9)`;
        ctx.shadowBlur = 9;
        ctx.stroke();
      }
      // 弧头光点
      if(head < 1 && head > tail){
        const hp = head;
        const hx = (1-hp)*(1-hp)*A.x + 2*(1-hp)*hp*cx + hp*hp*B.x;
        const hy = (1-hp)*(1-hp)*A.y + 2*(1-hp)*hp*cy + hp*hp*B.y;
        ctx.fillStyle = `hsla(${arc.hue},100%,72%,1)`;
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawRipples(clock){
    ripples.forEach(rp => {
      const p = project(rp.node.lat, rp.node.lon, radius * 1.004);
      if(p.z < -radius * 0.02) return;
      ctx.save();
      const rr = 4 + rp.t * 30;
      ctx.globalAlpha = (1 - rp.t) * 0.65;
      ctx.strokeStyle = `hsla(${rp.hue},100%,64%,1)`;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = (1 - rp.t) * 0.3;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr * 1.7, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    });
  }

  /* 终端扫掠线 */
  function drawScan(){
    ctx.save();
    const y = (clock * 40) % (H + 120) - 60;
    const g = ctx.createLinearGradient(0, y-40, 0, y+40);
    g.addColorStop(0, 'rgba(0,229,255,0)');
    g.addColorStop(0.5, 'rgba(0,229,255,.045)');
    g.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y-40, W, 80);
    ctx.restore();
  }

  let clock = 0, lastT = performance.now(), running = true;
  function frame(now){
    if(!running) return;
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now; clock += dt;
    update(dt, clock);
    ctx.clearRect(0, 0, W, H);
    drawBgStars();
    drawSphereWire();
    drawRipples(clock);
    drawArcs();
    drawNodes(clock);
    drawScan();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    stop(){ running = false; },
    resize,
    spawnArc
  };
}

SV.globe = { startGlobe };
})();
