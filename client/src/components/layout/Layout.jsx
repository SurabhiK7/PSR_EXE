import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function Layout() {
  const location = useLocation();
  return (
    <div className="pcp-app-shell">
      <Sidebar />
      <div className="pcp-main-column">
        <Header />
        <main className="pcp-content pcp-page-transition" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
