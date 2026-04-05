

## Plan: Mobile Accessibility Improvements

### Issues Identified

After reviewing all pages, here are the main mobile usability problems:

1. **EventoDetail header cards (Custos/Recebido/Lucro)**: Three cards side by side overflow on small screens (line 78-91)
2. **EventoDetail Pagamentos header**: "Total", "Recebido" text + button crammed together on mobile (line 688-721)
3. **Dashboard filters**: Date pickers + select overflow on small screens (line 191-209)
4. **Financeiro filters**: Two date inputs side by side without wrapping (line 95-98)
5. **Tables throughout**: Some tables lack proper mobile-friendly patterns -- data is hidden with `hidden md:table-cell` but remaining columns still feel cramped
6. **EventoDetail GeralTab form**: `grid-cols-3` for Convidados/Valor/Status is too narrow on mobile (line 136)
7. **Sidebar navigation**: Touch targets (`py-2`) are small for mobile fingers (recommended 44px minimum)
8. **Login/Register pages**: Work well already with responsive design
9. **Dialog forms**: Some `grid-cols-2` forms are tight on very small screens

### Changes

**1. `src/components/AppLayout.tsx`**
- Increase sidebar nav link touch targets on mobile: `py-2` to `py-2.5`
- Add `overflow-y-auto` to nav to handle many items on short screens

**2. `src/pages/EventoDetail.tsx`**
- Header summary cards: change `flex gap-3` to `grid grid-cols-3 gap-2` with smaller text on mobile, wrapping to `grid-cols-1` on very small screens
- GeralTab: change `grid-cols-3` to `grid-cols-1 sm:grid-cols-3`
- Pagamentos header: wrap totals and button better with `flex-wrap`
- Parcelas summary: already uses `grid-cols-2 sm:grid-cols-4` (good)

**3. `src/pages/Dashboard.tsx`**
- Filters row: ensure `flex-wrap` and smaller gap on mobile
- Tab triggers: make them scrollable on mobile with `overflow-x-auto`

**4. `src/pages/Financeiro.tsx`**
- Date filters: wrap to stacked layout on small screens with `flex-wrap`
- Tabs: ensure scrollable on mobile

**5. `src/pages/Leads.tsx`**
- Status select trigger width: reduce from `w-[140px]` to fit better on mobile

**6. General table improvements across all pages**
- Ensure all table containers have `overflow-x-auto` (most already do)
- Add `min-w-[600px]` to tables that need horizontal scrolling so columns don't collapse

**7. `src/pages/Caixa.tsx`**
- Summary cards already responsive (`grid-cols-1 sm:grid-cols-3`)
- No major changes needed

### Summary of Files to Edit
- `src/components/AppLayout.tsx` -- nav touch targets
- `src/pages/EventoDetail.tsx` -- header cards, form grids, pagamentos layout
- `src/pages/Dashboard.tsx` -- filter wrapping, tab scrolling
- `src/pages/Financeiro.tsx` -- filter layout
- `src/pages/Leads.tsx` -- status select sizing

