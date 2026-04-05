import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables, Enums } from "@/integrations/supabase/types";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths,
  addWeeks, subWeeks, addDays, subDays, format, isSameDay, isSameMonth,
  eachDayOfInterval, isToday, parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { eventoStatusLabels } from "@/lib/formatters";

type ViewMode = "month" | "week" | "day";
type Evento = Tables<"eventos">;
type EventoStatus = Enums<"evento_status">;

const statusColorMap: Record<EventoStatus, string> = {
  planejado: "bg-muted text-muted-foreground border-border",
  confirmado: "bg-info/15 text-info border-info/30",
  realizado: "bg-success/15 text-success border-success/30",
  cancelado: "bg-destructive/15 text-destructive border-destructive/30",
};

const statusBadgeVariant: Record<EventoStatus, string> = {
  planejado: "bg-muted text-muted-foreground",
  confirmado: "bg-info/15 text-info",
  realizado: "bg-success/15 text-success",
  cancelado: "bg-destructive/15 text-destructive",
};

function getDateRange(date: Date, view: ViewMode) {
  if (view === "month") {
    const ms = startOfMonth(date);
    const me = endOfMonth(date);
    return { start: startOfWeek(ms, { locale: ptBR }), end: endOfWeek(me, { locale: ptBR }) };
  }
  if (view === "week") {
    return { start: startOfWeek(date, { locale: ptBR }), end: endOfWeek(date, { locale: ptBR }) };
  }
  return { start: date, end: date };
}

function navigateDate(date: Date, view: ViewMode, dir: 1 | -1): Date {
  if (view === "month") return dir === 1 ? addMonths(date, 1) : subMonths(date, 1);
  if (view === "week") return dir === 1 ? addWeeks(date, 1) : subWeeks(date, 1);
  return dir === 1 ? addDays(date, 1) : subDays(date, 1);
}

function formatTitle(date: Date, view: ViewMode): string {
  if (view === "month") return format(date, "MMMM yyyy", { locale: ptBR });
  if (view === "week") {
    const s = startOfWeek(date, { locale: ptBR });
    const e = endOfWeek(date, { locale: ptBR });
    return `${format(s, "dd MMM", { locale: ptBR })} — ${format(e, "dd MMM yyyy", { locale: ptBR })}`;
  }
  return format(date, "EEEE, dd 'de' MMMM yyyy", { locale: ptBR });
}

