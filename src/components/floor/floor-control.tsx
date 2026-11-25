"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { floorRequest } from "@/components/floor/floor-api";
import { MoneyField } from "@/components/floor/money-field";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { todayKeyInAppTz, formatDateKey } from "@/lib/datetime";
import {
  FAIR_TASK_PRIORITY_LABELS,
  FAIR_TASK_STATUS_LABELS,
  formatBrlFromCents,
  formatReaisInput,
  parseReais,
} from "@/lib/floor-labels";
import { cn } from "@/lib/utils";
import type { FairEventStatus, FairTaskPriority, FairTaskStatus } from "@/generated/prisma/enums";
import type { FloorExpenseDto, FloorPerson, FloorProjectionDto, FloorTaskDto, FloorVisitDto } from "@/types/floor";

const STATUSES = Object.keys(FAIR_TASK_STATUS_LABELS) as FairTaskStatus[];
const PRIORITIES = Object.keys(FAIR_TASK_PRIORITY_LABELS) as FairTaskPriority[];
const OPEN_TASK = new Set<FairTaskStatus>(["PENDING", "IN_PROGRESS", "WAITING", "BLOCKED"]);

type Section = "tasks" | "money" | "projection";
type TaskView = "list" | "board" | "calendar" | "timeline";

export function FloorControl({
  eventId,
  status,
  canEdit,
  staff,
  tasks,
  expenses,
  projection,
  visits,
}: {
  eventId: string;
  status: FairEventStatus;
  canEdit: boolean;
  staff: FloorPerson[];
  tasks: FloorTaskDto[];
  expenses: FloorExpenseDto[];
  projection: FloorProjectionDto;
  visits: FloorVisitDto[];
}) {
  const [section, setSection] = useState<Section>("tasks");
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(todayKeyInAppTz());
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Controle</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {status === "CLOSED" ? "O que foi a operação" : "Plano deste feirão"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {status === "CLOSED"
            ? "A pista e o que foi planejado ficam juntos. O que estiver vazio é lacuna, não um zero inventado."
            : "Tarefas, gastos e projeções nascem vazios. Preencha só o que já souber."}
        </p>
      </div>

      <Macro status={status} today={today} tasks={tasks} expenses={expenses} projection={projection} visits={visits} />

      <div className="flex flex-wrap gap-2">
        <SectionButton active={section === "tasks"} onClick={() => setSection("tasks")}>
          Tarefas
        </SectionButton>
        <SectionButton active={section === "money"} onClick={() => setSection("money")}>
          Gastos
        </SectionButton>
        <SectionButton active={section === "projection"} onClick={() => setSection("projection")}>
          Projeções
        </SectionButton>
      </div>

      {section === "tasks" ? <Tasks eventId={eventId} canEdit={canEdit} staff={staff} tasks={tasks} today={today} /> : null}
      {section === "money" ? <Expenses eventId={eventId} canEdit={canEdit} expenses={expenses} /> : null}
      {section === "projection" ? (
        <ProjectionForm eventId={eventId} canEdit={canEdit} projection={projection} />
      ) : null}
    </div>
  );
}

