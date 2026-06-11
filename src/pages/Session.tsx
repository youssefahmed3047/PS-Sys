import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  subscribeSession,
  subscribeProducts,
  addItemToSession,
  removeItemFromSession,
  endSessionAndPay,
  incrementSessionGameCount,
  incrementSessionExtraTimeCount,
  decrementSessionExtraTimeCount,
} from '../services/firestore';
import type { Session, Product } from '../types';
import { formatCurrency, formatTimer, formatStartDate, formatHours } from '../utils/format';
import { calculateTimeCost, calculateAddonsCost } from '../utils/calculations';
import '../styles/session.css';

export default function SessionPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session') || '';
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    return subscribeSession(sessionId, setSession);
  }, [sessionId]);

  useEffect(() => {
    return subscribeProducts(setProducts);
  }, []);

  useEffect(() => {
    if (!session) return;

    const update = () => {
      const diff = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
      setElapsed(diff);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [session]);

  if (!session) {
    return (
      <div className="session-page">
        <div className="loading-screen">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  const timeCost = session.billingMode === 'game' ? 0 : calculateTimeCost(elapsed, session.hourlyRate);
  const addonsCost = calculateAddonsCost(session.items);
  const gameCost = (session.gameCount || 0) * (session.gamePrice || 0);
  const extraTimeCost = (session.extraTimeCount || 0) * (session.extraTimePrice || 0);
  const total = timeCost + addonsCost + gameCost + extraTimeCost;
  const hours = elapsed / 3600;

  const handleAddProduct = async (product: Product) => {
    if ((product.quantity ?? 0) <= 0) return;
    await addItemToSession(sessionId, {
      productId: product.id,
      name: product.name,
      category: product.category,
      quantity: 1,
      price: product.sellingPrice,
    });
    setShowAddModal(false);
  };

  const handleRemoveItem = async (productId: string) => {
    await removeItemFromSession(sessionId, productId);
  };

  const handleIncrementGameCount = async () => {
    await incrementSessionGameCount(sessionId);
  };

  const handleIncrementExtraTime = async () => {
    await incrementSessionExtraTimeCount(sessionId);
  };

  const handleDecrementExtraTime = async () => {
    await decrementSessionExtraTimeCount(sessionId);
  };

  const handleEndSession = () => {
    setShowBillModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!roomId) return;
    setEnding(true);
    await endSessionAndPay(sessionId, roomId);
    navigate('/rooms');
  };

  const consoleLabel =
    session.consoleType === 'PS5' ? 'بلايستيشن 5' : 'بلايستيشن 4';

  return (
    <div className="session-page">
      <header className="session-top-bar">
        <span className="brand">بلايستيشن لاونج</span>
        <span className="brand">بلايستيشن لاونج</span>
      </header>

      <div className="session-header">
        <div className="session-top-row">
          <span className="start-date">تاريخ البدء: {formatStartDate(session.startTime)}</span>
          <button className="btn-add-item" onClick={handleIncrementGameCount}>
            لعب جيم
          </button>
        </div>
        <div className="session-info">
          <h1>{session.roomName}</h1>
          <p>
            <span className="active-dot" />
            جلسة نشطة • {session.billingMode === 'game' ? 'محاسبة بالجيم' : 'محاسبة بالوقت'} • {consoleLabel}
          </p>
          <p className="game-count">عدد الجيمات: {session.gameCount ?? 0}</p>
        </div>
      </div>

      <div className="timer-section">
        <div className="timer-card">
          {session.billingMode === 'game' ? (
            <div className="game-mode-counters">
              <div className="counter-column">
                <p className="timer-label">عدد الماتشات الملعوبة</p>
                <div className="timer-display">{session.gameCount ?? 0}</div>
                <button className="btn-add-match" onClick={handleIncrementGameCount}>
                  إضافة ماتش آخر
                </button>
              </div>
              <div className="counter-column border-right">
                <p className="timer-label">الوقت الإضافي</p>
                <div className="timer-display">{session.extraTimeCount ?? 0}</div>
                <div className="extra-time-actions">
                  <button className="btn-add-extra" onClick={handleIncrementExtraTime}>
                    + إضافة وقت
                  </button>
                  {(session.extraTimeCount ?? 0) > 0 && (
                    <button className="btn-remove-extra" onClick={handleDecrementExtraTime}>
                      - تقليل
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="timer-label">الوقت المنقضي</p>
              <div className="timer-display">{formatTimer(elapsed)}</div>
            </>
          )}
          <div className="cost-boxes">
            <div className="cost-box">
              <span>{session.billingMode === 'game' ? 'تكلفة الجيمات والوقت' : 'تكلفة الوقت'}</span>
              <strong>{session.billingMode === 'game' ? formatCurrency(gameCost + extraTimeCost) : formatCurrency(timeCost)}</strong>
            </div>
            <div className="cost-box">
              <span>تكلفة الإضافات</span>
              <strong>{formatCurrency(addonsCost)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="session-bottom">
        <div className="account-summary">
          <h3>ملخص الحساب</h3>
          {session.billingMode !== 'game' && (
            <>
              <div className="summary-row">
                <span>سعر الساعة {session.isVIP ? '(VIP)' : ''}</span>
                <span>{formatCurrency(session.hourlyRate)}</span>
              </div>
              <div className="summary-row">
                <span>الوقت ({formatHours(hours)} ساعة)</span>
                <span>{formatCurrency(timeCost)}</span>
              </div>
            </>
          )}
          <div className="summary-row">
            <span>الإضافات</span>
            <span>{formatCurrency(addonsCost)}</span>
          </div>
          <div className="summary-row">
            <span>تكلفة الجيمات</span>
            <span>{formatCurrency(gameCost)}</span>
          </div>
          {session.billingMode === 'game' && (session.extraTimeCount ?? 0) > 0 && (
            <div className="summary-row">
              <span>الوقت الإضافي (x{session.extraTimeCount})</span>
              <span>{formatCurrency(extraTimeCost)}</span>
            </div>
          )}
          <div className="summary-row total">
            <span>الإجمالي</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <button className="btn-end-session" onClick={handleEndSession}>
            {session.billingMode === 'game' ? 'إنهاء الجلسة والدفع' : 'إنهاء الوقت والدفع'}
          </button>
        </div>

        <div className="orders-section">
          <div className="orders-header">
            <h3>الطلبات والإضافات</h3>
            <button className="btn-add-item" onClick={() => setShowAddModal(true)}>
              + إضافة صنف
            </button>
          </div>

          <div className="orders-list">
            {session.items.map((item) => (
              <div key={item.productId} className="order-item">
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveItem(item.productId)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </button>
                <div className="order-info">
                  <strong>
                    {item.name} (x{item.quantity})
                  </strong>
                  <span>{item.category}</span>
                </div>
                <span className="order-price">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>إضافة صنف</h3>
            <div className="product-list">
              {products.map((product) => (
                <button
                  key={product.id}
                  className="product-item"
                  onClick={() => handleAddProduct(product)}
                  disabled={(product.quantity ?? 0) <= 0}
                >
                  <span>
                    {product.name}
                    <small> - متوفر {product.quantity ?? 0}</small>
                  </span>
                  <span>{formatCurrency(product.sellingPrice)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showBillModal && (
        <div className="modal-overlay" onClick={() => !ending && setShowBillModal(false)}>
          <div className="bill-modal" onClick={(e) => e.stopPropagation()}>
            <h3>حساب الغرفة</h3>
            <p className="bill-room-name">{session.roomName}</p>

            <div className="bill-details">
              <div className="bill-row">
                <span>الوقت المنقضي</span>
                <span>{formatTimer(elapsed)}</span>
              </div>
              {session.billingMode !== 'game' && (
                <>
                  <div className="bill-row">
                    <span>سعر الساعة {session.isVIP ? '(VIP)' : ''}</span>
                    <span>{formatCurrency(session.hourlyRate)}</span>
                  </div>
                  <div className="bill-row">
                    <span>الوقت ({formatHours(hours)} ساعة)</span>
                    <span>{formatCurrency(timeCost)}</span>
                  </div>
                </>
              )}
              <div className="bill-row">
                <span>الإضافات</span>
                <span>{formatCurrency(addonsCost)}</span>
              </div>
              <div className="bill-row">
                <span>عدد الجيمات</span>
                <span>{session.gameCount}</span>
              </div>
              <div className="bill-row">
                <span>تكلفة الجيمات</span>
                <span>{formatCurrency(gameCost)}</span>
              </div>
              {session.billingMode === 'game' && (session.extraTimeCount ?? 0) > 0 && (
                <div className="bill-row">
                  <span>الوقت الإضافي (x{session.extraTimeCount})</span>
                  <span>{formatCurrency(extraTimeCost)}</span>
                </div>
              )}
              {session.items.length > 0 && (
                <div className="bill-items">
                  {session.items.map((item) => (
                    <div key={item.productId} className="bill-item">
                      <span>
                        {item.name} (x{item.quantity})
                      </span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="bill-row total">
                <span>الإجمالي</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="bill-actions">
              <button
                className="btn-confirm-pay"
                onClick={handleConfirmPayment}
                disabled={ending}
              >
                {ending ? 'جاري التأكيد...' : 'تأكيد الدفع'}
              </button>
              <button
                className="btn-cancel-bill"
                onClick={() => setShowBillModal(false)}
                disabled={ending}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