function parseTime(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatTime(t: string | null): string {
  if (!t) return "";
  return t.substring(0, 5);
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function EventTooltipContent({ ev }: { ev: Evento }) {
  return (
    <div className="space-y-1 text-xs">
      <p className="font-semibold">{ev.nome_evento}</p>
      {(ev.horario_inicio || ev.horario_fim) && (
        <p>{formatTime(ev.horario_inicio)} {ev.horario_fim ? `→ ${formatTime(ev.horario_fim)}` : ""}</p>
      )}
      {ev.numero_convidados && <p>{ev.numero_convidados} convidados</p>}
      {ev.local && <p>{ev.local}</p>}
    </div>
  );
}

function EventChip({ ev, compact, onClick }: { ev: Evento; compact?: boolean; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className={cn(
            "w-full text-left rounded px-1.5 py-0.5 text-[11px] leading-tight truncate border transition-colors hover:opacity-80 cursor-pointer",
            statusColorMap[ev.status],
          )}
        >
          {!compact && ev.horario_inicio && (
            <span className="font-medium mr-1">{formatTime(ev.horario_inicio)}</span>
          )}
          <span className="truncate">{ev.nome_evento}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <EventTooltipContent ev={ev} />
      </TooltipContent>
    </Tooltip>
  );
}

/* ── MONTH VIEW ── */
function MonthView({ date, eventos, onEventClick }: { date: Date; eventos: Evento[]; onEventClick: (id: string) => void }) {
  const range = getDateRange(date, "month");
  const days = eachDayOfInterval({ start: range.start, end: range.end });
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Evento[]>();
    eventos.forEach((ev) => {
      if (!ev.data_evento) return;
      const key = ev.data_evento;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return map;
  }, [eventos]);

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="grid grid-cols-7">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-2 border-b bg-muted/30">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[minmax(90px,1fr)]">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) || [];
          const maxShow = 3;
          const extra = dayEvents.length - maxShow;

          return (
            <div
              key={key}
              className={cn(
                "border-b border-r p-1 min-h-[90px] transition-colors",
                !isSameMonth(day, date) && "bg-muted/20",
                isToday(day) && "bg-primary/5",
              )}
            >
              <div className={cn(
                "text-[11px] font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full",
                isToday(day) && "bg-primary text-primary-foreground",
                !isSameMonth(day, date) && "text-muted-foreground/50",
              )}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, maxShow).map((ev) => (
                  <EventChip key={ev.id} ev={ev} compact onClick={() => onEventClick(ev.id)} />
                ))}
                {extra > 0 && (
                  <p className="text-[10px] text-muted-foreground pl-1">+{extra} eventos</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── WEEK VIEW ── */
function WeekView({ date, eventos, onEventClick }: { date: Date; eventos: Evento[]; onEventClick: (id: string) => void }) {
  const range = getDateRange(date, "week");
  const days = eachDayOfInterval({ start: range.start, end: range.end });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Evento[]>();
    eventos.forEach((ev) => {
      if (!ev.data_evento) return;
      const key = ev.data_evento;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return map;
  }, [eventos]);

  const HOUR_HEIGHT = 48;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
        <div className="border-r" />
        {days.map((day) => (
          <div key={day.toISOString()} className={cn("text-center py-2 border-r", isToday(day) && "bg-primary/5")}>
            <div className="text-[10px] text-muted-foreground uppercase">{format(day, "EEE", { locale: ptBR })}</div>
            <div className={cn(
              "text-sm font-semibold w-7 h-7 mx-auto flex items-center justify-center rounded-full",
              isToday(day) && "bg-primary text-primary-foreground",
            )}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>
      {/* Grid */}
      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
          {/* Time labels */}
          <div className="border-r">
            {HOURS.map((h) => (
              <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[10px] text-muted-foreground text-right pr-2 pt-0.5 border-b">
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(key) || [];
            const timedEvents = dayEvents.filter((e) => e.horario_inicio);
            const allDayEvents = dayEvents.filter((e) => !e.horario_inicio);

            // Group overlapping events
            const positioned = timedEvents.map((ev) => {
              const startMin = parseTime(ev.horario_inicio) ?? 0;
              const endMin = parseTime(ev.horario_fim) ?? startMin + 60;
              return { ev, startMin, endMin };
            }).sort((a, b) => a.startMin - b.startMin);

            // Simple overlap columns
            const columns: { ev: Evento; startMin: number; endMin: number; col: number; totalCols: number }[] = [];
            const active: typeof positioned = [];
            positioned.forEach((item) => {
              // Remove non-overlapping
              const stillActive = active.filter((a) => a.endMin > item.startMin);
              active.length = 0;
              active.push(...stillActive, item);
              const col = stillActive.length;
              columns.push({ ...item, col, totalCols: 0 });
            });
            // Assign totalCols
            const groups: typeof columns[] = [];
            let currentGroup: typeof columns = [];
            columns.forEach((item) => {
              if (currentGroup.length === 0 || currentGroup.some((g) => g.endMin > item.startMin)) {
                currentGroup.push(item);
              } else {
                groups.push(currentGroup);
                currentGroup = [item];
              }
            });
            if (currentGroup.length > 0) groups.push(currentGroup);
            groups.forEach((group) => {
              const maxCol = Math.max(...group.map((g) => g.col)) + 1;
              group.forEach((g) => { g.totalCols = maxCol; });
            });

            return (
              <div key={key} className="border-r relative">
                {/* All-day events at top */}
                {allDayEvents.length > 0 && (
                  <div className="absolute top-0 left-0 right-0 z-10 p-0.5 space-y-0.5 bg-card/90 border-b">
                    {allDayEvents.slice(0, 2).map((ev) => (
                      <EventChip key={ev.id} ev={ev} compact onClick={() => onEventClick(ev.id)} />
                    ))}
                    {allDayEvents.length > 2 && <p className="text-[9px] text-muted-foreground pl-1">+{allDayEvents.length - 2}</p>}
                  </div>
                )}
                {/* Hour grid lines */}
                {HOURS.map((h) => (
                  <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b" />
                ))}
                {/* Events */}
                {columns.map(({ ev, startMin, endMin, col, totalCols }) => {
                  const top = (startMin / 60) * HOUR_HEIGHT;
                  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);
                  const width = `${100 / totalCols}%`;
                  const left = `${(col / totalCols) * 100}%`;
                  return (
                    <Tooltip key={ev.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onEventClick(ev.id)}
                          style={{ top, height, width, left, position: "absolute" }}
                          className={cn(
                            "rounded px-1 text-[10px] leading-tight overflow-hidden border cursor-pointer hover:opacity-80 text-left",
                            statusColorMap[ev.status],
                          )}
                        >
                          <div className="font-medium truncate">{formatTime(ev.horario_inicio)}</div>
                          <div className="truncate">{ev.nome_evento}</div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <EventTooltipContent ev={ev} />
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── DAY VIEW ── */
function DayView({ date, eventos, onEventClick }: { date: Date; eventos: Evento[]; onEventClick: (id: string) => void }) {
  const key = format(date, "yyyy-MM-dd");
  const dayEvents = eventos.filter((ev) => ev.data_evento === key);

  const allDay = dayEvents.filter((e) => !e.horario_inicio);
  const timed = dayEvents.filter((e) => e.horario_inicio).sort((a, b) => (a.horario_inicio || "").localeCompare(b.horario_inicio || ""));

  return (
    <div className="border rounded-lg bg-card divide-y">
      {dayEvents.length === 0 && (
        <div className="p-8 text-center text-muted-foreground text-sm">
          Nenhum evento neste dia.
        </div>
      )}
      {allDay.length > 0 && (
        <div className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Dia inteiro</p>
          <div className="space-y-2">
            {allDay.map((ev) => (
              <DayEventRow key={ev.id} ev={ev} onClick={() => onEventClick(ev.id)} />
            ))}
          </div>
        </div>
      )}
      {timed.length > 0 && (
        <div className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Agenda</p>
          <div className="space-y-2">
            {timed.map((ev) => (
              <DayEventRow key={ev.id} ev={ev} onClick={() => onEventClick(ev.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DayEventRow({ ev, onClick }: { ev: Evento; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border p-3 flex items-center gap-3 transition-colors hover:bg-muted/40 cursor-pointer",
      )}
    >
      <div className={cn("w-1 self-stretch rounded-full", {
        "bg-muted-foreground": ev.status === "planejado",
        "bg-info": ev.status === "confirmado",
        "bg-success": ev.status === "realizado",
        "bg-destructive": ev.status === "cancelado",
      })} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{ev.nome_evento}</span>
          <Badge className={cn("text-[10px] px-1.5 py-0 h-5 border", statusBadgeVariant[ev.status])}>
            {eventoStatusLabels[ev.status]}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
          {ev.horario_inicio && (
            <span>{formatTime(ev.horario_inicio)}{ev.horario_fim ? ` → ${formatTime(ev.horario_fim)}` : ""}</span>
          )}
          {ev.local && <span>{ev.local}</span>}
          {ev.numero_convidados && <span>{ev.numero_convidados} convidados</span>}
        </div>
      </div>
    </button>
  );
}

/* ── MAIN PAGE ── */
export default function Calendario() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");

  const range = getDateRange(currentDate, view);
  const startStr = format(range.start, "yyyy-MM-dd");
  const endStr = format(range.end, "yyyy-MM-dd");

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["calendario-eventos", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("id, nome_evento, data_evento, horario_inicio, horario_fim, status, local, numero_convidados, tipo_evento")
        .gte("data_evento", startStr)
        .lte("data_evento", endStr)
        .order("data_evento", { ascending: true });
      if (error) throw error;
      return data as Evento[];
    },
  });

  // Get unique tipo_evento for filter
  const tiposUnicos = useMemo(() => {
    const set = new Set<string>();
    eventos.forEach((e) => { if (e.tipo_evento) set.add(e.tipo_evento); });
    return Array.from(set).sort();
  }, [eventos]);

  const filteredEventos = useMemo(() => {
    return eventos.filter((ev) => {
      if (statusFilter !== "all" && ev.status !== statusFilter) return false;
      if (tipoFilter !== "all" && ev.tipo_evento !== tipoFilter) return false;
      return true;
    });
  }, [eventos, statusFilter, tipoFilter]);

  const handleEventClick = (id: string) => navigate(`/eventos/${id}`);

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Calendário</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filters */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <span>{statusFilter === "all" ? "Status" : eventoStatusLabels[statusFilter]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="planejado">Planejado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            {tiposUnicos.length > 0 && (
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <span>{tipoFilter === "all" ? "Tipo" : tipoFilter}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {tiposUnicos.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* View switcher */}
            <div className="flex rounded-md border overflow-hidden">
              {(["month", "week", "day"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium transition-colors",
                    view === v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  {{ month: "Mês", week: "Semana", day: "Dia" }[v]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate((d) => navigateDate(d, view, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate((d) => navigateDate(d, view, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize">{formatTitle(currentDate, view)}</span>
        </div>

        {/* Calendar */}
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
        ) : (
          <>
            {view === "month" && <MonthView date={currentDate} eventos={filteredEventos} onEventClick={handleEventClick} />}
            {view === "week" && <WeekView date={currentDate} eventos={filteredEventos} onEventClick={handleEventClick} />}
            {view === "day" && <DayView date={currentDate} eventos={filteredEventos} onEventClick={handleEventClick} />}
          </>
        )}
      </div>
    </AppLayout>
  );
}