function Macro({
  status,
  today,
  tasks,
  expenses,
  projection,
  visits,
}: {
  status: FairEventStatus;
  today: string;
  tasks: FloorTaskDto[];
  expenses: FloorExpenseDto[];
  projection: FloorProjectionDto;
  visits: FloorVisitDto[];
}) {
  const closed = visits.filter((visit) => visit.stage === "AWAITING_DELIVERY" || visit.stage === "DELIVERED");
  const lost = visits.filter((visit) => visit.stage === "LOST");
  const openTasks = tasks.filter((task) => OPEN_TASK.has(task.status));
  const done = tasks.filter((task) => task.status === "DONE").length;
  const overdue = today ? openTasks.filter((task) => task.dueOn != null && task.dueOn < today) : [];
  const unassigned = openTasks.filter((task) => task.ownerNames.length === 0);
  const actual = expenses.reduce((sum, expense) => sum + (expense.actualCents ?? 0), 0);
  const planned = expenses.reduce((sum, expense) => sum + (expense.plannedCents ?? 0), 0);
  const notes = improvements({ status, tasks, visits, closed: closed.length, lost, overdue, unassigned, actual, projection });

  return (
    <section className={cn("overflow-hidden rounded-2xl text-white shadow-sm", status === "CLOSED" ? "bg-brand-navy" : "bg-brand-navy")}>
      <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
        <MoneyScore label="Tarefas feitas" value={tasks.length ? `${done}/${tasks.length}` : "—"} hint={overdue.length ? `${overdue.length} atrasadas` : tasks.length ? "Nenhuma atrasada" : "Nenhuma tarefa"} />
        <MoneyScore label="Orçamento" value={formatBrlFromCents(projection.budgetCents)} hint={planned ? `${formatBrlFromCents(planned)} previsto nas linhas` : "Sem linhas de gasto"} />
        <MoneyScore
          label="Gasto realizado"
          value={expenses.some((item) => item.actualCents != null) ? formatBrlFromCents(actual) : "—"}
          hint={expenses.some((item) => item.actualCents != null) ? budgetHint(actual, projection.budgetCents) : "Nenhum realizado lançado"}
        />
        <MoneyScore label="Captação" value={formatBrlFromCents(projection.capturedCents)} hint={goalMoney(projection.capturedCents, projection.captureGoalCents)} />
      </div>
      {notes.length > 0 ? (
        <ul className="space-y-1 px-5 py-4 text-sm text-white/80">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-4 text-sm text-white/70">Nada pendente neste recorte.</p>
      )}
    </section>
  );
}

