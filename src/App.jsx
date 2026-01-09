import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

/* =========================
   HELPERS
========================= */
const PRIORITIES = ["high", "med", "low"];
const PRIORITY_LABEL = { high: "High", med: "Med", low: "Low" };

function dateKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function todayKey() {
  return dateKey(new Date());
}
function formatToday() {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
function formatShort(d) {
  return d.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" });
}
function normalizePriority(p) {
  return PRIORITIES.includes(p) ? p : "med";
}
function getLastNDates(n) {
  const out = [];
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(d);
  }
  return out;
}
function toCsv(rows) {
  const escape = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = ["date", "done", "total", "percent", "fullDone"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        escape(dateKey(r.date)),
        escape(r.done),
        escape(r.total),
        escape(r.percent),
        escape(r.fullDone ? "yes" : "no"),
      ].join(",")
    ),
  ];
  return lines.join("\n");
}
function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================
   DEFAULT TEMPLATE
========================= */
const DEFAULT_TEMPLATE = [
  { id: crypto.randomUUID(), title: "Cek email masuk", priority: "med" },
  { id: crypto.randomUUID(), title: "Follow up yang pending", priority: "high" },
  { id: crypto.randomUUID(), title: "Rapikan dokumen kantor", priority: "low" },
];

function buildDailyFromTemplate(template) {
  return template.map((t) => ({
    id: crypto.randomUUID(),
    title: t.title,
    done: false,
    priority: normalizePriority(t.priority),
  }));
}

/* =========================
   MODAL
========================= */
function Modal({ open, title, desc, confirmText = "Ya", cancelText = "Batal", onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="modalOverlay" onMouseDown={onClose} role="presentation">
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modalTitle">{title}</div>
        {desc ? <div className="modalDesc">{desc}</div> : null}
        <div className="modalActions">
          <button className="btn" onClick={onClose} type="button">
            {cancelText}
          </button>
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   AUTH (modern)
========================= */
function AuthCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // login | register

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const action =
      mode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error } = await action;

    if (error) alert(error.message);
    else if (mode === "register") {
      alert("Registrasi berhasil. Kalau diminta verifikasi email, cek inbox/spam ya.");
    }

    setLoading(false);
  }

  return (
    <>
      <GlobalStyles />
      <div className="authPage">
        <div className="authCardNew">
          <div className="authHeaderNew">
            <div className="authLogoNew">✓</div>
            <div>
              <div className="authTitleNew">App Pencatatan Harian Fauziyah</div>
              <div className="authSubNew">Data kamu akan tersimpan & sinkron otomatis setelah login.</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="authFormNew">
            <label className="authLabelNew">Email</label>
            <input
              className="authInputNew"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className="authLabelNew">Password</label>
            <input
              className="authInputNew"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button className="authBtnNew" disabled={loading} type="submit">
              {loading ? "..." : mode === "login" ? "Masuk" : "Daftar"}
            </button>

            <div className="authFooterNew">
              {mode === "login" ? (
                <div>
                  Belum punya akun?{" "}
                  <button type="button" className="authLinkNew" onClick={() => setMode("register")} disabled={loading}>
                    Daftar
                  </button>
                </div>
              ) : (
                <div>
                  Sudah punya akun?{" "}
                  <button type="button" className="authLinkNew" onClick={() => setMode("login")} disabled={loading}>
                    Login
                  </button>
                </div>
              )}

              <div className="authHintNew">Tip: kalau diminta verifikasi email, cek inbox / spam.</div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

/* =========================
   APP (entry)
========================= */
export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data?.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (!session) return <AuthCard />;

  return (
    <>
      <GlobalStyles />
      <Dashboard user={session.user} />
    </>
  );
}

