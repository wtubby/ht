# 015 — PR(446)/工作树改动文件：系统性处理

## 元信息

| 字段 | 值 |
|------|-----|
| **类型** | review / cleanup |
| **状态** | pending |
| **创建** | 2026-06-17 |
| **优先级** | P1 |
| **估时** | 2–3h |
| **依赖** | 无（可在 worktree 或当前分支上执行） |

## Goal

对 **PR 改动文件集合**（或当前 feature 工作树）做**一次性清单化**：区分「必须处理 / 可删 / 仅 lint / 延后」，并在同一 PR 或紧随 PR 内完成低风险的删文件、命名与导出清理，避免 40+ 文件里噪音长期滞留。

## 范围

**以实际 diff / PR files 为准**；未开 PR 时以 `git diff main...HEAD --name-only`（或 `origin/master...HEAD`）为清单。

典型命中区域（参考近期对话）：

| 区域 | 典型动作 |
|------|----------|
| `src/pages/**` | 详情的 `fetch*Query` 替换 `use*List`；bond/shared 命名 |
| `src/hooks/**` | barrel 导出收敛；`use*Related` |
| `src/services/wtu/**` | `get*SelectOptions` 命名 |
| `**/*.test.tsx` / `tests/**` | 保留用例、删重复 draft；补缺失 describe |
| 根目录 / 脚本 | `count.js`、临时 debug：删或移 `scripts/` |
| `.cursor/rules/**` | 仅当规则与实现一致时提交 |

## 步骤

### 1. 生成改动清单（15 min）

```bash
git fetch origin
git diff origin/master...HEAD --name-only > /tmp/changed-files.txt
# 或 gh pr view --json files
```

对每个文件打标签：**keep** | **delete** | **lint-only** | **fix-required** | **defer**

### 2. 必删 / 必改（优先，<1h）

- [ ] 未引用的 `*.test.tsx`、重复组件、临时 `count.js`（若只为本地统计）
- [ ] 仍 export 已废弃的 list hook（若 barrel 仍导出则 P0）
- [ ] `getSelectOptions` 别名未改尽的 import
- [ ] 明显 `console.log` / 注释掉的旧代码块

### 3. 一致性 pass（与 003/004 对齐）

- [ ] 详情子表：无 `usePayments`/`useInvoiceIns` 直用（应 `fetch*Query` 或 `use*Related`）
- [ ] 表单搜索：`getXxxSelectOptions` 直连 API
- [ ] ProTable 顶层：仍 `getXxx` in `request`，无 list hook

### 4. 文档与任务卡

- [ ] `tasks/README.md` 登记本卡状态
- [ ] `data-fetching.mdc` 与实现不一致处二选一：改代码或改文档

### 5. PR 卫生

- [ ] `pnpm lint` / `pnpm test`（或项目等价命令）全绿
- [ ] 单 commit 或按「refactor hooks / ui bond badge / chore tests」拆 2–3 个 commit
- [ ] PR description 列出 **删除的文件** 与 **breaking export**（若有）

## 验收

- [ ] 改动清单中所有 `fix-required` 项已关闭或转为新 task
- [ ] 无未使用文件留在 PR diff 中（除非 README 说明 intentionally）
- [ ] CI 通过

## 产出物

- 本任务卡 + README 索引行
- （可选）`docs/changelog-pr-446.md` 一两段摘要

## 不在范围

- 016 的 BondForm 抽组件
- 大范围 UI 改版（012）
- 新业务 API

## 备注

与 **003 数据层收束**、**004 select-options 重命名** 重叠时：本 task 只做 **清单 + 删噪 + PR 收口**，深层架构以 003 为准。
