# wtu 研发任务卡索引

> 更新：2026-06-17

## 如何使用

1. 每个任务对应 `tasks/NNN-*.md` 单卡，含目标、步骤、验收、依赖。
2. 状态：`pending` | `in_progress` | `blocked` | `done`。
3. 执行时在单卡内勾选 checkbox，完成后将本表对应行改为 `done`。

## 任务列表

| ID | 任务 | 类型 | 状态 | 优先级 | 估时 |
|----|------|------|------|--------|------|
| [015](./015-pr-changed-files-cleanup.md) | PR/工作树改动文件：清单、删噪、与数据层规范对齐后收口 | review | pending | P1 | 2–3h |

## 与既有技术债的关系

| 相关主题 | 说明 |
|----------|------|
| 数据层 003 | `fetch*Query` / 去掉 list hook export — 015 做 diff 内一致性核对 |
| 命名 004 | `getXxxSelectOptions` — 015 扫残留 import |
| UI 009/010 | 分包详情体验 — 不在 015 范围，除非 PR diff 里混进半成品 |

## 建议时机

- **PR 446 合并前**：跑 015 步骤 1–2，删掉测试草稿与临时脚本，减少 review 面。
- **合并后**：再跑步骤 3，与 master 对齐数据层约定。

## 相关路径

- `.cursor/rules/data-fetching.mdc`
- `src/pages/SubContract/SubContractDetail.tsx`
- `src/hooks/index.ts`
