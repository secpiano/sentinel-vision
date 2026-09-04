# SentinelVision · 哨兵视界

> 深空科技风 · 安全情报中心（前台态势大屏 + 后台源配置管理）
> 纯前端静态实现，零依赖、零构建、开箱即用；预留真实后端接入位。

![license](https://img.shields.io/badge/license-MIT-00e5ff) ![stack](https://img.shields.io/badge/stack-vanilla%20JS%20%2B%20Canvas-8b5cf6) ![deps](https://img.shields.io/badge/dependencies-zero-00ff9d)

## 这是什么

SentinelVision 是一个 **威胁情报聚合与态势展示平台** 的完整前端参考实现：

- **前台（态势大屏）**：3D 威胁地球（攻击弧线/冲击波纹/可拖拽）、KPI 指标墙、14 日情报趋势、威胁等级仪表、严重度分布、实时情报流、安全运营终端（打字机日志）
- **情报流页**：严重度/分类双维筛选 + 全文搜索、IOC 指标自动提取（IP/CVE/HASH）与点击复制、IOC 热榜与分类占比
- **威胁图谱页**：力导向关联图谱（情报源 → 事件组 → IOC/地区），可拖拽重组、悬停详情
- **后台（源管理）**：登录鉴权、采集源 CRUD、启用开关、演示快照、配置导入/导出、密码修改

## 设计参考（2026-09 实测核验）

搭建时调研并对齐了 GitHub 上评价最高的同类开源系统（星数为当日 API 实测）：

| 系统 | Stars | 状态 | 借鉴点 |
|---|---|---|---|
| [OpenCTI](https://github.com/OpenCTI-Platform/opencti) | ~9.9k | 活跃 | 大屏 Widgets 布局、Ingestion 源配置页范式 |
| [MISP](https://github.com/MISP/MISP) | ~6.5k | 活跃 | Feed 字段模型（URL/类型/开关/调度）→ 本站源 JSON Schema |
| [RSSHub](https://github.com/DIYgod/RSSHub) | ~46k | 极活跃 | "路由即源配置"思想，公众号/X 接入的推荐通道 |
| [Yeti](https://github.com/yeti-platform/yeti) | ~2.0k | 活跃 | IOC 实体化与关联展示 |
| [FreshRSS](https://github.com/FreshRSS/FreshRSS) | ~15.9k | 活跃 | 订阅管理交互 |

> 注：TheHive 已于 2025-07 归档（转商业版）；微步在线/奇安信无官方开源 TIP；详见 `.cluster` 调研报告。

## 默认内置情报源（39 条，全部经 HTTP 探活核验）

由独立调研 Agent 于 2026-09-04 逐源检索 + HTTP 探测核验（交叉比对 zhengjim/Chinese-Security-RSS、threatfilter.dev、腾讯玄武 wechat2rss OPML 三份权威清单）：

- **国内 RSS（10）**：安全客、先知社区、嘶吼、知道创宇 404 Paper、Seebug、腾讯玄武实验室、TSRC、360 Netlab、SecWiki、FreeBuf（WAF 对数据中心 IP 返 405，境内采集为宜）
- **国内 URL 监控（6）**：奇安信攻防社区、微步在线 X 情报、奇安信 TI、绿盟 NTI、CNNVD、CVERC
- **国际 RSS/API（14）**：The Hacker News、BleepingComputer、Krebs、CISA 通告、**CISA KEV 在野利用 JSON 目录**、Unit 42、Talos、Exploit-DB、MSRC、SANS ISC、GitHub 安全公告、Dark Reading、Securelist、NVD API 2.0（RSS 已退役）
- **微信公众号（4）**：FreeBuf / 安全客 / 微步在线 / 奇安信 TI —— 公众号无公开 RSS，说明页给出同步页 URL 与 wechat2rss 桥接方案
- **Twitter/X（5）**：@abuse_ch、@Unit42_Intel、@campuscodi、@GreyNoiseIO、@CISAGov（经 x.com 检索确认）

> 调研中排除的坑：Threatpost 已停运（2022-08 停更）、NVD RSS 已退役、"CVERC-ADL"实体不存在、urlhaus RSS 404 —— 均未预置。

## 快速开始

**方式 A：直接打开**（推荐体验）

双击 `index.html` 即可。静态部署模式下自动使用内置演示数据 + 模拟实时流入。

**方式 B：本地服务**

```bash
npx serve .          # 或 python -m http.server 8080
```

**后台入口**：顶部导航「情报源管理」，首次进入会要求初始化管理员账号（凭据仅存于本机浏览器）。

## 静态模式的能力边界（诚实说明）

纯静态托管（GitHub Pages / 对象存储）**无法运行真实采集器**，因此：

- 前台数据为内置演示快照 + 定时模拟流入（页面标注演示标识）
- 后台的「生成演示快照」用于模拟采集效果
- 源配置是**真实可维护**的：支持增删改、启停、导入导出（JSON）

**接入真实后端**：实现以下三个 REST 接口并替换 `js/app.js` 中的数据装载即可无缝升级：

```
GET  /api/overview     → { today, critHigh, iocCount, sourcesOnline, trend[14], dist, level }
GET  /api/items        → [{ id,title,desc,source,severity,category,iocs[],region,ts,url }]
GET  /api/sources      → [{ id,name,type,url,desc,enabled,health,items }]
POST /api/sources      → 增删改 + 触发抓取（服务端定时抓 RSSHub/RSS → 入库）
```

推荐后端栈：Node (fastify) + SQLite + [RSSHub](https://github.com/DIYgod/RSSHub)（公众号/X → RSS），采集器参考 MISP feed 模型。

## 技术

- 零依赖：3D 地球、全部图表（趋势/环形/仪表/力导向图谱）均为手写 Canvas
- 数据层纯函数（`js/data.js`），已通过 93 项自动化测试（45 项静态检查 + 38 项 Node 逻辑断言 + 10 项模块冒烟）
- 深空主题：HUD 边角、扫描线、辉光脉冲、启动自检动画；移动端响应式
- XSS 防护：所有动态文本经 `esc()` 转义后渲染

## 目录结构

```
├── index.html        # SPA 入口（hash 路由：dashboard/intel/graph/sources）
├── css/style.css     # 深空情报主题
├── js/data.js        # 默认源 + 演示情报库 + 分类/IOC/评分引擎
├── js/globe.js       # 3D 威胁地球（Canvas，零依赖）
├── js/charts.js      # 图表引擎 + 力导向图谱
├── js/admin.js       # 后台：登录/源 CRUD/导入导出
├── js/app.js         # 路由/大屏/情报流/实时模拟
└── LICENSE           # MIT
```

## License

MIT © 2026 secpiano
