# Host Cashback Client-Parity Design Spec

## Goal

Refactor the App Host **Chương trình hoàn tiền** tab so its user-facing workflow and layout match the current App Client **Chương trình cashback** tab 1:1, while preserving Host coordination/transaction behavior through an explicit compatibility adapter instead of forcing the rest of Host to consume the Client editor model directly.

## Source of truth

- UI/UX reference: App Client `services/cashback-program-config.js`, related `app.js` wiring, and cashback CSS in `styles.css` from `CardFlow(20260921-092527)`.
- Existing Host runtime behavior to preserve: Host cashback, transaction, progress, coordination and matrix services from `CardFlow_Host(20260921-092527)`.
- Excel reference: Client cashback workbook semantics plus the Host-wide Import/Export workflow already added/approved.

## User-facing structure

The Host tab must use the same primary hierarchy as Client:

`Thẻ -> Chương trình -> Gói hoàn tiền (optional) -> Điều kiện cashback`

### Main selectors and actions

- Card selector has no forced default selection when opening the tab.
- Card options are Card ID values sorted A-Z / locale-aware.
- Program selector stays empty/disabled until a card is selected.
- Program actions mirror Client: add, rename/edit, delete.
- Package selector is shown only for a program that has packages.
- Right-side **Cấu trúc chương trình** panel mirrors Client and navigates the same selected card/program/package/condition context.

### Program editor content

Match Client layout, labels, typography, compact spacing and control behavior:

- `THÔNG TIN CHUNG`
- 4 mutually exclusive cashback calculation modes:
  - independent
  - first_match
  - supporting
  - all_required
- `YÊU CẦU DOANH SỐ`
- total-spend requirement checkbox + compact money input
- derived read-only program max cashback based on limited conditions
- package controls when enabled
- condition cards with the same field order and semantics as Client
- MCC multi-select sourced from canonical Host MCC data but displaying group names, not raw MCC prefixes
- transaction method values aligned with Client semantics
- rate shown as percentage with one decimal place
- max cashback limited/unlimited
- spend-to-max derived and read-only
- per-condition total-spend/supporting spend where the Client model uses it
- note field
- add/remove/reorder controls where applicable
- bottom `Huỷ` / `Lưu thay đổi`

## Data model

Host gains a canonical editable cashback configuration model equivalent to Client program semantics:

- Program
  - `id`
  - `cardId`
  - `name`
  - `conditionMode`
  - `totalSpendMinimum`
  - `maxCashbackPerPeriod` (derived/read-only in UI)
  - `packageSwitchLimit`
  - `packages[]` when package mode is used
  - `conditions[]` when package mode is not used
  - optional history/metadata needed by existing Client-compatible package behavior
- Package
  - `id`
  - `name`
  - `groups[]`
- Group
  - compatibility container for condition grouping
  - typically 1 visible UI condition maps to 1 internal group when packages are used
- Condition
  - `id`
  - `name`
  - MCC selection
  - transaction method
  - `rate`
  - max-cashback settings
  - derived spend-to-max
  - note / supporting values required by Client semantics

The editor must not duplicate business rules already available in copied/adapted Client helpers.

## Host compatibility adapter

Existing Host runtime services must not be rewritten in the same change unless required by a failing compatibility test.

Create a dedicated adapter that converts canonical Host cashback programs into the flat/rule shape currently consumed by:

- transaction flows
- cashback progress calculations
- coordination logic
- matrix/assignment logic

Rules:

- Adapter output must be deterministic.
- Legacy Host cashback records must remain readable.
- New canonical records must produce equivalent Host runtime rule data.
- Runtime consumers should call the adapter instead of manually reading incompatible fields.
- No card-specific hard coding such as `MB Pla` in the generic engine.

## Legacy migration

On load, normalize existing Host cashback records into the new canonical editor shape without destructive data loss.

- Existing single-rule programs become one program with one visible condition.
- Existing multi-condition Host programs preserve all conditions and combination semantics where representable.
- Existing MCC, rate, cap, spend target, transaction method, notes and enabled/status values are preserved.
- Migration must be idempotent.
- Do not increment `schemaVersion` unless persisted structure actually changes and requires migration at repository level.

## Excel Import / Export

The Host-wide Excel workflow remains global, but the Cashback sheet must use the new canonical hierarchy.

Export one row per visible condition and include enough stable identifiers to reconstruct:

- Card ID
- Program ID / name
- condition mode
- program total-spend requirement
- package ID / name when present
- group/condition IDs
- condition name
- MCC selection
- transaction method
- rate
- limited/unlimited max cashback
- derived spend-to-max may be exported for readability but is not authoritative on import
- note

Import must support the three approved modes:

1. update existing
2. add missing
3. Excel master

Excel-master delete applies only to sheets present in the workbook and must require the existing destructive confirmation flow.

## UI parity rule

For the Host Cashback tab, Client is the visual and interaction source of truth. Avoid creating a “Host interpretation” of the same controls unless Host-specific data makes exact reuse impossible. In that case, preserve Client layout and label the Host-only difference in code/tests.

Typography must keep the compact Client sizing already approved by the user; do not enlarge cashback fonts.

## Out of scope

- Redesigning Host Điều phối đơn UI.
- Rewriting unrelated Host transaction calculations.
- Changing Google Drive sync behavior.
- Hard-coding bank/card-specific cashback logic into generic UI or adapter code.
- Refactoring unrelated master-data tabs.

## Acceptance criteria

1. Opening Cashback on Client and Host side-by-side shows the same primary layout, selectors, section structure and condition-card workflow.
2. Card -> Program -> optional Package -> Conditions navigation behaves equivalently.
3. All four calculation modes are available and persist correctly.
4. MCC control displays canonical group names and keeps multi-select behavior.
5. Derived cashback fields match Client formulas/semantics.
6. Existing Host legacy cashback data opens without losing meaningful values.
7. Host transaction/progress/coordination tests continue to pass against adapter output.
8. Cashback Excel export/import round-trips canonical program/package/condition data.
9. Import modes retain the previously approved global Host behavior.
10. No unrelated Host feature behavior changes.
