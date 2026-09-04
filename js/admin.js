/* ============ admin.js — 后台：登录 · 源配置 CRUD · 导入导出 ============ */
(function(){
'use strict';
const SV = (window.SV = window.SV || {});
const D = SV.data;

const TYPE_META = {
  rss:    { label:'RSS/Atom', cls:'rss' },
  wechat: { label:'微信公众号', cls:'wechat' },
  twitter:{ label:'Twitter / X', cls:'twitter' },
  url:    { label:'URL 监控', cls:'url' },
  api:    { label:'API 接口', cls:'api' }
};
const TYPE_HINTS = {
  rss: '填写 RSS/Atom 订阅地址（http/https）',
  wechat: '公众号无公开 RSS：填写其同步网页地址，或自建 RSSHub 路由 https://rsshub.app/wechat/mp/<公众号id>',
  twitter: 'X 无开放免费 API：可填写 X 主页地址，或 Nitter/RSSHub 路由 https://rsshub.app/twitter/user/<账号>',
  url: '填写任意网页地址，作为页面监控源（监测标题/内容变更）',
  api: '填写返回 JSON 的接口地址（高级）'
};

let currentEdit = null;   // 编辑中的源 id

/* ---------- 登录流程 ---------- */
function loginFlow(onOk){
  if(!D.adminConfigured()){
    modal('初始化管理员', `
      <div class="form-row"><label>设置登录名</label><input id="fAdminUser" value="sentinel" autocomplete="username"></div>
      <div class="form-row"><label>设置密码（≥6 位）</label><input id="fAdminPass" type="password" autocomplete="new-password"></div>
      <div class="form-row"><label>确认密码</label><input id="fAdminPass2" type="password" autocomplete="new-password"></div>
      <div style="font-size:11.5px;color:var(--txt-faint);line-height:1.6">密码仅保存在本机浏览器（localStorage），用于后台演示鉴权；接入真实后端后请服务端存储哈希。</div>
    `, ok => {
      const u = document.getElementById('fAdminUser').value.trim();
      const p1 = document.getElementById('fAdminPass').value;
      const p2 = document.getElementById('fAdminPass2').value;
      if(u.length < 2) return SV.app.toast('登录名太短'), false;
      if(p1.length < 6) return SV.app.toast('密码至少 6 位'), false;
      if(p1 !== p2) return SV.app.toast('两次密码不一致'), false;
      D.setAdminPass(u, p1);
      SV.app.toast('管理员初始化完成');
      onOk();
      return true;
    }, '创建');
    return;
  }
  modal('管理员登录', `
    <div class="form-row"><label>登录名</label><input id="fAdminUser" autocomplete="username"></div>
    <div class="form-row"><label>密码</label><input id="fAdminPass" type="password" autocomplete="current-password"></div>
  `, () => {
    const u = document.getElementById('fAdminUser').value.trim();
    const p = document.getElementById('fAdminPass').value;
    if(D.verifyAdmin(u, p)){ SV.app.toast('登录成功'); onOk(); return true; }
    SV.app.toast('登录名或密码错误');
    return false;
  }, '登录');
}

/* ---------- 通用弹窗 ---------- */
function modal(title, bodyHTML, onOk, okText){
  SV.app.showModal(`
    <div class="modal-head"><h3>▸ ${D.esc(title)}</h3><span class="modal-close" data-x>✕</span></div>
    <div class="modal-body">${bodyHTML}</div>
    <div class="modal-foot">
      <button class="btn small" data-x>取消</button>
      <button class="btn primary small" data-ok>${D.esc(okText || '确定')}</button>
    </div>
  `, root => {
    root.querySelector('[data-ok]').addEventListener('click', () => {
      if(!onOk || onOk() !== false) SV.app.closeModal();
    });
  });
}

/* ---------- 源管理页 ---------- */
function render(container){
  container.innerHTML = `
    <div class="screen">
      <div class="admin-layout">
        <div class="panel admin-toolbar">
          <span class="corner tl"></span><span class="corner tr"></span>
          <button class="btn primary" id="btnAddSrc">＋ 新增情报源</button>
          <button class="btn" id="btnSyncDemo">生成演示快照</button>
          <button class="btn" id="btnExport">导出配置</button>
          <button class="btn" id="btnImport">导入配置</button>
          <button class="btn" id="btnPasswd">修改密码</button>
          <span class="admin-note" id="adminWho">--</span>
        </div>
        <div class="panel" style="display:flex;flex-direction:column;min-height:0">
          <span class="corner tl"></span><span class="corner tr"></span>
          <div class="panel-title">采集源清单 · <span id="srcCount">0</span> 条</div>
          <div class="src-table-wrap" id="srcTableWrap"></div>
        </div>
        <div class="admin-side">
          <div class="panel">
            <span class="corner tl"></span><span class="corner tr"></span>
            <div class="panel-title">采集统计</div>
            <div class="panel-body side-stats" id="sideStats"></div>
          </div>
          <div class="panel">
            <span class="corner tl"></span><span class="corner tr"></span>
            <div class="panel-title">接入说明</div>
            <div class="panel-body" style="font-size:11.8px;color:var(--txt-dim);line-height:1.8">
              · <b style="color:var(--txt)">RSS/Atom</b>：主流站点的标准订阅方式，接入成本最低。<br>
              · <b style="color:var(--txt)">微信公众号</b>：无公开 RSS，可用同步页 URL 或自建 <span style="font-family:var(--mono)">RSSHub</span> 路由接入。<br>
              · <b style="color:var(--txt)">Twitter/X</b>：同上，可经 RSSHub / Nitter 路由转为 RSS。<br>
              · <b style="color:var(--txt)">URL 监控</b>：适合无订阅源的公告页（如 CNNVD）。<br>
              <span style="color:var(--txt-faint)">本静态部署版中"生成演示快照"用于模拟采集效果；接真实后端后这些按钮会触发真实抓取任务。</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  container.querySelector('#btnAddSrc').addEventListener('click', () => editSource(null, render));
  container.querySelector('#btnSyncDemo').addEventListener('click', () => {
    const list = D.getSources();
    const enabled = list.filter(s => s.enabled);
    enabled.forEach(s => {
      s.health = '在线';
      s.items = (s.items || 0) + 3 + Math.floor(Math.random() * 9);
      s.lastSync = Date.now();
    });
    D.saveSources(list);
    SV.app.toast('演示快照已生成：' + enabled.length + ' 个启用源');
    render(container);
    SV.app.refreshStats && SV.app.refreshStats();
  });
  container.querySelector('#btnExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(D.getSources(), null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sentinelvision-sources-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  container.querySelector('#btnImport').addEventListener('click', () => {
    modal('导入源配置', `
      <div class="form-row"><label>粘贴导出的 JSON</label><textarea id="fImport" rows="8" style="font-family:var(--mono);font-size:11px"></textarea></div>
    `, () => {
      try{
        const arr = JSON.parse(document.getElementById('fImport').value);
        if(!Array.isArray(arr)) throw new Error('not array');
        const TYPES = ['rss','wechat','twitter','url','api'];
        const clean = arr.filter(x => x && typeof x === 'object' && !Array.isArray(x)).map(x => ({
          id: String(x.id || 'usr_' + Date.now().toString(36)).replace(/[^\w-]/g, '').slice(0, 40),
          name: String(x.name || '').slice(0, 60),
          type: TYPES.includes(x.type) ? x.type : 'rss',
          url: /^https?:\/\//.test(String(x.url || '')) ? String(x.url) : '',
          desc: String(x.desc || '').slice(0, 120),
          region: x.region === 'cn' ? 'cn' : 'global',
          lang: x.lang === 'en' ? 'en' : 'zh',
          enabled: !!x.enabled,
          health: typeof x.health === 'string' ? x.health.slice(0, 10) : '未知',
          items: Number.isFinite(+x.items) ? Math.max(0, Math.min(999999, Math.floor(+x.items))) : 0,
          lastSync: Number.isFinite(+x.lastSync) ? +x.lastSync : undefined,
          builtIn: false
        })).filter(x => x.name.length >= 2 && x.url);
        if(!clean.length) throw new Error('empty');
        D.saveSources(clean);
        SV.app.toast('导入成功：' + arr.length + ' 条源');
        render(container);
        SV.app.refreshStats && SV.app.refreshStats();
        return true;
      }catch(e){ SV.app.toast('JSON 解析失败'); return false; }
    }, '导入');
  });
  container.querySelector('#btnPasswd').addEventListener('click', () => {
    modal('修改密码', `
      <div class="form-row"><label>当前密码</label><input id="fOldPass" type="password"></div>
      <div class="form-row"><label>新密码（≥6 位）</label><input id="fNewPass" type="password"></div>
    `, () => {
      const old1 = document.getElementById('fOldPass').value;
      const nw = document.getElementById('fNewPass').value;
      const cfg = localStorage.getItem(D.STORE_KEYS.admin);
      let user = 'sentinel';
      try{ user = JSON.parse(cfg).user; }catch(e){}
      if(!D.verifyAdmin(user, old1)){ SV.app.toast('当前密码错误'); return false; }
      if(nw.length < 6){ SV.app.toast('新密码至少 6 位'); return false; }
      D.setAdminPass(user, nw);
      SV.app.toast('密码已更新');
      return true;
    }, '更新');
  });

  renderTable(container);
  renderSide(container);
}

function renderTable(container){
  const wrap = container.querySelector('#srcTableWrap');
  const list = D.getSources();
  container.querySelector('#srcCount').textContent = String(list.length);
  container.querySelector('#adminWho').textContent = '已登录 · ' + D.fmtDate(Date.now());
  if(!list.length){
    wrap.innerHTML = '<div class="empty">暂无源，点击「新增情报源」开始</div>';
    return;
  }
  wrap.innerHTML = `
    <table class="src-table">
      <thead><tr>
        <th>状态</th><th>名称</th><th>类型</th><th>地址</th><th>健康</th><th>条目</th><th>最近同步</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${list.map(s => `
          <tr data-id="${D.esc(s.id)}">
            <td><label class="switch"><input type="checkbox" data-act="toggle" ${s.enabled ? 'checked' : ''}><i></i></label></td>
            <td><span class="src-name">${D.esc(s.name)}</span>${s.builtIn ? ' <span class="badge url" style="font-size:9px;padding:1px 6px">内置</span>' : ''}<div style="font-size:10.5px;color:var(--txt-faint);margin-top:2px">${D.esc((s.desc||'').slice(0,30))}</div></td>
            <td><span class="badge ${TYPE_META[s.type]?.cls || 'url'}">${D.esc(TYPE_META[s.type]?.label || s.type)}</span></td>
            <td><span class="src-url" title="${D.esc(s.url)}">${D.esc(s.url)}</span></td>
            <td><span class="badge ${s.health === '在线' ? 'wechat' : 'url'}" style="font-size:9.5px">${D.esc(s.health || '未知')}</span></td>
            <td style="font-family:var(--mono)">${D.esc(String(s.items == null ? 0 : s.items))}</td>
            <td style="font-family:var(--mono);font-size:10.5px;color:var(--txt-faint)">${s.lastSync ? D.timeAgo(s.lastSync, Date.now()) : '—'}</td>
            <td><div class="src-actions">
              <button class="btn small" data-act="edit">编辑</button>
              <button class="btn small danger" data-act="del">删除</button>
            </div></td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  wrap.querySelectorAll('[data-act]').forEach(el => {
    el.addEventListener('click', e => {
      const tr = e.target.closest('tr');
      const id = tr.getAttribute('data-id');
      const list = D.getSources();
      const src = list.find(s => s.id === id);
      if(!src) return;
      const act = el.getAttribute('data-act');
      if(act === 'toggle'){
        src.enabled = el.checked;
        D.saveSources(list);
        SV.app.toast(src.name + (src.enabled ? ' 已启用' : ' 已停用'));
        renderSide(container);
        SV.app.refreshStats && SV.app.refreshStats();
      } else if(act === 'edit'){
        editSource(src, () => render(container));
      } else if(act === 'del'){
        if(src.builtIn){ SV.app.toast('内置源不可删除，可停用'); return; }
        modal('删除确认', `<p style="font-size:13px;color:var(--txt)">确定删除 <b style="color:var(--magenta)">${D.esc(src.name)}</b> ？该操作不可撤销。</p>`, () => {
          D.saveSources(list.filter(s => s.id !== id));
          SV.app.toast('已删除');
          render(container);
          SV.app.refreshStats && SV.app.refreshStats();
          return true;
        }, '删除');
      }
    });
  });
}

function renderSide(container){
  const list = D.getSources();
  const enabled = list.filter(s => s.enabled).length;
  const items = list.reduce((a, s) => a + (s.items || 0), 0);
  const byType = {};
  list.forEach(s => { byType[s.type] = (byType[s.type] || 0) + 1; });
  const box = container.querySelector('#sideStats');
  if(box) box.innerHTML = `
    <div class="side-stat"><b>${enabled}<small style="font-size:11px;color:var(--txt-faint)"> / ${list.length}</small></b><span>启用源</span></div>
    <div class="side-stat"><b>${items}</b><span>累计条目</span></div>
    <div class="side-stat"><b>${byType.rss || 0}</b><span>RSS 源</span></div>
    <div class="side-stat"><b>${(byType.wechat || 0) + (byType.twitter || 0)}</b><span>社交源</span></div>`;
}

function editSource(src, done){
  currentEdit = src ? src.id : null;
  const type = src ? src.type : 'rss';
  modal(src ? '编辑情报源' : '新增情报源', `
    <div class="form-row"><label>源名称</label><input id="fSrcName" value="${D.esc(src?.name || '')}" placeholder="如：FreeBuf 安全脉搏"></div>
    <div class="form-row"><label>源类型</label>
      <select id="fSrcType">
        ${Object.keys(TYPE_META).map(k => `<option value="${k}" ${k === type ? 'selected' : ''}>${TYPE_META[k].label}</option>`).join('')}
      </select>
    </div>
    <div class="form-row"><label>地址 / 参数</label><input id="fSrcUrl" value="${D.esc(src?.url || '')}" placeholder="https://..." style="font-family:var(--mono);font-size:11.5px"></div>
    <div class="form-row"><label>简介（可选）</label><input id="fSrcDesc" value="${D.esc(src?.desc || '')}"></div>
    <div class="form-row"><label>启用</label><label class="switch"><input id="fSrcEnabled" type="checkbox" ${!src || src.enabled ? 'checked' : ''}><i></i></label></div>
    <div id="fHint" style="font-size:11px;color:var(--txt-faint);line-height:1.7;font-family:var(--mono)">${D.esc(TYPE_HINTS[type])}</div>
  `, () => {
    const name = document.getElementById('fSrcName').value.trim();
    const url = document.getElementById('fSrcUrl').value.trim();
    if(name.length < 2){ SV.app.toast('请填写源名称'); return false; }
    if(!/^https?:\/\/.+/i.test(url)){ SV.app.toast('地址需以 http(s):// 开头'); return false; }
    const list = D.getSources();
    const t = document.getElementById('fSrcType').value;
    if(src){
      src.name = name; src.type = t; src.url = url;
      src.desc = document.getElementById('fSrcDesc').value.trim();
      src.enabled = document.getElementById('fSrcEnabled').checked;
      D.saveSources(list);
      SV.app.toast('已保存修改');
    } else {
      list.push({
        id: 'usr_' + Date.now().toString(36),
        name, type: t, url,
        desc: document.getElementById('fSrcDesc').value.trim(),
        region: url.includes('.cn') ? 'cn' : 'global',
        lang: /[\u4e00-\u9fa5]/.test(name) ? 'zh' : 'en',
        enabled: document.getElementById('fSrcEnabled').checked,
        health: '未知', items: 0, builtIn: false
      });
      D.saveSources(list);
      SV.app.toast('源已添加');
    }
    done && done();
    SV.app.refreshStats && SV.app.refreshStats();
    return true;
  }, src ? '保存' : '添加');
  const sel = document.getElementById('fSrcType');
  sel.addEventListener('change', () => {
    document.getElementById('fHint').textContent = TYPE_HINTS[sel.value];
  });
}

SV.admin = { render, loginFlow, modal, TYPE_META };
})();