/* =========================
   DASHBOARD
========================= */
function Dashboard({ user }) {
  const dayISO = useMemo(() => todayKey(), []);
  const [tab, setTab] = useState("today"); // today | template | recap

  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [templateInput, setTemplateInput] = useState("");
  const [templatePriority, setTemplatePriority] = useState("med");

  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("med");

  const [recap, setRecap] = useState([]);
  const [streak, setStreak] = useState(0);

  // ui
  const [qToday, setQToday] = useState("");
  const [qTemplate, setQTemplate] = useState("");
  const [sortUndoneFirst, setSortUndoneFirst] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all"); // all | undone | done
  const [priorityFilter, setPriorityFilter] = useState("all"); // all | high | med | low
  const [templatePriorityFilter, setTemplatePriorityFilter] = useState("all");

  const [modal, setModal] = useState({ open: false, title: "", desc: "", onConfirm: null });

  // edit today
  const [editingTodayId, setEditingTodayId] = useState(null);
  const [editingTodayValue, setEditingTodayValue] = useState("");
  const [editingTodayPriority, setEditingTodayPriority] = useState("med");

  // edit template
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editingTemplateValue, setEditingTemplateValue] = useState("");
  const [editingTemplatePriority, setEditingTemplatePriority] = useState("med");

  // user dropdown
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onClick() {
      setMenuOpen(false);
    }
    if (menuOpen) window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [menuOpen]);

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
  }

  /* =========================
     DB HELPERS (FIX: pakai userId param)
  ========================= */
  async function loadTemplateFromDB(userId) {
    const { data, error } = await supabase
      .from("user_templates")
      .select("items")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (Array.isArray(data?.items)) {
      return data.items.map((t) => ({ ...t, priority: normalizePriority(t.priority) }));
    }
    return null;
  }

  async function saveTemplateToDB(userId, nextTemplate) {
    const payload = {
      user_id: userId,
      items: nextTemplate,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("user_templates").upsert(payload, { onConflict: "user_id" });
    if (error) throw error;
  }

  async function loadDailyFromDB(userId, day) {
    const { data, error } = await supabase
      .from("daily_tasks")
      .select("items")
      .eq("user_id", userId)
      .eq("day", day)
      .maybeSingle();

    if (error) throw error;

    if (Array.isArray(data?.items)) {
      return data.items.map((t) => ({ ...t, priority: normalizePriority(t.priority) }));
    }
    return null;
  }

  async function saveDailyToDB(userId, day, nextTasks) {
    const payload = {
      user_id: userId,
      day,
      items: nextTasks,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("daily_tasks").upsert(payload, { onConflict: "user_id,day" });
    if (error) throw error;
  }

  /* =========================
     LOAD TEMPLATE (DB)
  ========================= */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const t = await loadTemplateFromDB(user.id);
        if (!alive) return;

        if (t && t.length) {
          setTemplate(t);
        } else {
          const seed = DEFAULT_TEMPLATE.map((x) => ({ ...x, id: crypto.randomUUID() }));
          setTemplate(seed);
          await saveTemplateToDB(user.id, seed);
        }
      } catch (e) {
        console.log("loadTemplateFromDB error:", e);
        setTemplate(DEFAULT_TEMPLATE.map((x) => ({ ...x, id: crypto.randomUUID() })));
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  /* =========================
     SAVE TEMPLATE (DB)
  ========================= */
  useEffect(() => {
    if (!template || template.length === 0) return;

    (async () => {
      try {
        await saveTemplateToDB(user.id, template);
      } catch (e) {
        console.log("saveTemplateToDB error:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, user.id]);

  /* =========================
     LOAD TODAY TASKS (DB)
  ========================= */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const fromDB = await loadDailyFromDB(user.id, dayISO);
        if (!alive) return;

        if (fromDB && fromDB.length) {
          setTasks(fromDB);
        } else {
          const seed = buildDailyFromTemplate(template);
          setTasks(seed);
          await saveDailyToDB(user.id, dayISO, seed);
        }
      } catch (e) {
        console.log("loadDailyFromDB error:", e);
        setTasks(buildDailyFromTemplate(template));
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayISO, user.id, template]);

  /* =========================
     SAVE TODAY TASKS (DB)
  ========================= */
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    (async () => {
      try {
        await saveDailyToDB(user.id, dayISO, tasks);
      } catch (e) {
        console.log("saveDailyToDB error:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, dayISO, user.id]);

  /* =========================
     RECAP (DB) - 7 days
  ========================= */
  useEffect(() => {
    if (tab !== "recap") return;

    (async () => {
      try {
        const dates = getLastNDates(7).map((d) => dateKey(d));
        const from = dates[dates.length - 1];
        const to = dates[0];

        const { data, error } = await supabase
          .from("daily_tasks")
          .select("day, items")
          .eq("user_id", user.id)
          .gte("day", from)
          .lte("day", to);

        if (error) throw error;

        const map = new Map((data || []).map((r) => [r.day, r.items]));

        const rows = getLastNDates(7).map((d) => {
          const k = dateKey(d);
          const arr = map.get(k);
          const total = Array.isArray(arr) ? arr.length : 0;
          const done = Array.isArray(arr) ? arr.filter((t) => t?.done).length : 0;
          const percent = total ? Math.round((done / total) * 100) : 0;
          const fullDone = total > 0 && done === total;
          return { date: new Date(d), total, done, percent, fullDone };
        });

        setRecap(rows);
      } catch (e) {
        console.log("recap db error:", e);
        setRecap([]);
      }
    })();
  }, [tab, user.id]);

  /* =========================
     STREAK (DB) - 30 days
  ========================= */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const dates = getLastNDates(30).map((d) => dateKey(d));
        const from = dates[dates.length - 1];
        const to = dates[0];

        const { data, error } = await supabase
          .from("daily_tasks")
          .select("day, items")
          .eq("user_id", user.id)
          .gte("day", from)
          .lte("day", to);

        if (error) throw error;

        const map = new Map((data || []).map((r) => [r.day, r.items]));

        let s = 0;
        const last30 = getLastNDates(30); // hari ini dulu
        for (let i = 0; i < last30.length; i++) {
          const k = dateKey(last30[i]);
          const arr = map.get(k);
          const total = Array.isArray(arr) ? arr.length : 0;
          const done = Array.isArray(arr) ? arr.filter((t) => t?.done).length : 0;
          const fullDone = total > 0 && done === total;
          if (fullDone) s++;
          else break;
        }

        if (alive) setStreak(s);
      } catch (e) {
        console.log("streak db error:", e);
        if (alive) setStreak(0);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user.id, dayISO, tasks]);

  /* =========================
     UI CALC
  ========================= */
  const doneCount = tasks.filter((t) => t.done).length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  const summary = useMemo(() => {
    const undone = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);
    const counts = { high: 0, med: 0, low: 0 };
    for (const t of undone) counts[normalizePriority(t.priority)]++;
    return { total: tasks.length, undone: undone.length, done: done.length, high: counts.high, med: counts.med, low: counts.low };
  }, [tasks]);

  const filteredToday = useMemo(() => {
    const qq = qToday.trim().toLowerCase();
    let arr = tasks;

    if (qq) arr = arr.filter((t) => t.title.toLowerCase().includes(qq));
    if (statusFilter === "undone") arr = arr.filter((t) => !t.done);
    if (statusFilter === "done") arr = arr.filter((t) => t.done);
    if (priorityFilter !== "all") arr = arr.filter((t) => normalizePriority(t.priority) === priorityFilter);

    if (sortUndoneFirst) arr = [...arr].sort((a, b) => Number(a.done) - Number(b.done));
    return arr;
  }, [tasks, qToday, statusFilter, priorityFilter, sortUndoneFirst]);

  const filteredTemplate = useMemo(() => {
    const qq = qTemplate.trim().toLowerCase();
    let arr = template.map((t) => ({ ...t, priority: normalizePriority(t.priority) }));
    if (qq) arr = arr.filter((t) => t.title.toLowerCase().includes(qq));
    if (templatePriorityFilter !== "all") arr = arr.filter((t) => normalizePriority(t.priority) === templatePriorityFilter);
    return arr;
  }, [template, qTemplate, templatePriorityFilter]);

  const recapEmpty = recap.every((r) => r.total === 0);

  /* =========================
     ACTIONS
  ========================= */
  function toggleDone(id) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }
  function addTaskToday(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setTasks((prev) => [{ id: crypto.randomUUID(), title, done: false, priority: normalizePriority(newPriority) }, ...prev]);
    setNewTitle("");
    setNewPriority("med");
  }
  function removeTaskToday(id) {
    if (editingTodayId === id) cancelEditToday();
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }
  function markAllDone() {
    setTasks((prev) => prev.map((t) => ({ ...t, done: true })));
  }
  function unmarkAll() {
    setTasks((prev) => prev.map((t) => ({ ...t, done: false })));
  }
  function resetTodayFromTemplate() {
    setModal({
      open: true,
      title: "Reset tugas hari ini?",
      desc: "Tugas hari ini akan diisi ulang dari Template. Progress hari ini akan hilang.",
      onConfirm: () => {
        cancelEditToday();
        setTasks(buildDailyFromTemplate(template));
      },
    });
  }

  function startEditToday(id, currentTitle, currentPriority) {
    setEditingTodayId(id);
    setEditingTodayValue(currentTitle);
    setEditingTodayPriority(normalizePriority(currentPriority));
  }
  function cancelEditToday() {
    setEditingTodayId(null);
    setEditingTodayValue("");
    setEditingTodayPriority("med");
  }
  function saveEditToday(id) {
    const v = editingTodayValue.trim();
    if (!v) return;
    const p = normalizePriority(editingTodayPriority);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title: v, priority: p } : t)));
    cancelEditToday();
  }

  function addTemplate(e) {
    e.preventDefault();
    const title = templateInput.trim();
    if (!title) return;
    setTemplate((prev) => [{ id: crypto.randomUUID(), title, priority: normalizePriority(templatePriority) }, ...prev]);
    setTemplateInput("");
    setTemplatePriority("med");
  }
  function removeTemplate(id) {
    if (editingTemplateId === id) cancelEditTemplate();
    setTemplate((prev) => prev.filter((t) => t.id !== id));
  }
  function resetTemplateDefault() {
    setModal({
      open: true,
      title: "Reset template ke default?",
      desc: "Template buatan kamu akan hilang dan diganti default.",
      onConfirm: () => {
        cancelEditTemplate();
        setTemplate(DEFAULT_TEMPLATE.map((t) => ({ ...t, id: crypto.randomUUID() })));
      },
    });
  }

  function startEditTemplate(id, currentTitle, currentPriority) {
    setEditingTemplateId(id);
    setEditingTemplateValue(currentTitle);
    setEditingTemplatePriority(normalizePriority(currentPriority));
  }
  function cancelEditTemplate() {
    setEditingTemplateId(null);
    setEditingTemplateValue("");
    setEditingTemplatePriority("med");
  }
  function saveEditTemplate(id) {
    const v = editingTemplateValue.trim();
    if (!v) return;
    const p = normalizePriority(editingTemplatePriority);
    setTemplate((prev) => prev.map((t) => (t.id === id ? { ...t, title: v, priority: p } : t)));
    cancelEditTemplate();
  }

  return (
    <div className="container">
      <Modal
        open={modal.open}
        title={modal.title}
        desc={modal.desc}
        confirmText="Ya, lanjut"
        cancelText="Batal"
        onConfirm={modal.onConfirm}
        onClose={() => setModal({ open: false, title: "", desc: "", onConfirm: null })}
      />

      <div className="header">
        <div>
          <h1 className="title">Checklist Harian</h1>
          <div className="subtitle">{formatToday()}</div>
          <div className="subtitle" style={{ marginTop: 8 }}>
            Selamat datang, <b>{user?.email}</b>
          </div>
        </div>

        <div className="userMenu">
          <button
            className="userPill"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            <span className="userDot" aria-hidden="true" />
            <span className="userEmail">{user?.email || "Akun"}</span>
            <span className="chev" aria-hidden="true">
              ▾
            </span>
          </button>

          {menuOpen && (
            <div className="menuDrop" role="menu">
              <button className="menuItem" type="button" onClick={() => setMenuOpen(false)}>
                Profil
              </button>
              <button
                className="menuItem danger"
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="tabs">
          <button className={`tab ${tab === "today" ? "active" : ""}`} onClick={() => setTab("today")}>
            Hari ini
          </button>
          <button className={`tab ${tab === "template" ? "active" : ""}`} onClick={() => setTab("template")}>
            Template
          </button>
          <button className={`tab ${tab === "recap" ? "active" : ""}`} onClick={() => setTab("recap")}>
            Rekap
          </button>

          <div className="pill">
            Streak: <b>{streak}</b> hari
          </div>
        </div>

        {tab === "today" ? (
          <>
            <div className="summary">
              <div className="summaryCard">
                <div className="summaryNum">{summary.undone}</div>
                <div className="summaryLabel">Belum selesai</div>
              </div>
              <div className="summaryCard">
                <div className="summaryNum">{summary.done}</div>
                <div className="summaryLabel">Selesai</div>
              </div>
              <div className="summaryCard">
                <div className="summaryNum">{summary.high}</div>
                <div className="summaryLabel">High</div>
              </div>
              <div className="summaryCard">
                <div className="summaryNum">{summary.med}</div>
                <div className="summaryLabel">Med</div>
              </div>
              <div className="summaryCard">
                <div className="summaryNum">{summary.low}</div>
                <div className="summaryLabel">Low</div>
              </div>
            </div>

            <div className="progressWrap">
              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${progress}%` }} />
              </div>
              <div style={{ minWidth: 130, textAlign: "right" }}>
                {doneCount}/{tasks.length} ({progress}%)
              </div>
            </div>

            <div className="row" style={{ marginBottom: 10 }}>
              <input className="input" value={qToday} onChange={(e) => setQToday(e.target.value)} placeholder="Cari tugas..." />

              <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Status: Semua</option>
                <option value="undone">Status: Belum</option>
                <option value="done">Status: Selesai</option>
              </select>

              <select className="select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="all">Prioritas: Semua</option>
                <option value="high">Prioritas: High</option>
                <option value="med">Prioritas: Med</option>
                <option value="low">Prioritas: Low</option>
              </select>

              <button className="btn" type="button" onClick={() => setSortUndoneFirst((v) => !v)}>
                Sort: {sortUndoneFirst ? "Belum dulu" : "As-is"}
              </button>
            </div>

            <form onSubmit={addTaskToday} className="row actionsGrid">
              <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Tambah tugas..." />

              <select className="select" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                <option value="high">High</option>
                <option value="med">Med</option>
                <option value="low">Low</option>
              </select>

              <button className="btn primary btnAdd" type="submit" aria-label="Tambah tugas">
                <span className="btnIcon" aria-hidden="true">
                  ＋
                </span>
                <span>Tambah</span>
              </button>

              <button className="btn" type="button" onClick={markAllDone}>
                Selesai semua
              </button>
              <button className="btn" type="button" onClick={unmarkAll}>
                Batal semua
              </button>
              <button className="btn" type="button" onClick={resetTodayFromTemplate}>
                Reset dari Template
              </button>
            </form>

            <div className="list">
              {filteredToday.length === 0 ? (
                <div className="empty">
                  <div className="emptyTitle">Tidak ada hasil</div>
                  <div className="emptySub">
                    {tasks.length === 0 ? "Tambah tugas atau klik “Reset dari Template”." : "Coba ubah filter atau kata kunci."}
                  </div>
                </div>
              ) : (
                filteredToday.map((t) => (
                  <div key={t.id} className="item">
                    <input type="checkbox" checked={t.done} onChange={() => toggleDone(t.id)} />

                    {editingTodayId === t.id ? (
                      <>
                        <input className="input" value={editingTodayValue} onChange={(e) => setEditingTodayValue(e.target.value)} />
                        <select className="select" value={editingTodayPriority} onChange={(e) => setEditingTodayPriority(e.target.value)}>
                          <option value="high">High</option>
                          <option value="med">Med</option>
                          <option value="low">Low</option>
                        </select>
                        <button className="btn primary" type="button" onClick={() => saveEditToday(t.id)}>
                          Simpan
                        </button>
                        <button className="btn" type="button" onClick={cancelEditToday}>
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <div className={`itemTitle ${t.done ? "done" : ""}`}>
                          <div className="titleText">{t.title}</div>
                          <div className="metaRow">
                            <span className={`badge badge-${normalizePriority(t.priority)}`}>{PRIORITY_LABEL[normalizePriority(t.priority)]}</span>
                          </div>
                        </div>

                        <button className="btn" type="button" onClick={() => startEditToday(t.id, t.title, t.priority)}>
                          Edit
                        </button>
                        <button className="btn danger" type="button" onClick={() => removeTaskToday(t.id)}>
                          Hapus
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="kicker">Tip: kerjakan High dulu, baru Med/Low.</div>
          </>
        ) : tab === "template" ? (
          <>
            <div className="muted">Template dipakai untuk membuat daftar tugas otomatis setiap hari.</div>

            <div className="row" style={{ marginTop: 12 }}>
              <input className="input" value={qTemplate} onChange={(e) => setQTemplate(e.target.value)} placeholder="Cari template..." />

              <select className="select" value={templatePriorityFilter} onChange={(e) => setTemplatePriorityFilter(e.target.value)}>
                <option value="all">Prioritas: Semua</option>
                <option value="high">Prioritas: High</option>
                <option value="med">Prioritas: Med</option>
                <option value="low">Prioritas: Low</option>
              </select>

              <button className="btn" type="button" onClick={resetTemplateDefault}>
                Reset Default
              </button>
            </div>

            <form onSubmit={addTemplate} className="row actionsGrid" style={{ marginTop: 10 }}>
              <input className="input" value={templateInput} onChange={(e) => setTemplateInput(e.target.value)} placeholder="Tambah template..." />
              <select className="select" value={templatePriority} onChange={(e) => setTemplatePriority(e.target.value)}>
                <option value="high">High</option>
                <option value="med">Med</option>
                <option value="low">Low</option>
              </select>

              <button className="btn primary btnAdd" type="submit">
                <span className="btnIcon" aria-hidden="true">
                  ＋
                </span>
                <span>Tambah</span>
              </button>
            </form>

            <div className="list">
              {filteredTemplate.length === 0 ? (
                <div className="empty">
                  <div className="emptyTitle">Tidak ada hasil</div>
                  <div className="emptySub">{template.length === 0 ? "Template masih kosong. Tambah dulu ya." : "Coba ganti kata kunci / filter."}</div>
                </div>
              ) : (
                filteredTemplate.map((t) => (
                  <div key={t.id} className="item">
                    {editingTemplateId === t.id ? (
                      <>
                        <input className="input" value={editingTemplateValue} onChange={(e) => setEditingTemplateValue(e.target.value)} />
                        <select className="select" value={editingTemplatePriority} onChange={(e) => setEditingTemplatePriority(e.target.value)}>
                          <option value="high">High</option>
                          <option value="med">Med</option>
                          <option value="low">Low</option>
                        </select>
                        <button className="btn primary" type="button" onClick={() => saveEditTemplate(t.id)}>
                          Simpan
                        </button>
                        <button className="btn" type="button" onClick={cancelEditTemplate}>
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="itemTitle">
                          <div className="titleText">{t.title}</div>
                          <div className="metaRow">
                            <span className={`badge badge-${normalizePriority(t.priority)}`}>{PRIORITY_LABEL[normalizePriority(t.priority)]}</span>
                          </div>
                        </div>

                        <button className="btn" type="button" onClick={() => startEditTemplate(t.id, t.title, t.priority)}>
                          Edit
                        </button>
                        <button className="btn danger" type="button" onClick={() => removeTemplate(t.id)}>
                          Hapus
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="muted">Rekap 7 hari terakhir</div>
              <button className="btn" type="button" onClick={() => downloadTextFile(`rekap_7hari_${todayKey()}.csv`, toCsv(recap))}>
                Export CSV
              </button>
            </div>

            <div className="list">
              {recapEmpty ? (
                <div className="empty">
                  <div className="emptyTitle">Belum ada data rekap</div>
                  <div className="emptySub">Mulai centang tugas hari ini, nanti rekap akan muncul.</div>
                </div>
              ) : (
                recap.map((r) => (
                  <div key={r.date.toISOString()} className="item">
                    <div style={{ width: 140 }}>
                      <b>{formatShort(r.date)}</b>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {dateKey(r.date)}
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div className="progressTrack">
                        <div className="progressFill" style={{ width: `${r.percent}%` }} />
                      </div>
                      <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                        {r.done}/{r.total} selesai ({r.percent}%)
                      </div>
                    </div>

                    <div style={{ width: 120, textAlign: "right" }}>{r.fullDone ? "✅ Full" : r.total === 0 ? "—" : "⏳"}</div>
                  </div>
                ))
              )}
            </div>

            <div className="kicker">Next: kalau mau beneran sync semua device, baru kita pindah data tasks/template ke Supabase table.</div>
          </>
        )}
      </div>
    </div>
  );
}

/* =========================
   GLOBAL STYLES (ALL-IN-ONE)
========================= */
function GlobalStyles() {
  return (
    <style>{`
:root {
  --bg: #0b0f19;
  --card: rgba(255, 255, 255, 0.06);
  --card2: rgba(255, 255, 255, 0.08);
  --text: rgba(255, 255, 255, 0.92);
  --muted: rgba(255, 255, 255, 0.68);
  --border: rgba(255, 255, 255, 0.12);
  --shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  --radius: 18px;
}
* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  color: var(--text);
  background: var(--bg);
}
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(1200px 700px at 15% 10%, rgba(109, 40, 217, 0.35), transparent 55%),
    radial-gradient(1000px 600px at 85% 20%, rgba(59, 130, 246, 0.35), transparent 55%),
    radial-gradient(900px 700px at 50% 90%, rgba(16, 185, 129, 0.25), transparent 60%),
    var(--bg);
}
.container { max-width: 980px; margin: 32px auto; padding: 0 18px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.title { margin: 0; font-size: 30px; letter-spacing: 0.2px; }
.subtitle { margin-top: 6px; color: var(--muted); font-size: 13px; }

.card {
  background: linear-gradient(180deg, var(--card2), var(--card));
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 18px;
  backdrop-filter: blur(10px);
}

.tabs { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
.tab {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  cursor: pointer;
}
.tab.active { background: rgba(255, 255, 255, 0.14); border-color: rgba(255, 255, 255, 0.22); }

.pill {
  margin-left: auto;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 12px;
  background: rgba(255, 255, 255, 0.03);
}

.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

.input, .select {
  flex: 1;
  min-width: 220px;
  padding: 11px 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text);
  outline: none;
  height: 46px;
  font-size: 16px; /* fix iOS zoom */
}
.input::placeholder { color: rgba(255, 255, 255, 0.45); }

.btn {
  padding: 11px 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.10);
  color: var(--text);
  cursor: pointer;
  height: 46px;
  font-weight: 650;
  white-space: nowrap;
}
.btn.primary { background: rgba(255, 255, 255, 0.18); border-color: rgba(255, 255, 255, 0.25); }
.btn.danger { background: rgba(239, 68, 68, 0.18); border-color: rgba(239, 68, 68, 0.28); }
.btn:active { transform: translateY(1px); }

.btnAdd{ background: rgba(255,255,255,0.22); border-color: rgba(255,255,255,0.30); }
.btnAdd:hover{ background: rgba(255,255,255,0.28); }
.btnIcon{
  display:inline-grid; place-items:center;
  width: 22px; height: 22px;
  border-radius: 8px;
  margin-right: 8px;
  background: rgba(255,255,255,0.22);
  border: 1px solid rgba(255,255,255,0.20);
  font-weight: 900;
  line-height: 1;
}

.progressWrap { display: flex; gap: 12px; align-items: center; margin: 14px 0 14px; }
.progressTrack { flex: 1; height: 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.10); overflow: hidden; }
.progressFill { height: 100%; border-radius: 999px; background: rgba(255, 255, 255, 0.92); width: 0%; }

.muted { color: var(--muted); }

.list { display: grid; gap: 10px; margin-top: 12px; }
.item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
}
.itemTitle { flex: 1; line-height: 1.25; min-width: 240px; }
.itemTitle.done { text-decoration: line-through; opacity: 0.65; }
.titleText { font-size: 16px; }
.metaRow { margin-top: 8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }

.badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.06);
  font-size: 12px;
  color: rgba(255,255,255,0.88);
}
.badge-high { background: rgba(239, 68, 68, 0.16); border-color: rgba(239,68,68,0.26); }
.badge-med  { background: rgba(59, 130, 246, 0.16); border-color: rgba(59,130,246,0.26); }
.badge-low  { background: rgba(16, 185, 129, 0.16); border-color: rgba(16,185,129,0.26); }

.kicker { font-size: 12px; color: var(--muted); margin-top: 10px; }

.empty { padding: 16px; border-radius: 16px; border: 1px dashed rgba(255, 255, 255, 0.18); background: rgba(255, 255, 255, 0.03); }
.emptyTitle { font-weight: 800; margin-bottom: 4px; }
.emptySub { color: rgba(255, 255, 255, 0.65); font-size: 13px; }

/* modal */
.modalOverlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.60);
  backdrop-filter: blur(6px);
  display: grid; place-items: center;
  padding: 16px;
  z-index: 9999;
}
.modal {
  width: min(560px, 100%);
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(15, 20, 35, 0.92);
  box-shadow: 0 22px 60px rgba(0,0,0,0.55);
  padding: 16px 16px 14px;
}
.modalTitle { font-weight: 900; font-size: 16px; margin-bottom: 6px; }
.modalDesc { color: rgba(255,255,255,0.75); font-size: 13px; line-height: 1.45; }
.modalActions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px; flex-wrap: wrap; }

