# Netlify 部署说明

## GitHub

代码仓库：`https://github.com/LML-920/qgwlw`

## Netlify 构建配置

- Publish directory: `unpackage/dist/build/web`
- Functions directory: `netlify/functions`
- Build command: 留空即可

项目里的 `netlify.toml` 已经配置好了这些目录。

## 小米 MiMo API

在 Netlify 后台进入：

`Site configuration` -> `Environment variables`

添加：

- `MIMO_API_KEY`: 填你的小米 MiMo API Key
- `XIAOMI_MODEL`: 可选，默认 `mimo-v2.6-flash`

继续使用现有 API Key，无需重新创建。已有 `XIAOMI_MODEL` / `MIMO_MODEL` 配置为 V2 / V2.5 文本模型时，代码会自动迁移到 `mimo-v2.6-flash`；后台可同步将该变量改成新模型名。V2.5 系列将于北京时间 2026-10-21 10:00 下线。

云端函数与本地代理共用同一套调用逻辑：关闭深度思考，最多输出 1024 tokens；分析超时 20 秒，对话超时 25 秒，包含读取响应正文的时间。密钥、余额、限流、超时、输出截断及 JSON 格式异常会分别提示。分析失败仍使用本地阈值兜底，明确显示错误原因及暂无云端趋势结论。

修改代码或 Netlify 环境变量后需要重新部署。可用 `node --test tests/xiaomi-common.test.js` 检查调用与异常处理。

前端会调用 Netlify Function：

- `/.netlify/functions/xiaomi-analyze`
- `/.netlify/functions/xiaomi-chat`

旧的 `deepseek-analyze` 和 `deepseek-chat` 函数入口仍保留兼容，但内部实际调用小米 MiMo API。

## OneNET

OneNET 保持浏览器直连，不经过 Netlify：

- 查询：`https://iot-api.heclouds.com/thingmodel/query-device-property`
- 下发：`https://iot-api.heclouds.com/thingmodel/set-device-desired-property`

设备参数目前保留在 `lib/telemetry.js`：

- Product ID: `0TC2zqK8BU`
- Device Name: `ESP32S3`

## 本地调试

本地代理仍监听：

- `http://127.0.0.1:8787/analyze`
- `http://127.0.0.1:8787/chat`

本地不要把真实 API Key 提交到 GitHub。可以创建被忽略的文件：

`config/xiaomi.private.js`

内容参考 `config/xiaomi.private.example.js`。

## 矿安智联 V2.0 网页

原网站地址：https://qgwlw.netlify.app/ 。继续发布 main 分支中的 `unpackage/dist/build/web`，不新建站点。

- 首页：井下四矿洞示意图、按 NFC 记录显示人员位置、井口指挥所（P4 基站端与数据网页端入口）、重点人员、心率与环境趋势、报警记录。
- 工作页：人员监测、报警中心、AI 研判、员工管理、设备中心。
- 当前协议只有一套物理采集端（ESP32S3），绑定 EMP-001。其他员工只有独立档案，不复制设备 01 的读数。
- 默认四份姓名与 AI 人像为演示档案，头像与 P4 默认资源一致；可新增档案、更改姓名、岗位、班组和上传照片。档案、照片、历史与报警保存在当前浏览器，P4 自动同步和跨浏览器同步未接入。
- NFC 0 表示矿洞外，1–4 对应四个矿洞；不表示精确坐标。矿洞图为 AI 生成概念示意，非真实矿区地图。
- OneNET 可访问与物理设备在线分别显示；若属性时间距今超过 30 秒，标注数据已过期，不将旧读数持续追加为新的采样或报警。

### 本机编译与验证

本机使用已安装的 HBuilderX uni-app 编译器，避免改变原有工程结构：

```powershell
npm run build
npm test
npm run preview
```

默认 HBuilderX 路径是 `E:/html/HBuilderX`，其他电脑可设置 `HBUILDERX_HOME` 指向安装目录（需安装 uniapp-cli-vite 插件）。已安装项目内 uni-app CLI 时优先使用项目依赖。预览默认监听 `http://127.0.0.1:4173`。构建成功后提交源码与生成的 web 目录，再推送 GitHub；Netlify 继续用已编译产物部署。

### 视觉资料

结构参考用户提供的工业监控大屏，以及 [ThingsBoard 官方 GitHub 的工业 SCADA 与遥测仪表盘资料](https://github.com/thingsboard/thingsboard)。本页组件和图表自行实现，未复制该项目代码。

`static/mine-map.png` 由内置 imagegen 工具生成，提示词记录于 [矿洞素材说明](static/mine-map-prompt.md)。
