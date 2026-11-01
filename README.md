# DSH LaTeX Macros

小型纯插件：在设置中保存自定义 LaTeX 宏，使用插件自带的 KaTeX 重新显示助手回答中的公式。**不改 DSH 源码或安装文件，不改消息正文，不替换整个 Markdown 渲染器。**

## 状态与兼容性

- 目标版本：DSH **0.2.1-rc.5**（包声明精确限制；其他版本未验证）。
- 已核对该版本发布包中的 `configForms`、`settings.section`、客户端模块加载协议、回答 DOM 标记。
- 云端构建及 8 项针对性自动化测试通过，包含构建产物的模块加载、设置保存契约、宏渲染和卸载恢复。
- 2026-11-01，使用者已反馈本地安装后自定义宏渲染成功。该反馈不等于下方所有验证场景均已逐项完成。
- 云端未完成真实 DSH Web/Desktop 集成或视觉实测：Chromium 受运行环境限制无法启动，因此不宣称云端浏览器 PASS。

## 安装

交付的 `.tgz` 已含编译后的 `lib/`，无需在安装时运行构建脚本。

使用与你的 DSH 安装对应的 CLI（桌面版应使用桌面版自己的插件管理入口/CLI，不要用另装的 npm CLI 去接管桌面 profile）：

```sh
dsh plugin --profile <你的-profile> add /绝对路径/dsh-latex-macros-0.1.0.tgz
```

安装后重启相应 DSH 界面/刷新客户端，使客户端插件载入。进入 **设置 → LaTeX 宏**。如果该入口不出现，请先确认启用的是同一个 profile，且内置 settings / slots 服务存在。

宏设置是 JSON 对象，例如：

```json
{
  "\\RR": "\\mathbb{R}",
  "\\vect": "\\mathbf{#1}",
  "\\inner": "\\langle #1,#2\\rangle"
}
```

保存后，已显示回答中的公式会重新生成。设置通过 DSH 原生 `configForms` 持久化到当前 Host/profile 配置，不依赖浏览器 localStorage。保存携带读取到的 revision，冲突时保留草稿，不静默覆盖其他编辑。

## 最短本地验证

1. 保存上述宏。打开包含 `$x \in \RR$`、`$\vect{x}$` 的回答，确认普通宏和带参数宏正常显示。消息 TeX 使用单个反斜线，只有 JSON 设置中需要双反斜线。行间公式也应保持行间模式。
2. 把 `\\RR` 的展开式从 `\\mathbb{R}` 改成 `\\mathbb{Q}` 并保存，确认已有回答立即更新；关闭并重新打开设置/会话，确认配置保留。
3. 关闭“启用宏渲染”，确认恢复宿主原显示；重新开启确认恢复宏显示。再切换会话一次，确认没有重复公式。
4. 对一段含公式的回答进行选择、复制，确认与你平时的 DSH/复制插件搭配正常。这里未做真实应用集成验证，若出现复制行为问题请回报。

无需改 DSH 文件或额外给模型系统提示。模型不会因为这个插件自动知道你的宏名；需要时在提问中使用或告知宏的含义。

## 实现边界

- 这是**显示层后处理**，不是 hook 宿主私有 KaTeX 对象。读取宿主公式内的 TeX annotation，使用独立 KaTeX 0.18.7 渲染。
- 仅作用于助手回答区域。沿用宿主流式完成后渲染的节奏；不自行解析尚在流式传输的 Markdown。
- 原始 React 节点保留，仅隐藏其显示，并插入插件拥有的相邻节点。停用/卸载移除插件节点、恢复原节点。消息数据完全不动。
- 每次渲染克隆宏，避免 `\gdef` 污染设置或其他公式；`trust: false`，保留有限宏展开上限。
- 非法或未定义宏无法安全渲染时回退原显示。真正 `.katex-error` 且不带可靠源/行内行间信息的节点不接管，避免猜测损坏布局。
- 只支持命令名到字符串的映射（宏名为反斜线+英文字母），支持 `#1` 等参数。不支持安装任意 LaTeX 宏包、执行 JS 宏或完整 TeX 文档。
- 样式及字体限制在插件输出范围；字体随包内嵌，无远程 CDN。
- DOM 标记是兼容性依赖，DSH 升级后可能需要适配；没有声称官方提供稳定公式 hook。

## 卸载

先可在本页关闭开关恢复显示；完整移除：

```sh
dsh plugin --profile <你的-profile> remove dsh-latex-macros
```

按 DSH 正常插件生命周期重载/重启界面。插件不删除你的其他配置，也不自动删除保留的宏设置。

## 开发（只在隔离工作区）

```sh
npm ci --ignore-scripts
npm run build
npm test
```

`scripts/browser-smoke.mjs` 是可选的隔离浏览器 fixture，不是真实 DSH 测试；需要可启动的 Chromium，默认 `/usr/bin/chromium`。它使用真实 React/KaTeX 和编译产物，但设置服务/slot 为测试替身。

源码仓库不提交 `node_modules/`、生成的 `src/katex-style.js` 或 `lib/`。先运行上面的构建命令，再执行 `npm pack --ignore-scripts` 生成可安装的 `.tgz`。没有 prepare/install 执行脚本。

## 核对依据

- https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-settings
- https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-chat
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md
- 实际接口核对采用 npm 的 0.2.1-rc.5 发布包，非仅依赖滚动主线。

MIT；捆绑的 KaTeX 及字体许可证见 `THIRD_PARTY_LICENSES.txt`。
