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
- `XIAOMI_MODEL`: 可选，默认 `mimo-v2.5-pro`

前端会调用 Netlify Function：

- `/.netlify/functions/xiaomi-analyze`
- `/.netlify/functions/xiaomi-chat`

旧的 `deepseek-analyze` 和 `deepseek-chat` 函数入口仍保留兼容，但内部实际调用小米 MiMo API。

## OneNET

OneNET 保持浏览器直连，不经过 Netlify：

- 查询：`https://iot-api.heclouds.com/thingmodel/query-device-property`
- 下发：`https://iot-api.heclouds.com/thingmodel/set-device-desired-property`

设备参数目前写在 `pages/index/index.vue`：

- Product ID: `0TC2zqK8BU`
- Device Name: `ESP32S3`

## 本地调试

本地代理仍监听：

- `http://127.0.0.1:8787/analyze`
- `http://127.0.0.1:8787/chat`

本地不要把真实 API Key 提交到 GitHub。可以创建被忽略的文件：

`config/xiaomi.private.js`

内容参考 `config/xiaomi.private.example.js`。
