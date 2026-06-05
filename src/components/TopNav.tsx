import { NavLink } from 'react-router-dom';
import '../styles/topnav.css';

const links = [
  { to: '/rooms', label: 'إدارة الغرف' },
  { to: '/settings', label: 'إعدادات النظام' },
  { to: '/profits', label: 'إحصائيات الأرباح' },
];

export default function TopNav() {
  return (
    <nav className="top-nav">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
