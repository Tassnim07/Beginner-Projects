import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Plus, Trash2 } from "lucide-react";

const CATEGORIES = [
  "Housing","Utilities","Groceries","Transportation","Dining","Health","Entertainment","Education","Savings","Other",
];

function currency(n) { return n.toLocaleString(undefined, { style: "currency", currency: "USD" }); }
function loadInitial() { try { const raw = localStorage.getItem("expense-tracker:txns"); return raw ? JSON.parse(raw) : []; } catch { return []; } }
function save(txns) { localStorage.setItem("expense-tracker:txns", JSON.stringify(txns)); }
function startOfMonth(iso) { const d = new Date(iso); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

export default function ExpenseTrackerApp() {
  const [txns, setTxns] = useState(loadInitial);
  const [filterMonth, setFilterMonth] = useState(() => startOfMonth(new Date().toISOString()));
  const [form, setForm] = useState({ type: "expense", category: "Groceries", amount: "", date: new Date().toISOString().slice(0, 10), note: "" });

  useEffect(() => save(txns), [txns]);

  const filtered = useMemo(() => {
    const ym = filterMonth.slice(0, 7);
    return txns.filter((t) => (t.date || "").slice(0, 7) === ym);
  }, [txns, filterMonth]);

  const totals = useMemo(() => {
    const income = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map = new Map();
    for (const t of filtered) {
      if (t.type !== "expense") continue;
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    }
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [filtered]);

  const dailySeries = useMemo(() => {
    const month = new Date(filterMonth);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const agg = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, income: 0, expense: 0, net: 0 }));
    for (const t of filtered) {
      const d = new Date(t.date).getDate();
      if (t.type === "income") agg[d - 1].income += t.amount;
      else agg[d - 1].expense += t.amount;
      agg[d - 1].net = agg[d - 1].income - agg[d - 1].expense;
    }
    let running = 0;
    return agg.map((x) => ({ ...x, cumNet: (running += x.net) }));
  }, [filtered, filterMonth]);

  function addTxn(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return alert("Enter a positive amount");
    const newTxn = { id: crypto.randomUUID(), ...form, amount };
    setTxns((prev) => [newTxn, ...prev]);
    setForm((f) => ({ ...f, amount: "", note: "" }));
  }

  function removeTxn(id) { setTxns((prev) => prev.filter((t) => t.id !== id)); }
  function changeMonth(offset) { const m = new Date(filterMonth); m.setMonth(m.getMonth() + offset); setFilterMonth(startOfMonth(m.toISOString())); }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto grid gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Expense Tracker</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => changeMonth(-1)} className="px-3 py-2 rounded-xl bg-white shadow">◀ Prev</button>
            <input type="month" className="px-3 py-2 rounded-xl bg-white shadow" value={filterMonth.slice(0,7)} onChange={(e) => setFilterMonth(e.target.value + "-01")} />
            <button onClick={() => changeMonth(1)} className="px-3 py-2 rounded-xl bg-white shadow">Next ▶</button>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard title="Income" value={currency(totals.income)} />
          <SummaryCard title="Expenses" value={currency(totals.expense)} />
          <SummaryCard title="Balance" value={currency(totals.balance)} highlight={totals.balance >= 0} />
        </section>

        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-xl font-semibold mb-3">Add transaction</h2>
          <form onSubmit={addTxn} className="grid sm:grid-cols-5 gap-3">
            <select className="px-3 py-2 rounded-xl border" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select className="px-3 py-2 rounded-xl border" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} disabled={form.type === "income"}>
              {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <input type="number" step="0.01" min="0" placeholder="Amount" className="px-3 py-2 rounded-xl border" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            <input type="date" className="px-3 py-2 rounded-xl border" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <div className="flex gap-2">
              <input type="text" placeholder="Note (optional)" className="px-3 py-2 rounded-xl border flex-1" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
              <button type="submit" className="px-3 py-2 rounded-xl bg-black text-white flex items-center gap-2 shadow">
                <Plus size={18} /> Add
              </button>
            </div>
          </form>
          <div className="mt-3 flex gap-2 text-xs">
            <button onClick={() => {
              const now = new Date().toISOString().slice(0,10);
              const sample = [
                { id: crypto.randomUUID(), type: 'income', amount: 1000, date: now, note: 'Salary' },
                { id: crypto.randomUUID(), type: 'expense', category: 'Groceries', amount: 200, date: now, note: 'Test grocery' },
              ];
              setTxns((prev) => [...sample, ...prev]);
            }} className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">Seed demo data</button>
            <button onClick={() => { localStorage.removeItem('expense-tracker:txns'); setTxns([]); }} className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">Clear all</button>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow p-4">
            <h3 className="font-semibold mb-2">Spending by Category</h3>
            {byCategory.length === 0 ? (
              <EmptyState label="No expenses this month" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={110}>
                      {byCategory.map((_, i) => (<Cell key={i} />))}
                    </Pie>
                    <Tooltip formatter={(v) => currency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <h3 className="font-semibold mb-2">Daily Net (Cumulative)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(v) => currency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="cumNet" name="Cumulative Net" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4">
          <h3 className="font-semibold mb-3">Transactions</h3>
          {filtered.length === 0 ? (
            <EmptyState label="No transactions for this month yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Type</th>
                    <th className="py-2 pr-2">Category</th>
                    <th className="py-2 pr-2">Note</th>
                    <th className="py-2 pr-2">Amount</th>
                    <th className="py-2 pr-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2 pr-2 whitespace-nowrap">{t.date}</td>
                      <td className="py-2 pr-2">{t.type}</td>
                      <td className="py-2 pr-2">{t.type === "income" ? "—" : t.category}</td>
                      <td className="py-2 pr-2">{t.note || ""}</td>
                      <td className="py-2 pr-2 font-medium">{currency(t.amount)}</td>
                      <td className="py-2 pr-2 text-right">
                        <button onClick={() => removeTxn(t.id)} className="p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="opacity-70 text-xs text-center">
          <p>Data is saved locally in your browser (no account needed). To upgrade to a full-stack app with auth & bank sync, ask me to scaffold it.</p>
        </footer>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, highlight }) {
  return (
    <div className={`rounded-2xl bg-white shadow p-4 ${highlight ? "ring-2 ring-emerald-400" : ""}`}>
      <div className="text-sm opacity-70">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="h-72 grid place-items-center text-gray-500 border-2 border-dashed rounded-2xl">
      {label}
    </div>
  );
}
