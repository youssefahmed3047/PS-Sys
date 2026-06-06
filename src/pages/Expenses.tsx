import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { subscribeExpenses, subscribeMonthlyStats, addExpense, deleteExpense } from '../services/firestore';
import type { Expense, MonthlyStat } from '../types';
import { formatCurrency } from '../utils/format';
import '../styles/profits.css';

export default function Expenses() {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlyStat, setMonthlyStat] = useState<MonthlyStat | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubExpenses = subscribeExpenses(setExpenses);
    const unsubMonthly = subscribeMonthlyStats(setMonthlyStat);
    return () => {
      unsubExpenses();
      unsubMonthly();
    };
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const todayExpenses = expenses
    .filter((expense) => expense.date === today)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const monthExpensesFromExpenses = expenses
    .filter((expense) => expense.date.startsWith(currentMonth) && expense.date !== today)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const monthExpenses = monthlyStat?.monthlyExpenses ?? monthExpensesFromExpenses;

  const handleAddExpense = async () => {
    setError('');
    const trimmedTitle = title.trim();
    const value = Number(amount);

    if (!trimmedTitle) {
      setError('اكتب اسم الفاتورة.');
      return;
    }
    if (!value || value <= 0) {
      setError('اكتب مبلغ صالح أكبر من صفر.');
      return;
    }

    setSaving(true);
    try {
      await addExpense({
        title: trimmedTitle,
        amount: value,
        date: today,
      });
      setTitle('');
      setAmount('');
    } catch (err) {
      setError('فشل إضافة المصروف. حاول مرة أخرى.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expenseId: string) => {
    await deleteExpense(expenseId);
  };

  return (
    <div className="profits-layout">
      <Sidebar />

      <div className="profits-page">
        <div className="profits-header">
          <div>
            <h1>إضافة المصروفات</h1>
            <p>أدخل فاتورة المصروفات وسوف تخصم من صافي الأرباح.</p>
          </div>
          <div className="profits-actions">
            <button className="btn-new-month" onClick={handleAddExpense} disabled={saving}>
              {saving ? 'جارٍ الإضافة...' : '+ إضافة مصروف'}
            </button>
          </div>
        </div>

        <div className="profits-cards">
          <div className="profit-card">
            <div className="profit-card-header">
              <div className="profit-card-title">
                <span className="profit-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 14H7V7h10v10z" />
                  </svg>
                </span>
                <h2>مصروفات اليوم</h2>
              </div>
            </div>

            <div className="profit-metrics">
              <div className="metric white">
                <div className="metric-bar" />
                <div className="metric-content">
                  <span>مجموع مصروفات اليوم</span>
                  <strong>{formatCurrency(todayExpenses)} ج.م</strong>
                </div>
              </div>
              <div className="metric cyan">
                <div className="metric-bar" />
                <div className="metric-content">
                  <span>المصاريف الشهرية الحالية</span>
                  <strong>{formatCurrency(monthExpenses)} ج.م</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="profit-card">
            <div className="profit-card-header">
              <div className="profit-card-title">
                <span className="profit-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M6 2h12v2H6V2zm0 6h12v2H6V8zm0 6h12v2H6v-2zm0 6h12v2H6v-2z" />
                  </svg>
                </span>
                <h2>بيانات المصروفات</h2>
              </div>
            </div>
            <div className="profit-card-footer" style={{ flexDirection: 'column', gap: '0.75rem', alignItems: 'stretch' }}>
              {error && <div className="settings-error">{error}</div>}
              <div className="price-field">
                <label>اسم الفاتورة</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: فاتورة الكهربا"
                />
              </div>
              <div className="price-field">
                <label>المبلغ</label>
                <div className="price-input">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="مثال: 200"
                  />
                  <span>ج.م</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="daily-log">
          <h2>سجل المصروفات</h2>
          <table className="log-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الفاتورة</th>
                <th>المبلغ</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.date}</td>
                  <td>{expense.title}</td>
                  <td className="cyan">{formatCurrency(expense.amount)}</td>
                  <td>
                    <button className="btn-delete" onClick={() => handleDelete(expense.id)}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
