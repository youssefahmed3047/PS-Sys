import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { subscribeRooms, startSession, stopSession, getSettings } from '../services/firestore';
import type { Room } from '../types';
import '../styles/rooms.css';

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    return subscribeRooms(setRooms);
  }, []);

  const available = rooms.filter((r) => r.status === 'available').length;
  const busy = rooms.filter((r) => r.status === 'busy').length;

  const handleStart = async (room: Room, playMode: 'single' | 'multi') => {
    const settings = await getSettings();
    const sessionId = await startSession(room, playMode, settings);
    navigate(`/session/${room.id}?session=${sessionId}`);
  };

  const handleDetails = (room: Room) => {
    if (room.status === 'busy' && room.activeSessionId) {
      navigate(`/session/${room.id}?session=${room.activeSessionId}`);
    }
  };

  const handleStop = async (room: Room) => {
    if (room.activeSessionId) {
      await stopSession(room.id, room.activeSessionId);
    }
  };

  return (
    <div className="rooms-page">
      <header className="rooms-header">
        <span className="brand">بلايستيشن لاونج</span>
        <div className="header-right">
          <h1>إدارة الغرف</h1>
          <p>نظرة عامة على حالة الغرف الحالية</p>
        </div>
      </header>

      <TopNav />

      <div className="status-summary">
        <span className="status-pill available">
          <span className="dot green" />
          {available} متاح
        </span>
        <span className="status-pill busy">
          <span className="dot red" />
          {busy} مشغول
        </span>
      </div>

      <div className="rooms-grid">
        {rooms.map((room) => (
          <div key={room.id} className="room-card">
            <div className="room-card-top">
              <span className="room-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                </svg>
              </span>
              <span className="room-number">{String(room.number).padStart(2, '0')}</span>
            </div>

            <span className={`room-status ${room.status}`}>
              {room.status === 'available' ? 'متاح' : 'مشغول'}
            </span>

            <h2 className="room-name">{room.name}</h2>
            <p className="room-console">{room.consoleType}</p>
            {room.status === 'available' && <p className="room-ready">جاهزة للبدء</p>}

            <div className="room-actions">
              {room.status === 'busy' ? (
                <>
                  <button className="btn-details-outline" onClick={() => handleDetails(room)}>
                    التفاصيل
                  </button>
                  <button className="btn-stop" onClick={() => handleStop(room)}>
                    إيقاف
                  </button>
                </>
              ) : (
                <>
                  <div className="play-buttons">
                    <button
                      className="btn-play"
                      onClick={() => handleStart(room, 'single')}
                    >
                      لعب فردي
                    </button>
                    <button
                      className="btn-play"
                      onClick={() => handleStart(room, 'multi')}
                    >
                      لعب زوجي
                    </button>
                  </div>
                  <button className="btn-details-gray" onClick={() => handleDetails(room)}>
                    التفاصيل
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
