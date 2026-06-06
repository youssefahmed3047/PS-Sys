import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {
  subscribeCurrentDay,
  subscribeMonthlyStats,
  subscribeDailyStats,
  subscribeExpenses,
  startNewDay,
  startNewMonth,
} from '../services/firestore';
import type { CurrentDay, MonthlyStat, DailyStat, Expense } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';
import '../styles/profits.css';

export default function Profits() {
  const [currentDay, setCurrentDay] = useState<CurrentDay>({
    beforeCosts: 0,
    afterCostsNet: 0,
    totalDiscounts: 0,
    netAfterDiscounts: 0,
    lastUpdate: new Date().toISOString(),
  });
  const [monthlyStat, setMonthlyStat] = useState<MonthlyStat | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub1 = subscribeCurrentDay(setCurrentDay);
    const unsub2 = subscribeMonthlyStats(setMonthlyStat);
    const unsub3 = subscribeDailyStats(setDailyStats);
    const unsub4 = subscribeExpenses(setExpenses);
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, []);

  const handleStartNewDay = async () => {
    await startNewDay();
    setDailyStats([]);
    navigate('/rooms');
  };

  const handleStartNewMonth = async () => {
    await startNewMonth();
    setDailyStats([]);
    navigate('/rooms');
  };

  const lastUpdate = new Date(currentDay.lastUpdate);
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, '0')}`;

  const todayExpenses = expenses
    .filter((expense) => expense.date === today)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const monthExpensesFromExpenses = expenses
    .filter((expense) => expense.date.startsWith(currentMonth) && expense.date !== today)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const monthExpenses = monthlyStat?.monthlyExpenses ?? monthExpensesFromExpenses;

  const dayNetAfterExpenses = currentDay.netAfterDiscounts - todayExpenses;
  const monthNetAfterExpenses = (monthlyStat?.netAfterDiscounts ?? 0) - monthExpenses;

  return (
    <div className="profits-layout">
      <Sidebar />

      <div className="profits-page">
        <div className="profits-header">
          <h1>إحصائيات الأرباح</h1>
          <div className="profits-actions">
            <button className="btn-new-day" onClick={handleStartNewDay}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
              بداية يوم جديد
            </button>
            <button className="btn-new-month" onClick={handleStartNewMonth}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z" />
              </svg>
              بداية شهر جديد
            </button>
          </div>
        </div>

        <div className="profits-cards">
          <div className="profit-card">
            <div className="profit-card-header">
              <div className="profit-card-title">
                <span className="profit-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
                  </svg>
                </span>
                <h2>أرباح اليوم</h2>
              </div>
            </div>

            <div className="profit-metrics">
              <div className="metric yellow">
                <div className="metric-bar" />
                <div className="metric-content">
                  <span>قبل التكاليف</span>
                  <strong>{formatNumber(currentDay.beforeCosts)} ج.م</strong>
                </div>
              </div>
              <div className="metric salmon">
                <div className="metric-bar" />
                <div className="metric-content">
                  <span>بعد التكاليف (صافي)</span>
                  <strong>{formatNumber(currentDay.afterCostsNet)} ج.م</strong>
                </div>
              </div>
              <div className="metric cyan">
                <div className="metric-bar" />
                <div className="metric-content">
                  <span>مصاريف اليوم</span>
                  <strong>{formatNumber(todayExpenses)} ج.م</strong>
                </div>
              </div>
              <div className="metric white">
                <div className="metric-bar" />
                <div className="metric-content">
                  <span>الصافي بعد المصاريف</span>
                  <strong>{formatNumber(dayNetAfterExpenses)} ج.م</strong>
                </div>
              </div>
            </div>

            <div className="profit-card-footer">
              <span>آخر تحديث: {lastUpdate.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
            </div>
          </div>

          <div className="profit-card">
            <div className="profit-card-header">
              <div className="profit-card-title">
                <span className="profit-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
                  </svg>
                </span>
                <h2>أرباح الشهر</h2>
              </div>
            </div>

            <div className="profit-metrics">
              <div className="metric yellow">
                <div className="metric-bar" />
                <div className="metric-content">
                  <span>قبل التكاليف</span>
                  <strong>{formatNumber(monthlyStat?.beforeCosts || 0)} ج.م</strong>
                </div>
              </div>
              <div className="metric salmon">
                <div className="metric-bar" />
                <div className="metric-content">
                  <span>بعد التكاليف (صافي)</span>
                  <strong>{formatNumber(monthlyStat?.afterCostsNet || 0)} ج.م</strong>
                </div>
              </div>
              <div className="metric cyan">
                <div className="metric-bar" />
                <div className="metric-content">
                  <span>مصاريف الشهر الحالية</span>
                  <strong>{formatNumber(monthExpenses)} ج.م</strong>
                </div>
              </div>
              <div className="metric white">
                <div className="metric-bar" />
                <div className="metric-content">
                  <span>الصافي بعد المصاريف</span>
                  <strong>{formatNumber(monthNetAfterExpenses)} ج.م</strong>
                </div>
              </div>
            </div>

            <div className="profit-card-footer">
              <span>
                {monthlyStat
                  ? `شهر ${monthlyStat.monthYear}`
                  : new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div className="daily-log">
          <h2>سجل الأرباح اليومية</h2>
          {dailyStats.length === 0 ? (
            <p className="log-empty">لا توجد بيانات بعد بدء شهر جديد.</p>
          ) : (
            <table className="log-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>إجمالي الأرباح</th>
                  <th>مصاريف اليوم</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((stat) => (
                  <tr key={stat.id}>
                    <td>{stat.date}</td>
                    <td className="yellow">{formatCurrency(stat.beforeCosts)}</td>
                    <td className="cyan">{formatCurrency(stat.expensesTotal ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
