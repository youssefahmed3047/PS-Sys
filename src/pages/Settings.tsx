import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import {
  subscribeSettings,
  subscribeRooms,
  subscribeProducts,
  saveSettings,
  addRoom,
  updateRoom,
  addProduct,
  updateProduct,
  deleteProduct,
} from '../services/firestore';
import type { Settings as SettingsType, Room, Product } from '../types';
import '../styles/settings.css';

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType>({
    ps5Single: 50,
    ps5Multi: 70,
    ps4Single: 30,
    ps4Multi: 45,
    totalRooms: 12,
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [originalSettings, setOriginalSettings] = useState<SettingsType | null>(null);

  useEffect(() => {
    const unsub1 = subscribeSettings((s) => {
      setSettings(s);
      setOriginalSettings(s);
    });
    const unsub2 = subscribeRooms(setRooms);
    const unsub3 = subscribeProducts(setProducts);
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const handleSave = async () => {
    await saveSettings(settings);
    setOriginalSettings(settings);
  };

  const handleCancel = () => {
    if (originalSettings) setSettings(originalSettings);
  };

  const handleAddRoom = async () => {
    const nextNumber = rooms.length + 1;
    await addRoom({
      name: `غرفة ${nextNumber}`,
      number: nextNumber,
      status: 'available',
      isVIP: false,
      consoleType: 'PS5',
      icon: 'gamepad',
      order: nextNumber,
    });
  };

  const handleAddProduct = async () => {
    await addProduct({
      name: 'منتج جديد',
      sellingPrice: 0,
      category: 'عام',
    });
  };

  return (
    <div className="settings-layout">
      <Sidebar />

      <div className="settings-page">
        <header className="settings-header">
          <span className="brand">بلايستيشن لاونج</span>
        </header>

        <div className="settings-content">
          <div className="page-title">
            <h1>إعدادات النظام</h1>
            <p>تعديل أسعار الغرف والمنتجات وإدارة الأجهزة</p>
          </div>

          <div className="settings-card">
            <div className="card-header">
              <div className="card-title">
                <span className="card-icon pink">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
                  </svg>
                </span>
                <h2>أسعار الفئات</h2>
              </div>
            </div>

            <div className="price-grid">
              <div className="price-field">
                <label>PS5 Single (ساعة)</label>
                <div className="price-input">
                  <input
                    type="number"
                    value={settings.ps5Single}
                    onChange={(e) =>
                      setSettings({ ...settings, ps5Single: Number(e.target.value) })
                    }
                  />
                  <span>ج.م</span>
                </div>
              </div>
              <div className="price-field">
                <label>PS5 Multi (ساعة)</label>
                <div className="price-input">
                  <input
                    type="number"
                    value={settings.ps5Multi}
                    onChange={(e) =>
                      setSettings({ ...settings, ps5Multi: Number(e.target.value) })
                    }
                  />
                  <span>ج.م</span>
                </div>
              </div>
              <div className="price-field">
                <label>PS4 Single (ساعة)</label>
                <div className="price-input">
                  <input
                    type="number"
                    value={settings.ps4Single}
                    onChange={(e) =>
                      setSettings({ ...settings, ps4Single: Number(e.target.value) })
                    }
                  />
                  <span>ج.م</span>
                </div>
              </div>
              <div className="price-field">
                <label>PS4 Multi (ساعة)</label>
                <div className="price-input">
                  <input
                    type="number"
                    value={settings.ps4Multi}
                    onChange={(e) =>
                      setSettings({ ...settings, ps4Multi: Number(e.target.value) })
                    }
                  />
                  <span>ج.م</span>
                </div>
              </div>
              <div className="price-field full">
                <label>إجمالي عدد الغرف</label>
                <div className="price-input">
                  <input
                    type="number"
                    value={settings.totalRooms}
                    onChange={(e) =>
                      setSettings({ ...settings, totalRooms: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="settings-card">
            <div className="card-header">
              <div className="card-title">
                <span className="card-icon pink">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                </span>
                <h2>إدارة الغرف</h2>
              </div>
              <button className="btn-add" onClick={handleAddRoom}>
                + إضافة غرفة
              </button>
            </div>

            <div className="rooms-list">
              {rooms.map((room) => (
                <div key={room.id} className="room-setting-card">
                  <div className="room-setting-header">
                    <span>{room.name}</span>
                    {room.isVIP && <span className="vip-badge">VIP</span>}
                  </div>
                  <select
                    value={room.consoleType}
                    onChange={(e) =>
                      updateRoom(room.id, {
                        consoleType: e.target.value as Room['consoleType'],
                      })
                    }
                  >
                    <option value="PS5">PS5</option>
                    <option value="PS4">PS4</option>
                  </select>
                  <label className="vip-checkbox">
                    <input
                      type="checkbox"
                      checked={room.isVIP}
                      onChange={(e) =>
                        updateRoom(room.id, {
                          isVIP: e.target.checked,
                          vipPrice: e.target.checked ? room.vipPrice || 45 : undefined,
                        })
                      }
                    />
                    حالة VIP
                  </label>
                  {room.isVIP && (
                    <div className="vip-price-field">
                      <label>سعر VIP (ساعة)</label>
                      <div className="price-input">
                        <input
                          type="number"
                          value={room.vipPrice ?? ''}
                          onChange={(e) =>
                            updateRoom(room.id, { vipPrice: Number(e.target.value) })
                          }
                          placeholder="أدخل سعر VIP"
                        />
                        <span>ج.م</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="settings-card">
            <div className="card-header">
              <div className="card-title">
                <span className="card-icon pink">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </span>
                <h2>إدارة المنتجات</h2>
              </div>
              <button className="btn-add" onClick={handleAddProduct}>
                + منتج جديد
              </button>
            </div>

            <table className="products-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>سعر البيع</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <input
                        className="table-input"
                        value={product.name}
                        onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="table-input price"
                        type="number"
                        value={product.sellingPrice}
                        onChange={(e) =>
                          updateProduct(product.id, { sellingPrice: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="btn-delete"
                        onClick={() => deleteProduct(product.id)}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="settings-actions">
            <button className="btn-save" onClick={handleSave}>
              حفظ الإعدادات
            </button>
            <button className="btn-cancel" onClick={handleCancel}>
              إلغاء التغييرات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