function Tasks({
  eventId,
  canEdit,
  staff,
  tasks,
  today,
}: {
  eventId: string;
  canEdit: boolean;
  staff: FloorPerson[];
  tasks: FloorTaskDto[];
  today: string;
}) {
  const [view, setView] = useState<TaskView>("list");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<FloorTaskDto | null | "new">(null);
  const normalized = query.trim().toLowerCase();
  const ownerNames = [...new Set(tasks.flatMap((task) => task.ownerNames))];
  const visible = tasks.filter((task) => {
    if (!normalized) return true;
    return [task.title, task.area, ...task.ownerNames, task.description].filter(Boolean).join(" ").toLowerCase().includes(normalized);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <SectionButton active={view === "list"} onClick={() => setView("list")}>Lista</SectionButton>
          <SectionButton active={view === "board"} onClick={() => setView("board")}>Kanban</SectionButton>
          <SectionButton active={view === "calendar"} onClick={() => setView("calendar")}>Calendário</SectionButton>
          <SectionButton active={view === "timeline"} onClick={() => setView("timeline")}>Linha do tempo</SectionButton>
        </div>
        {canEdit ? (
          <Button type="button" onClick={() => setEditing("new")}>Nova tarefa</Button>
        ) : null}
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tarefa, frente ou responsável" className="h-11 max-w-md bg-white" />
      {editing ? (
        <TaskForm
          eventId={eventId}
          staff={staff}
          ownerNames={ownerNames}
          task={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {visible.length === 0 ? (
        <Empty title={tasks.length === 0 ? "Nenhuma tarefa" : "Nenhuma tarefa nessa busca"} detail="O título basta. Prazo, responsável e frente entram quando existirem." />
      ) : view === "list" ? (
        <div className="space-y-2">
          {visible.map((task) => (
            <TaskRow key={task.id} eventId={eventId} task={task} today={today} canEdit={canEdit} staff={staff} ownerNames={ownerNames} onEdit={() => setEditing(task)} />
          ))}
        </div>
      ) : view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STATUSES.map((status) => (
            <div key={status} className="w-64 shrink-0 space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {FAIR_TASK_STATUS_LABELS[status]} · {visible.filter((task) => task.status === status).length}
              </p>
              {visible.filter((task) => task.status === status).map((task) => (
                <TaskRow key={task.id} eventId={eventId} task={task} today={today} canEdit={canEdit} staff={staff} ownerNames={ownerNames} onEdit={() => setEditing(task)} />
              ))}
            </div>
          ))}
        </div>
      ) : view === "calendar" ? (
        <TaskCalendar tasks={visible} />
      ) : (
        <TaskTimeline tasks={visible} />
      )}
    </div>
  );
}

function TaskRow({
  eventId,
  task,
  today,
  canEdit,
  staff,
  ownerNames,
  onEdit,
}: {
  eventId: string;
  task: FloorTaskDto;
  today: string;
  canEdit: boolean;
  staff: FloorPerson[];
  ownerNames: string[];
  onEdit: () => void;
}) {
  const router = useRouter();
  const late = Boolean(today && task.dueOn && task.dueOn < today && OPEN_TASK.has(task.status));
  async function assign(names: string[]) {
    try {
      await floorRequest(`/api/floor/events/${eventId}/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ownerNames: names, updatedAt: task.updatedAt }),
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atribuir.");
    }
  }

  async function changeStatus(status: FairTaskStatus) {
    try {
      await floorRequest(`/api/floor/events/${eventId}/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, updatedAt: task.updatedAt }),
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  return (
    <article className={cn("rounded-2xl border bg-white p-3 shadow-sm", late ? "border-rose-300" : "border-border")}>
      <button type="button" onClick={onEdit} className="w-full text-left" disabled={!canEdit}>
        <p className="font-medium">{task.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {[task.area, canEdit ? null : task.ownerNames.join(", ") || "Sem responsável", task.dueOn ? formatDateKey(task.dueOn) : "Sem prazo", FAIR_TASK_PRIORITY_LABELS[task.priority]]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </button>
      {canEdit ? (
        <div className="mt-3">
          <OwnerPicker values={task.ownerNames} staff={staff} ownerNames={ownerNames} onChange={assign} />
        </div>
      ) : null}
      {canEdit ? (
        <div className="mt-3">
          <Select value={task.status} onValueChange={(value) => void changeStatus(value as FairTaskStatus)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>{FAIR_TASK_STATUS_LABELS[status]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <p className="mt-2 text-xs font-medium text-muted-foreground">{FAIR_TASK_STATUS_LABELS[task.status]}</p>
      )}
    </article>
  );
}

function TaskForm({
  eventId,
  staff,
  ownerNames,
  task,
  onClose,
}: {
  eventId: string;
  staff: FloorPerson[];
  ownerNames: string[];
  task: FloorTaskDto | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(task?.title ?? "");
  const [area, setArea] = useState(task?.area ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [owners, setOwners] = useState(task?.ownerNames ?? []);
  const [startsOn, setStartsOn] = useState(task?.startsOn ?? "");
  const [dueOn, setDueOn] = useState(task?.dueOn ?? "");
  const [priority, setPriority] = useState<FairTaskPriority>(task?.priority ?? "NORMAL");
  const [status, setStatus] = useState<FairTaskStatus>(task?.status ?? "PENDING");
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    const body = {
      title,
      area,
      description,
      ownerNames: owners,
      startsOn,
      dueOn,
      priority,
      status,
      updatedAt: task?.updatedAt,
    };
    try {
      if (task) {
        await floorRequest(`/api/floor/events/${eventId}/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast.success("Tarefa atualizada.");
      } else {
        await floorRequest(`/api/floor/events/${eventId}/tasks`, { method: "POST", body: JSON.stringify(body) });
        toast.success("Tarefa criada.");
      }
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove() {
    if (!task || !window.confirm("Excluir esta tarefa?")) return;
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/events/${eventId}/tasks/${task.id}`, { method: "DELETE" });
      toast.success("Tarefa excluída.");
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Tarefa</Label>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Frente</Label>
          <Input value={area} onChange={(event) => setArea(event.target.value)} placeholder="Opcional" />
        </div>
        <div className="space-y-2">
          <Label>Responsável</Label>
          <OwnerPicker values={owners} staff={staff} ownerNames={ownerNames} onChange={setOwners} />
        </div>
        <div className="space-y-2">
          <Label>Início</Label>
          <Input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Prazo</Label>
          <Input type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Prioridade</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as FairTaskPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((item) => (
                <SelectItem key={item} value={item}>{FAIR_TASK_PRIORITY_LABELS[item]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as FairTaskStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((item) => (
                <SelectItem key={item} value={item}>{FAIR_TASK_STATUS_LABELS[item]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Descrição</Label>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={submitting || title.trim().length < 2}>{submitting ? "Salvando..." : "Salvar"}</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        {task ? (
          <Button type="button" variant="outline" disabled={submitting} onClick={() => void remove()}>Excluir</Button>
        ) : null}
      </div>
    </form>
  );
}

function TaskCalendar({ tasks }: { tasks: FloorTaskDto[] }) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const dated = tasks.filter((task) => task.dueOn);
  const key = selected ? localDateKey(selected) : "";
  const ofDay = dated.filter((task) => task.dueOn === key);
  const undated = tasks.filter((task) => !task.dueOn);

  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-white p-4 md:grid-cols-[auto_1fr]">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        modifiers={{ booked: dated.map((task) => dateFromKey(task.dueOn!)) }}
      />
      <div className="space-y-3">
        <p className="font-medium">{key ? formatDateKey(key) : "Selecione um dia"}</p>
        {ofDay.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma tarefa neste dia.</p> : ofDay.map((task) => (
          <p key={task.id} className="text-sm">{task.title}</p>
        ))}
        {undated.length > 0 ? (
          <p className="text-sm text-muted-foreground">{undated.length} sem prazo, só na lista e no kanban.</p>
        ) : null}
      </div>
    </div>
  );
}

function TaskTimeline({ tasks }: { tasks: FloorTaskDto[] }) {
  const dated = [...tasks].filter((task) => task.dueOn || task.startsOn).sort((left, right) => {
    const a = left.startsOn ?? left.dueOn ?? "";
    const b = right.startsOn ?? right.dueOn ?? "";
    return a.localeCompare(b);
  });
  if (dated.length === 0) return <Empty title="Nenhuma data lançada" detail="A linha do tempo aparece quando uma tarefa ganha início ou prazo." />;
  return (
    <ol className="space-y-3">
      {dated.map((task) => (
        <li key={task.id} className="grid grid-cols-[7rem_1fr] gap-3">
          <p className="text-sm font-semibold tabular-nums">{formatDateKey(task.startsOn ?? task.dueOn ?? "")}</p>
          <div className="rounded-2xl border border-border bg-white px-4 py-3">
            <p className="font-medium">{task.title}</p>
            <p className="text-sm text-muted-foreground">{[task.area, FAIR_TASK_STATUS_LABELS[task.status]].filter(Boolean).join(" · ")}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Expenses({ eventId, canEdit, expenses }: { eventId: string; canEdit: boolean; expenses: FloorExpenseDto[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");
  const [spentOn, setSpentOn] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function create() {
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/events/${eventId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          title,
          plannedReais: parseReais(planned),
          actualReais: parseReais(actual),
          spentOn,
        }),
      });
      setTitle("");
      setPlanned("");
      setActual("");
      setSpentOn("");
      toast.success("Gasto lançado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível lançar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(expense: FloorExpenseDto) {
    if (!window.confirm("Excluir este gasto?")) return;
    try {
      await floorRequest(`/api/floor/events/${eventId}/expenses/${expense.id}`, { method: "DELETE" });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <form
          className="grid gap-3 rounded-2xl border border-border bg-white p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <div className="space-y-2 sm:col-span-2">
            <Label>Gasto</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <MoneyField label="Previsto" value={planned} onChange={setPlanned} />
          <MoneyField label="Realizado" value={actual} onChange={setActual} />
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={spentOn} onChange={(event) => setSpentOn(event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={submitting || title.trim().length < 2}>{submitting ? "Salvando..." : "Lançar gasto"}</Button>
          </div>
        </form>
      ) : null}
      {expenses.length === 0 ? (
        <Empty title="Nenhum gasto" detail="Lance uma linha quando souber o previsto ou o que já foi pago." />
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => (
            <article key={expense.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3">
              <div>
                <p className="font-medium">{expense.title}</p>
                <p className="text-sm text-muted-foreground">
                  Previsto {formatBrlFromCents(expense.plannedCents)} · Realizado {formatBrlFromCents(expense.actualCents)}
                  {expense.spentOn ? ` · ${formatDateKey(expense.spentOn)}` : ""}
                </p>
              </div>
              {canEdit ? (
                <Button type="button" variant="outline" size="sm" onClick={() => void remove(expense)}>Excluir</Button>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectionForm({
  eventId,
  canEdit,
  projection,
}: {
  eventId: string;
  canEdit: boolean;
  projection: FloorProjectionDto;
}) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState(projection.vehicleGoal?.toString() ?? "");
  const [budget, setBudget] = useState(projection.budgetCents == null ? "" : formatReaisInput(projection.budgetCents));
  const [capture, setCapture] = useState(projection.captureGoalCents == null ? "" : formatReaisInput(projection.captureGoalCents));
  const [captured, setCaptured] = useState(projection.capturedCents == null ? "" : formatReaisInput(projection.capturedCents));
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    try {
      await floorRequest(`/api/floor/events/${eventId}/projection`, {
        method: "PATCH",
        body: JSON.stringify({
          vehicleGoal: vehicles.trim() ? Number(vehicles) : null,
          budgetReais: parseReais(budget),
          captureGoalReais: parseReais(capture),
          capturedReais: parseReais(captured),
        }),
      });
      toast.success("Projeção salva.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="grid max-w-xl gap-3 rounded-2xl border border-border bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="space-y-2">
        <Label>Meta de veículos</Label>
        <Input inputMode="numeric" value={vehicles} onChange={(event) => setVehicles(event.target.value.replace(/\D/g, ""))} placeholder="Opcional" disabled={!canEdit} />
      </div>
      <MoneyField label="Orçamento previsto" value={budget} onChange={setBudget} disabled={!canEdit} />
      <MoneyField label="Meta de captação" value={capture} onChange={setCapture} disabled={!canEdit} />
      <MoneyField label="Valor captado" value={captured} onChange={setCaptured} disabled={!canEdit} />
      {canEdit ? <Button type="submit" disabled={submitting}>{submitting ? "Salvando..." : "Salvar projeção"}</Button> : <p className="text-sm text-muted-foreground">Só o admin altera a projeção.</p>}
    </form>
  );
}

function improvements(input: {
  status: FairEventStatus;
  tasks: FloorTaskDto[];
  visits: FloorVisitDto[];
  closed: number;
  lost: FloorVisitDto[];
  overdue: FloorTaskDto[];
  unassigned: FloorTaskDto[];
  actual: number;
  projection: FloorProjectionDto;
}) {
  const notes: string[] = [];
  if (input.tasks.length === 0) notes.push("Nenhuma tarefa foi planejada.");
  if (input.overdue.length > 0) notes.push(`${input.overdue.length} ${input.overdue.length === 1 ? "tarefa passou" : "tarefas passaram"} do prazo.`);
  if (input.unassigned.length > 0) notes.push(`${input.unassigned.length} ${input.unassigned.length === 1 ? "tarefa aberta está" : "tarefas abertas estão"} sem responsável.`);
  if (input.projection.vehicleGoal != null && input.closed < input.projection.vehicleGoal) {
    notes.push(`Fecharam ${input.closed} de ${input.projection.vehicleGoal} veículos da meta.`);
  }
  if (input.projection.budgetCents != null && input.actual > input.projection.budgetCents) {
    notes.push("O gasto realizado passou o orçamento previsto.");
  }
  if (
    input.projection.captureGoalCents != null &&
    input.projection.capturedCents != null &&
    input.projection.capturedCents < input.projection.captureGoalCents
  ) {
    notes.push("A captação ainda não chegou na meta.");
  }
  const reason = topReason(input.lost);
  if (reason) notes.push(`Motivo que mais pesou para não fechar: ${reason}.`);
  if (input.status === "CLOSED" && notes.length === 0) notes.push("O plano lançado foi cumprido dentro do que estava preenchido.");
  return notes;
}

function topReason(lost: FloorVisitDto[]) {
  const counts = new Map<string, number>();
  for (const visit of lost) {
    if (!visit.lostReason) continue;
    counts.set(visit.lostReason, (counts.get(visit.lostReason) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function budgetHint(actual: number, budget: number | null) {
  if (budget == null) return "Sem orçamento previsto";
  return actual > budget ? "Acima do orçamento" : "Dentro do orçamento";
}

function goalMoney(captured: number | null, goal: number | null) {
  if (goal == null) return "Sem meta de captação";
  if (captured == null) return `Meta ${formatBrlFromCents(goal)} · nada lançado`;
  return `Meta ${formatBrlFromCents(goal)}`;
}

function sameName(left: string, right: string) {
  return left.trim().toLocaleLowerCase("pt-BR") === right.trim().toLocaleLowerCase("pt-BR");
}

function OwnerPicker({
  values,
  staff,
  ownerNames,
  onChange,
}: {
  values: string[];
  staff: FloorPerson[];
  ownerNames: string[];
  onChange: (values: string[]) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const needle = draft.trim().toLocaleLowerCase("pt-BR");
  const options = [...new Set([...ownerNames, ...staff.map((person) => person.name)])].filter((name) => {
    if (values.some((current) => sameName(current, name))) return false;
    return needle ? name.toLocaleLowerCase("pt-BR").includes(needle) : true;
  });

  function add(name: string) {
    const trimmed = name.trim();
    if (!trimmed || values.some((current) => sameName(current, trimmed))) {
      setDraft("");
      return;
    }
    setDraft("");
    void onChange([...values, trimmed]);
  }

  function remove(name: string) {
    void onChange(values.filter((current) => !sameName(current, name)));
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft("");
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-auto min-h-9 max-w-full justify-start py-1.5 text-left font-normal whitespace-normal">
          {values.length > 0 ? values.join(", ") : "Atribuir responsáveis"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2 p-3">
        <Label>Responsáveis</Label>
        {values.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {values.map((name) => (
              <button
                key={name}
                type="button"
                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
                onClick={() => remove(name)}
              >
                {name} ×
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Ninguém nesta tarefa. Adicione quantos precisar.</p>
        )}
        <Input
          value={draft}
          autoFocus
          placeholder="Nome de outra pessoa"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            }
          }}
        />
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {options.map((name) => (
            <button
              key={name}
              type="button"
              className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => add(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <Button type="button" size="sm" onClick={() => add(draft)} disabled={draft.trim().length === 0}>
          Adicionar
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function localDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function MoneyScore({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-brand-navy px-4 py-4">
      <p className="text-[11px] font-medium tracking-[0.14em] text-white/50 uppercase">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-white/60">{hint}</p>
    </div>
  );
}

function SectionButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm font-medium",
        active ? "bg-brand-navy text-white" : "bg-white text-foreground ring-1 ring-border",
      )}
    >
      {children}
    </button>
  );
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