/* summary */
.summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
.summaryCard { background: rgba(255,255,255,0.055); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 12px; }
.summaryNum { font-size: 22px; font-weight: 900; }
.summaryLabel { margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.68); }

/* user dropdown */
.userMenu { position: relative; }
.userPill{
  display:flex; align-items:center; gap: 10px;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.92);
  cursor: pointer;
}
.userPill:hover{ background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.22); }
.userDot{ width: 10px; height: 10px; border-radius: 999px; background: rgba(16,185,129,0.85); box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
.userEmail{ max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 750; font-size: 13px; opacity: 0.95; }
.chev{ opacity: 0.7; }
.menuDrop{
  position: absolute; right: 0; top: calc(100% + 10px);
  width: 190px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(15, 20, 35, 0.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 22px 60px rgba(0,0,0,0.45);
  padding: 8px;
  z-index: 999;
}
.menuItem{
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(255,255,255,0.9);
  cursor: pointer;
}
.menuItem:hover{ background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.10); }
.menuItem.danger{ background: rgba(239, 68, 68, 0.12); }
.menuItem.danger:hover{ background: rgba(239, 68, 68, 0.18); }

/* ===== AUTH modern ===== */
.authPage{
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 22px 14px;
}
.authCardNew{
  width: min(520px, 100%);
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(14px);
  box-shadow: 0 26px 80px rgba(0,0,0,0.55);
  padding: 18px;
}
.authHeaderNew{
  display:flex; gap: 12px; align-items: center;
  padding: 6px 6px 14px;
}
.authLogoNew{
  width: 46px; height: 46px;
  border-radius: 16px;
  display:grid; place-items:center;
  font-weight: 900; font-size: 18px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.18);
}
.authTitleNew{ font-size: 24px; font-weight: 900; letter-spacing: 0.2px; }
.authSubNew{ margin-top: 4px; color: rgba(255,255,255,0.72); font-size: 13px; line-height: 1.4; }
.authFormNew{ display:grid; gap: 10px; padding: 0 6px 8px; }
.authLabelNew{ margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.75); }
.authInputNew{
  width: 100%;
  height: 48px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(0,0,0,0.28);
  color: rgba(255,255,255,0.92);
  outline: none;
  transition: 0.18s ease;
  font-size: 16px; /* fix iOS zoom */
}
.authInputNew::placeholder{ color: rgba(255,255,255,0.45); }
.authInputNew:focus{
  background: #ffffff;
  color: #0b0f19;
  border-color: #ffffff;
  box-shadow: 0 0 0 4px rgba(255,255,255,0.12);
}
.authBtnNew{
  margin-top: 12px;
  height: 50px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.22);
  background: rgba(255,255,255,0.92);
  color: #0b0f19;
  font-weight: 900;
  cursor: pointer;
  transition: 0.18s ease;
}
.authBtnNew:hover{ transform: translateY(-1px); }
.authBtnNew:disabled{ opacity: 0.65; cursor: not-allowed; transform: none; }
.authFooterNew{
  margin-top: 12px;
  display: grid;
  gap: 8px;
  color: rgba(255,255,255,0.75);
  font-size: 13px;
}
.authLinkNew{
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.95);
  font-weight: 800;
  cursor: pointer;
  padding: 0;
}
.authLinkNew:disabled{ opacity: 0.6; cursor: not-allowed; }
.authHintNew{ font-size: 12px; opacity: 0.65; }

/* responsive */
@media (max-width: 720px) {
  .title { font-size: 24px; }
  .container { padding: 0 14px; }
  .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pill { margin-left: 0; }
  .input, .select { min-width: 100%; width: 100%; }
  .row.actionsGrid{
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    align-items: stretch;
  }
  .row.actionsGrid .btn,
  .row.actionsGrid .select,
  .row.actionsGrid .input { width: 100%; }
  .row.actionsGrid .btn.primary { grid-column: span 2; }
}
@media (max-width: 420px) {
  .row.actionsGrid{ grid-template-columns: 1fr; }
  .row.actionsGrid .btn.primary { grid-column: auto; }
  .item { flex-wrap: wrap; align-items:flex-start; }
  .userEmail { max-width: 120px; }
}
@media (max-width: 480px){
  .authTitleNew{ font-size: 20px; }
  .authCardNew{ padding: 16px; }
}

/* iOS text-size adjust */
html { -webkit-text-size-adjust: 100%; }
    `}</style>
  );
}
