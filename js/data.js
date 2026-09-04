/* ============ data.js — 数据层：默认源配置 · 演示情报库 · 分析引擎 ============ */
(function(){
'use strict';
const SV = (window.SV = window.SV || {});

/* ================= 默认情报源（后台预置，可编辑） =================
 * 状态标注：2026-09-04 由调研 Agent 逐源 HTTP 探活核验（详见 README 调研章节）
 * type: rss | wechat | twitter | url | api */
const DEFAULT_SOURCES = [
  // —— 国内 · RSS（实测 200）——
  { id:'cn_anquanke', name:'安全客', type:'rss', url:'https://api.anquanke.com/data/v1/rss', region:'cn', lang:'zh', desc:'奇安信系技术社区，高质量漏洞分析（RSS 实测可用）', enabled:true, builtIn:true },
  { id:'cn_xianzhi', name:'先知社区', type:'rss', url:'https://xz.aliyun.com/feed', region:'cn', lang:'zh', desc:'阿里云白帽技术社区，攻防原创（Atom 实测可用）', enabled:true, builtIn:true },
  { id:'cn_4hou', name:'嘶吼 RoarTalk', type:'rss', url:'https://www.4hou.com/feed', region:'cn', lang:'zh', desc:'安全行业综合门户，资讯+漏洞预警（实测可用）', enabled:true, builtIn:true },
  { id:'cn_paper', name:'知道创宇 404 实验室 Paper', type:'rss', url:'https://paper.seebug.org/rss', region:'cn', lang:'zh', desc:'APT/漏洞高质量研究（实测可用）', enabled:true, builtIn:true },
  { id:'cn_seebug', name:'Seebug 漏洞社区', type:'rss', url:'https://www.seebug.org/rss/new', region:'cn', lang:'zh', desc:'漏洞收录与预警（实测可用）', enabled:true, builtIn:true },
  { id:'cn_xuanwu', name:'腾讯玄武实验室', type:'rss', url:'https://xlab.tencent.com/cn/atom.xml', region:'cn', lang:'zh', desc:'顶级攻防实验室，另有每日安全推送 sec.today（实测可用）', enabled:true, builtIn:true },
  { id:'cn_tsrc', name:'腾讯 TSRC 博客', type:'rss', url:'https://security.tencent.com/index.php/feed/blog/0', region:'cn', lang:'zh', desc:'腾讯安全应急响应中心官方博客（实测可用）', enabled:true, builtIn:true },
  { id:'cn_netlab', name:'360 Netlab 网络研究院', type:'rss', url:'https://blog.netlab.360.com/rss', region:'cn', lang:'zh', desc:'僵尸网络/恶意家族追踪一线情报（实测可用）', enabled:true, builtIn:true },
  { id:'cn_secwiki', name:'SecWiki 安全维基', type:'rss', url:'https://www.sec-wiki.com/news/rss', region:'cn', lang:'zh', desc:'每日安全资讯聚合（实测可用）', enabled:true, builtIn:true },
  { id:'cn_freebuf', name:'FreeBuf', type:'rss', url:'https://www.freebuf.com/feed', region:'cn', lang:'zh', desc:'头部安全媒体；RSS 仍在但站点 WAF 对数据中心 IP 返 405，境内/浏览器 UA 采集为宜', enabled:true, builtIn:true },
  // —— 国内 · 网页监控（无公开 RSS）——
  { id:'cn_butian', name:'奇安信攻防社区', type:'url', url:'https://mdrforum.butian.net/', region:'cn', lang:'zh', desc:'实战攻防与 AI 工具讨论（实测可达）', enabled:true, builtIn:true },
  { id:'cn_venuseye', name:'微步在线 X 情报中心', type:'url', url:'https://x.threatbook.com/', region:'cn', lang:'zh', desc:'国内头部 TI 开放平台；结构化数据走商业云 API', enabled:true, builtIn:true },
  { id:'cn_qianxinti', name:'奇安信威胁情报中心', type:'url', url:'https://ti.qianxin.com/', region:'cn', lang:'zh', desc:'APT 披告与情报查询平台（实测可达）', enabled:true, builtIn:true },
  { id:'cn_nti', name:'绿盟 NTI 威胁情报中心', type:'url', url:'https://nti.nsfocus.com/', region:'cn', lang:'zh', desc:'威胁通告/周报入口（实测可达）', enabled:true, builtIn:true },
  { id:'cn_cnnvd', name:'国家信息安全漏洞库 CNNVD', type:'url', url:'https://www.cnnvd.org.cn/', region:'cn', lang:'zh', desc:'国家级漏洞库，官方权威（无公开 RSS）', enabled:true, builtIn:true },
  { id:'cn_cverc', name:'国家计算机病毒应急处理中心', type:'url', url:'https://www.cverc.org.cn/', region:'cn', lang:'zh', desc:'每周病毒预报与勒索预警（实测可达）', enabled:false, builtIn:true },
  // —— 国外 · RSS/Atom/API（实测 200）——
  { id:'gl_thn', name:'The Hacker News', type:'rss', url:'https://feeds.feedburner.com/TheHackersNews', region:'global', lang:'en', desc:'全球流量最大的安全媒体之一（实测可用）', enabled:true, builtIn:true },
  { id:'gl_bleeping', name:'BleepingComputer', type:'rss', url:'https://www.bleepingcomputer.com/feed/', region:'global', lang:'en', desc:'勒索/泄露一手报道；对数据中心 IP 有限流，住宅 UA 可用', enabled:true, builtIn:true },
  { id:'gl_krebs', name:'Krebs on Security', type:'rss', url:'https://krebsonsecurity.com/feed/', region:'global', lang:'en', desc:'Brian Krebs 深度调查（实测可用）', enabled:true, builtIn:true },
  { id:'gl_cisa', name:'CISA 安全通告', type:'rss', url:'https://www.cisa.gov/cybersecurity-advisories/all.xml', region:'global', lang:'en', desc:'美国 CISA 通告总流（实测可用）', enabled:true, builtIn:true },
  { id:'gl_kev', name:'CISA KEV 在野利用目录', type:'api', url:'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', region:'global', lang:'en', desc:'在野利用 CVE 权威 JSON 目录，日更（实测 2026.09.02 版）', enabled:true, builtIn:true },
  { id:'gl_unit42', name:'Unit 42 (Palo Alto)', type:'rss', url:'https://unit42.paloaltonetworks.com/feed/', region:'global', lang:'en', desc:'一线威胁研究与 APT 披告（实测可用）', enabled:true, builtIn:true },
  { id:'gl_talos', name:'Cisco Talos Intelligence', type:'rss', url:'https://blog.talosintelligence.com/rss/', region:'global', lang:'en', desc:'Talos 威胁研究与漏洞分析（实测可用）', enabled:true, builtIn:true },
  { id:'gl_exploitdb', name:'Exploit-DB', type:'rss', url:'https://www.exploit-db.com/rss.xml', region:'global', lang:'en', desc:'公开 PoC/Exploit 收录流（实测可用）', enabled:true, builtIn:true },
  { id:'gl_msrc', name:'微软 MSRC 更新指南', type:'rss', url:'https://api.msrc.microsoft.com/update-guide/rss', region:'global', lang:'en', desc:'微软官方漏洞通告 RSS（实测可用）', enabled:false, builtIn:true },
  { id:'gl_sans', name:'SANS ISC 风暴中心', type:'rss', url:'https://isc.sans.edu/rssfeed_full.xml', region:'global', lang:'en', desc:'互联网风暴中心每日威胁日志（实测可用）', enabled:true, builtIn:true },
  { id:'gl_ghsa', name:'GitHub 安全公告', type:'rss', url:'https://github.com/advisories.atom', region:'global', lang:'en', desc:'开源生态 CVE 实时披露（实测可用）', enabled:true, builtIn:true },
  { id:'gl_darkreading', name:'Dark Reading', type:'rss', url:'https://www.darkreading.com/rss.xml', region:'global', lang:'en', desc:'企业安全深度报道（实测可用）', enabled:true, builtIn:true },
  { id:'gl_securelist', name:'Securelist (卡巴斯基)', type:'rss', url:'https://securelist.com/feed/', region:'global', lang:'en', desc:'APT 组织追踪与恶意软件分析（实测可用）', enabled:true, builtIn:true },
  { id:'gl_nvd', name:'NIST NVD 漏洞库 API 2.0', type:'api', url:'https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20', region:'global', lang:'en', desc:'官方 CVE 数据；RSS 已退役必须用 API；无 key 限流 5 次/30秒', enabled:false, builtIn:true },
  // —— 微信公众号（无公开 RSS，经同步页 URL 或 wechat2rss 桥接接入）——
  { id:'wx_freebuf', name:'公众号 · FreeBuf', type:'wechat', url:'https://www.freebuf.com/news', region:'cn', lang:'zh', desc:'无公开 RSS；可经同步页 URL 或 wechat2rss.xlab.app 桥接接入', enabled:true, builtIn:true },
  { id:'wx_anquanke', name:'公众号 · 安全客', type:'wechat', url:'https://api.anquanke.com/data/v1/rss', region:'cn', lang:'zh', desc:'以安全客官方 RSS 作为同源数据', enabled:true, builtIn:true },
  { id:'wx_threatbook', name:'公众号 · 微步在线研究响应中心', type:'wechat', url:'https://x.threatbook.com/', region:'cn', lang:'zh', desc:'可经 wechat2rss 桥接（玄武实验室系项目）', enabled:false, builtIn:true },
  { id:'wx_qianxin', name:'公众号 · 奇安信威胁情报中心', type:'wechat', url:'https://ti.qianxin.com/', region:'cn', lang:'zh', desc:'可经 wechat2rss 桥接接入', enabled:false, builtIn:true },
  // —— Twitter / X（经 RSSHub / Nitter 路由接入；账号经 x.com 检索确认）——
  { id:'tw_abusech', name:'X · @abuse_ch', type:'twitter', url:'https://x.com/abuse_ch', region:'global', lang:'en', desc:'abuse.ch 团队：恶意软件家族/C2/僵尸网络追踪', enabled:true, builtIn:true },
  { id:'tw_unit42', name:'X · @Unit42_Intel', type:'twitter', url:'https://x.com/Unit42_Intel', region:'global', lang:'en', desc:'Unit 42 威胁情报官方账号', enabled:true, builtIn:true },
  { id:'tw_campuscodi', name:'X · @campuscodi', type:'twitter', url:'https://x.com/campuscodi', region:'global', lang:'en', desc:'威胁情报记者 Catalin Cimpanu，一线快讯', enabled:true, builtIn:true },
  { id:'tw_greynoise', name:'X · @GreyNoiseIO', type:'twitter', url:'https://x.com/GreyNoiseIO', region:'global', lang:'en', desc:'互联网扫描噪音与漏洞利用观测', enabled:true, builtIn:true },
  { id:'tw_cisagov', name:'X · @CISAGov', type:'twitter', url:'https://x.com/CISAGov', region:'global', lang:'en', desc:'CISA 官方账号，通告第一时间推送', enabled:true, builtIn:true }
];

/* ================= 地理节点（3D 地球） ================= */
const GEO_NODES = [
  { name:'北京', lat:39.9, lon:116.4, w:0.9 }, { name:'上海', lat:31.2, lon:121.5, w:0.8 },
  { name:'深圳', lat:22.5, lon:114.1, w:0.7 }, { name:'香港', lat:22.3, lon:114.2, w:0.6 },
  { name:'新加坡', lat:1.35, lon:103.8, w:0.8 }, { name:'东京', lat:35.7, lon:139.7, w:0.8 },
  { name:'首尔', lat:37.6, lon:127.0, w:0.6 }, { name:'莫斯科', lat:55.8, lon:37.6, w:0.7 },
  { name:'伦敦', lat:51.5, lon:-0.1, w:0.8 }, { name:'法兰克福', lat:50.1, lon:8.7, w:0.7 },
  { name:'阿姆斯特丹', lat:52.4, lon:4.9, w:0.6 }, { name:'弗吉尼亚', lat:38.9, lon:-77.4, w:0.9 },
  { name:'硅谷', lat:37.4, lon:-122.1, w:0.8 }, { name:'圣保罗', lat:-23.5, lon:-46.6, w:0.5 },
  { name:'悉尼', lat:-33.9, lon:151.2, w:0.5 }, { name:'约翰内斯堡', lat:-26.2, lon:28.0, w:0.5 },
  { name:'迪拜', lat:25.2, lon:55.3, w:0.6 }, { name:'特拉维夫', lat:32.1, lon:34.8, w:0.6 },
  { name:'班加罗尔', lat:12.97, lon:77.6, w:0.6 }, { name:'多伦多', lat:43.7, lon:-79.4, w:0.5 }
];

/* ================= 演示情报库 ================= */
/* 说明：静态部署模式下使用内置演示条目；接入真实后端后由采集器替换。 */
const DEMO_INTEL_RAW = [
  ['crit','vuln','新型 Linux 内核提权漏洞在野利用，官方补丁已发布','Global CERT','利用链包含本地提权与容器逃逸组合，多个云厂商紧急修复镜像。建议立即评估内核版本并升级。',['CVE-2026-31337','kernel 6.8.x'],'漏洞在野利用','The Hacker News',0.2],
  ['crit','ransom','勒索软件 Storm-2460 针对制造业供应链发起定向攻击','Securelist','攻击者通过钓鱼附件进入内网后横向移动，加密前窃取约 2TB 数据。已观测 37 家企业受害。',['storm-2460','185.220.101.4'],'勒索攻击','BleepingComputer',5.5],
  ['high','apt','APT-C-36 组织对拉美政府机构投递新型远控木马','威胁情报中心','攻击活动使用仿冒公文主题的鱼叉邮件，载荷经多层跳板下载，C2 基础设施每月轮换。',['APT-C-36','45.155.205.86'],'APT 活动','Securelist',22],
  ['high','vuln','某国际邮件网关 0day RCE 情报确认，PoC 已在地下论坛流通','X 情报社区','目标版本 9.x 以前均受影响，开发者已发布临时缓解方案，正式补丁预计下周。',['CVE-2026-28812','PoC available'],'漏洞情报','安全客',9],
  ['high','phish','大规模仿冒快递短信钓鱼活动波及亚太 11 国','威胁情报中心','钓鱼域名批量注册于同一家注册商，样本页面对移动 UA 做了定向适配。',['phish-drop[.]com','103.97.3.71'],'钓鱼欺诈','FreeBuf',30],
  ['med','malware','新型基于 PowerShell 的无文件挖矿木马在水坑网站传播','GreyNoise 观测','脚本高度混淆，每 48 小时轮换矿池钱包地址，日均感染主机约 4000 台。',['powershell agent','xmrig v7'],'恶意软件','The Hacker News',49],
  ['med','leak','某电商平台第三方 SDK 漏洞导致 120 万用户数据在暗网售卖','威胁情报中心','泄露字段包括脱敏手机号与收货地址，卖家宣称数据来自 2026 年 1 月备份。',['数据泄露','120万条'],'数据泄露','BleepingComputer',73],
  ['high','vuln','IoT 摄像头固件存在硬编码后门，影响 14 个品牌','Global CERT','后门账户通过 UDP 广播激活，安全厂商已发布受影响设备清单。',['CVE-2026-27741','hardcoded backdoor'],'漏洞情报','Krebs on Security',98],
  ['med','apt','APT28 近期针对欧洲智库的钓鱼基础设施曝光','威胁情报中心','注册于 3 月的仿冒域名共 23 个，托管于同一自治域，投递内容围绕能源政策。',['APT28','fancy-bear.eu[.]net'],'APT 活动','Securelist',120],
  ['low','news','NIST 发布 2026 年 2 月漏洞统计报告：高危占比 17.3%','NVD','本月新增 CVE 编号 2841 个，其中被利用评分 EPSS>0.5 的占 2.1%。',[],'行业动态','NVD',146],
  ['med','malware','伪装成破解软件的 macOS 信息窃取木马出现新变种','X 情报社区','签名被吊销后重新公证，窃取浏览器保存的加密货币钱包扩展数据。',['AtomicStealer','macOS'],'恶意软件','The Hacker News',168],
  ['high','ransom','Qilin 勒索家族公开泄露某大型医院集团 3.4TB 数据','暗网监测','谈判页面显示赎金要价 700 万美元，涉及病历与人事档案。',['Qilin','ransom note'],'勒索攻击','BleepingComputer',194],
  ['low','news','CISA 将 6 个正在被利用的漏洞加入 KEV 目录','Global CERT','含一款 VPN 网关旧版本漏洞，联邦机构须在两周内完成修复。',['KEV','CISA BOD 22-01'],'政策法规','CISA',215],
  ['med','phish','AI 生成的仿冒招聘网站集群被曝光，木马伪装成面试软件','FreeBuf','页面模板由 LLM 批量生成，受害者下载的"面试客户端"实为窃密木马。',['fake-job[.]net','infostealer'],'钓鱼欺诈','FreeBuf',240],
  ['crit','supply','开源包管理生态出现新型依赖混淆攻击，50+ 内部包受影响','安全客','攻击者注册与内部命名相同的公共包，投毒版本在 CI 环境执行反弹 shell。',['dependency confusion','supply chain'],'供应链投毒','GitHub Advisory',266],
  ['med','vuln','某国产 OA 系统文件上传漏洞细节遭泄露，官方暂未回应','先知社区','Payload 构造简单，检测规则已由社区更新至商业 WAF。',['OA','file upload'],'漏洞情报','奇安信攻防社区',290],
  ['high','apt','银狐木马家族迭代：新增杀软对抗与凌晨时段投递策略','威胁情报中心','利用微信仿冒群发链接，终载使用合法签名驱动加载内核模块。',['银狐','Valyria'],'恶意软件','微步在线',315],
  ['low','news','欧盟网络安全条例 NIS2 执行首月开出首批罚单','Global CERT','两家能源运营商因未按期上报事件被处罚，合计 480 万欧元。',['NIS2','GDPR 类比'],'政策法规','Dark Reading',340],
  ['med','leak','某车联网 API 越权漏洞可查询任意车主行程轨迹','X 情报社区','漏洞源于接口未校验设备绑定关系，厂商已紧急下线相关接口。',['IDOR','API abuse'],'数据泄露','FreeBuf',362],
  ['high','malware','GNOME/Linux 桌面出现针对开发者的 VSCode 扩展后门','威胁情报中心','三个恶意扩展累计安装量约 9 万，执行后窃取 SSH 密钥与环境变量。',['vscode backdoor','ssh keys'],'供应链投毒','GitHub Advisory',386],
  ['low','news','2026 年 Q1 全球 DDoS 报告：超大流量攻击同比上升 210%','威胁情报中心','单次峰值达 5.2Tbps，UDP 反射家族占比首次跌破 50%。',['DDoS','Q1 report'],'行业动态','SANS ISC',410],
  ['med','phish','仿冒国家政务服务 APP 的钓鱼站点出现 Android 15 兼容版本','威胁情报中心','诱导安装的 APK 申请无障碍服务权限后拦截短信验证码。',['smishing','APK'],'钓鱼欺诈','安全客',433],
  ['high','vuln','云存储桶配置错误导致多家上市公司内部代码库可匿名下载','威胁情报中心','研究员通过证书透明度日志关联出 612 个暴露桶，已通报厂商。',['S3 misconfig','public bucket'],'数据泄露','Krebs on Security',456],
  ['crit','ransom','勒索软件 LockBit 4.1 变种利用 VPN 0day 卷土重来','Global CERT','沉寂 8 个月后重构加密器，新的泄露站点已收录 11 家受害企业。',['LockBit 4.1','CVE-2026-29054'],'勒索攻击','BleepingComputer',480],
  ['med','apt','Kimsuky 组织伪装安全研究员投递恶意 CHM 文档','威胁情报中心','话题围绕最新 CVE 分析报告，文档内嵌远程模板注入。',['Kimsuky','CHM payload'],'APT 活动','Securelist',505],
  ['low','news','RSA 大会议题泄露：AI 辅助漏洞挖掘成为年度热点','FreeBuf','超过 30% 议题涉及 LLM 与安全运营结合，代码审计自动化讨论升温。',['RSA 2026','LLM security'],'行业动态','The Hacker News',530],
  ['med','malware','针对游戏外挂用户的窃密木马通过 YouTube 教程传播','X 情报社区','视频简介中的网盘链接捆绑 RedLine 变种，受害者以青少年为主。',['RedLine','stealer'],'恶意软件','FreeBuf',554],
  ['high','vuln','企业级防火墙身份绕过漏洞已出现在僵尸网络利用清单','GreyNoise 观测','过去 72 小时全网扫描源增长 7 倍，TOP 攻击来源为 3 个自治域。',['CVE-2026-27190','firewall bypass'],'漏洞在野利用','SANS ISC',578]
];
/* 地区词（演示版随机分布，不基于真实归因） */
const DEMO_REGIONS = ['弗吉尼亚','法兰克福','新加坡','东京','北京','莫斯科','伦敦','硅谷','圣保罗','悉尼','迪拜','首尔','阿姆斯特丹','约翰内斯堡','特拉维夫','班加罗尔','香港','深圳','上海','多伦多'];

/* ================= 分析引擎 ================= */
const SEV_META = {
  crit:{ label:'严重', letter:'S', color:'#ff2d78' },
  high:{ label:'高危', letter:'H', color:'#ff4d5e' },
  med: { label:'中危', letter:'M', color:'#ffb020' },
  low: { label:'关注', letter:'L', color:'#00e5ff' },
  info:{ label:'情报', letter:'I', color:'#6d84a8' }
};
const CATEGORIES = ['漏洞在野利用','漏洞情报','勒索攻击','APT 活动','恶意软件','钓鱼欺诈','数据泄露','供应链投毒','政策法规','行业动态'];

const IP_RE = /\b(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\b/g;
const HASH_RE = /\b[a-fA-F0-9]{32,64}\b/g;
const DOMAIN_RE = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|net|org|io|cn|ru|info|xyz|top|cc|me|app|dev)\b/gi;
const CVE_RE = /\bCVE-\d{4}-\d{4,7}\b/gi;

function extractIOCs(text, explicit){
  const seen = new Set(); const out = [];
  const push = (v, kind)=>{ if(v && !seen.has(v)){ seen.add(v); out.push({ v, kind }); } };
  (explicit || []).forEach(v => {
    if(/^CVE-/i.test(v)) push(v.toUpperCase(), 'cve');
    else if(IP_RE.test(v)){ IP_RE.lastIndex = 0; push(v, 'ip'); }
    else if(HASH_RE.test(v)){ HASH_RE.lastIndex = 0; push(v, 'hash'); }
    else push(v, 'tag');
  });
  const t = text || '';
  let m;
  IP_RE.lastIndex = 0;
  while((m = IP_RE.exec(t)) && out.filter(o=>o.kind==='ip').length < 3) push(m[0], 'ip');
  CVE_RE.lastIndex = 0;
  while((m = CVE_RE.exec(t)) && out.filter(o=>o.kind==='cve').length < 4) push(m[0].toUpperCase(), 'cve');
  HASH_RE.lastIndex = 0;
  while((m = HASH_RE.exec(t)) && out.filter(o=>o.kind==='hash').length < 2) push(m[0].toLowerCase(), 'hash');
  return out.slice(0, 7);
}
function classifyCategory(text){
  const t = text || '';
  if(/勒索|ransom/i.test(t)) return '勒索攻击';
  if(/APT|组织|定向攻击|威胁组织/i.test(t)) return 'APT 活动';
  if(/数据泄露|泄露|暗网|leak/i.test(t)) return '数据泄露';
  if(/钓鱼|欺诈|仿冒|phish/i.test(t)) return '钓鱼欺诈';
  if(/供应链|投毒|supply chain|依赖混淆/i.test(t)) return '供应链投毒';
  if(/木马|恶意软件|后门|stealer|挖矿|botnet|僵尸网络/i.test(t)) return '恶意软件';
  if(/0day|0-day|RCE|漏洞|CVE|提权|绕过/i.test(t)) return /在野利用|exploit in the wild/i.test(t) ? '漏洞在野利用' : '漏洞情报';
  if(/法规|条例|罚单|政策|CISA|NIS2|GDPR/i.test(t)) return '政策法规';
  return '行业动态';
}
function threatScore(entry){
  const base = { crit: 90, high: 70, med: 45, low: 22, info: 10 }[entry.severity] || 10;
  const heat = Math.max(0, 1 - entry.hoursAgo / 672); // 两周热度衰减
  return Math.round(base * 0.65 + heat * 35);
}

/* ================= 演示数据构建 ================= */
function buildDemoIntel(now){
  const items = DEMO_INTEL_RAW.map((r, i)=>{
    const [sev,, title, source, desc, iocs, cat, feed, hoursAgo] = r;
    return {
      id: 'demo-' + i,
      title, desc, source, feed,
      severity: sev,
      category: cat || classifyCategory(title + ' ' + desc),
      iocs: extractIOCs(title + ' ' + desc, iocs),
      region: DEMO_REGIONS[(i * 7 + 3) % DEMO_REGIONS.length],
      ts: now - Math.round(hoursAgo * 3600 * 1000),
      demo: true,
      url: '#'
    };
  });
  items.sort((a, b) => b.ts - a.ts);
  return items;
}

/* ================= 存储与设置 ================= */
const STORE_KEYS = { sources:'sv.sources.v1', settings:'sv.settings.v1', admin:'sv.admin.v1' };
const DEFAULT_SETTINGS = {
  siteName:'SentinelVision · 哨兵视界',
  refreshHint: 30,            // 建议抓取间隔（分钟），后台可配
  simulation: true,           // 前台模拟实时流入
  demoBanner: true
};
const DEFAULT_ADMIN = { user:'sentinel', passHash:null, passPlain:'SV-admin-2026' }; // passPlain 仅首装引导，登录后立即要求修改

function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    const v = JSON.parse(raw);
    return (v === null || v === undefined) ? fallback : v;
  }catch(e){ return fallback; }
}
function saveJSON(key, val){
  try{ localStorage.setItem(key, JSON.stringify(val)); return true; }catch(e){ return false; }
}
function getSources(){
  const saved = loadJSON(STORE_KEYS.sources, null);
  if(!Array.isArray(saved) || !saved.length) return DEFAULT_SOURCES.map(s => ({ ...s, health:'未知', items:0 }));
  // 合并内置新增（版本升级时把新内置源补进来）
  const ids = new Set(saved.map(s => s.id));
  DEFAULT_SOURCES.forEach(b => { if(!ids.has(b.id)) saved.push({ ...b, health:'未知', items:0 }); });
  return saved;
}
function saveSources(list){ return saveJSON(STORE_KEYS.sources, list); }
function getSettings(){ return { ...DEFAULT_SETTINGS, ...loadJSON(STORE_KEYS.settings, {}) }; }
function saveSettings(s){ return saveJSON(STORE_KEYS.settings, s); }
function simpleHash(str){
  let h = 5381;
  for(let i=0;i<str.length;i++){ h = ((h << 5) + h) ^ str.charCodeAt(i); h |= 0; }
  return 'h' + (h >>> 0).toString(16);
}
function verifyAdmin(user, pass){
  const cfg = loadJSON(STORE_KEYS.admin, { user: DEFAULT_ADMIN.user, hash: simpleHash(DEFAULT_ADMIN.passPlain) });
  return user === cfg.user && simpleHash(pass) === cfg.hash;
}
function setAdminPass(user, pass){
  return saveJSON(STORE_KEYS.admin, { user, hash: simpleHash(pass) });
}
function adminConfigured(){
  const cfg = loadJSON(STORE_KEYS.admin, null);
  return !!(cfg && cfg.hash);
}

/* 时间格式化 */
function timeAgo(ts, now){
  const s = Math.max(1, Math.floor((now - ts) / 1000));
  if(s < 60) return s + ' 秒前';
  const m = Math.floor(s / 60);
  if(m < 60) return m + ' 分钟前';
  const h = Math.floor(m / 60);
  if(h < 48) return h + ' 小时前';
  return Math.floor(h / 24) + ' 天前';
}
function fmtClock(d){
  const p = n => String(n).padStart(2, '0');
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}
function fmtDate(ts){
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
/* 稳定伪随机 */
function seeded(seed){
  let s = seed >>> 0;
  return function(){
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

SV.data = {
  DEFAULT_SOURCES, GEO_NODES, SEV_META, CATEGORIES, STORE_KEYS, DEFAULT_SETTINGS,
  buildDemoIntel, extractIOCs, classifyCategory, threatScore,
  getSources, saveSources, getSettings, saveSettings,
  verifyAdmin, setAdminPass, adminConfigured, simpleHash,
  timeAgo, fmtClock, fmtDate, esc, seeded
};
})();
