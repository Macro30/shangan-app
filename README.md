# 上岸 · 个人负债还款管理

一个**纯本地离线**的个人负债还款管理 App：不需要登录注册、不接任何后端接口、不做云同步，所有数据只保存在手机本地（AsyncStorage）。

- 应用名：**上岸**
- 包名：`com.shangan.debttracker`（Android）
- 技术栈：Expo SDK 54 + React Native 0.81 + expo-router 6 + TypeScript + Uniwind(Tailwind v4)

---

## 功能

### 一、债务管理
- 新增 / 编辑 / 删除多笔负债
- 字段：债务名称、债务类型（信用卡 / 网贷 / 消费分期 / 房贷 / 车贷 / 亲友借款 / 其他）、当前剩余本金、年化利率、每期最低还款额、账单日、还款日、起始日期、备注
- 列表支持按剩余本金 / 利率 / 还款日排序，支持按类型筛选

### 二、还款计划
- 根据全部债务自动生成按月还款计划表（每月应还总额、利息、本金）
- 两种还款策略一键切换：**雪球法**（优先结清余额最小的债务）、**雪崩法**（优先偿还利率最高的债务）
- 切换后重算：预计总利息、预计全部结清时间、每月需还总额
- 可设置每月还款总预算，App 据此分配每笔债务的还款额并给出建议顺序

### 三、还款记录
- 记录每次实际还款：日期、金额、对应债务、备注
- 保存后自动扣减对应债务的剩余本金，并刷新全部统计与进度
- 支持历史记录查看、补录、修改、删除

### 四、单笔债务详情
- 已还本金、已付利息、还款进度条、按当前利率估算的剩余利息
- 提前还款模拟器：输入额外还款金额，测算可节省的利息与可提前结清的月数

### 五、数据总览首页
- 关键指标卡片：总负债、本月应还、本月已还、累计已付利息
- 图表（react-native-svg 手绘，无重型图表库）：负债余额逐月下降曲线、各笔债务占比、本月还款构成
- 本月待还债务清单，按还款日排序

### 六、还款日提醒
- 基于 `expo-notifications` 的本地通知，支持**当天**与**提前 1 天**提醒，每笔债务可单独开关

### 七、设置
- 每月还款预算、逐笔提醒开关、JSON 备份导出 / 导入、关于

---

## 目录结构

```
.
├── app/                     # expo-router 路由
│   ├── _layout.tsx
│   ├── (tabs)/              # 首页 / 债务 / 计划 / 记录 / 设置
│   └── debt-detail.tsx
├── screens/                 # 各页面主体实现
├── components/              # Screen / ui / Charts / 表单弹窗等
├── contexts/                # DebtContext（数据核心）、AuthContext
├── utils/                   # money / storage / notifications / payoff
├── hooks/                   # useSafeRouter
├── heroui/                  # hero-ui 风格组件库（vendored）
├── assets/images/           # 图标 / 启动图 / favicon
├── global.css               # Tailwind v4 + 主题 token
├── app.config.ts
├── metro.config.js
└── tsconfig.json
```

路径别名：`@/*` → 仓库根目录。

---

## 本地运行

需要 Node 18+（建议 20/22）。

```bash
npm install

# 开发调试
npm run web        # 浏览器预览（部分 Web 特性与 Android 表现不同）
npm run android    # 需要已连接 Android 设备 / 模拟器，并已安装 Android Studio

# 类型检查
npm run typecheck
```

> 首次运行 Android 前需先 `npx expo prebuild -p android` 生成原生工程（`npm run prebuild`）。

---

## 打包 Android APK

### 方式 A：本地构建（无需 Expo 账号）

```bash
# 1. 生成原生工程
npx expo prebuild --platform android

# 2. 构建 debug APK
cd android
./gradlew assembleDebug

# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

### 方式 B：EAS 云构建（无需本地 Android 环境）

```bash
npm i -g eas-cli
eas login
eas build -p android --profile preview
```

`eas.json` 需要自行创建，最小示例：

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "android": { "buildType": "apk" },
      "distribution": "internal"
    }
  }
}
```

---

## 数据存储

- 全部数据通过 `@react-native-async-storage/async-storage` 存在本机，键名见 `utils/storage.ts`
- 卸载 App 会清空数据，建议定期用「设置 → 导出备份」保存 JSON
- 没有任何网络请求，不存在账号与云端数据

---

## 关于本仓库

本仓库内容来自 Coze Coding 项目 `上岸`（project id `7707135677841834024`）的完整源码还原：

- **完整还原**：`app/`、`screens/`、`components/`、`contexts/`、`utils/`、`hooks/`、`heroui/`、`types.ts`、`global.css` 共 358 个文件，均为原始内容
- **占位 / 补充**：`heroui/styles.css`（CSS 不进入 source map，此处为最小占位，见文件内注释）、`assets/images/*`（原图无法提取，按「上岸」品牌重绘的占位图标）、`README.md`、`.gitignore`
- **未包含**：原项目模板中的 `server/` 空壳、`patches/`、`.cozeproj/scripts` 等 Coze 平台构建辅助文件（本仓库已改为标准 Expo 工程结构，不依赖它们）

---

## License

个人使用项目，未指定开源协议。
