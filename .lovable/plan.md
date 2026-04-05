

## Plan: Fix Import Cardapio Dialog Layout

### Problem
The import modal's layout breaks after PDF processing, likely because:
1. `ScrollArea` uses `max-h-[320px]` as a className but Radix ScrollArea needs explicit height on the root to constrain its viewport properly
2. The dialog lacks `overflow-hidden` so content can spill out
3. On mobile, the dialog may overflow the viewport since there's no max-height constraint on the overall content

### Changes

**File: `src/components/ImportCardapioDialog.tsx`**

1. Add `overflow-hidden` to `DialogContent` to prevent content spill
2. Replace `ScrollArea className="max-h-[320px]"` with a wrapper `div` that has a fixed max-height and `overflow-hidden`, then let ScrollArea fill it with `h-full` — this ensures proper scroll behavior
3. Add responsive max-height using `max-h-[50vh] sm:max-h-[320px]` so it adapts to mobile viewports
4. Add `min-w-0` to item rows to prevent flex children (long item names, badges, action buttons) from forcing the row wider than the dialog
5. Ensure the preview section uses `flex flex-col` with the scroll area taking remaining space via `flex-1 min-h-0`

### Technical Detail
Radix `ScrollArea` requires its root to have a defined height (not just max-height via CSS class) to calculate the viewport correctly. Wrapping it in a constrained container and using `h-full` on ScrollArea fixes the scroll computation.

