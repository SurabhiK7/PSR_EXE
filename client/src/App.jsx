import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Home from './pages/Home/Home.jsx';
import CreatePSR from './pages/PSR/CreatePSR.jsx';
import UpdatePSR from './pages/PSR/UpdatePSR.jsx';
import DeletePSR from './pages/PSR/DeletePSR.jsx';
import ExistingProjects from './pages/Projects/ExistingProjects.jsx';
import ProjectDetails from './pages/Projects/ProjectDetails/ProjectDetails.jsx';
import Drafts from './pages/Drafts/Drafts.jsx';
import Reports from './pages/Reports/Reports.jsx';
import Users from './pages/Users/Users.jsx';
import AdminSettings from './pages/Admin/Settings.jsx';
import AdminPermissions from './pages/Admin/Permissions.jsx';
import Login from './pages/Auth/Login.jsx';
import Signup from './pages/Auth/Signup.jsx';
import RequireAuth from './auth/RequireAuth.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/create-psr" element={<CreatePSR />} />
          <Route path="/update-psr" element={<UpdatePSR />} />
          <Route path="/update-psr/:id" element={<UpdatePSR />} />
          <Route path="/delete-psr" element={<DeletePSR />} />
          <Route path="/projects" element={<ExistingProjects />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />
          <Route path="/drafts" element={<Drafts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/users" element={<Users />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/permissions" element={<AdminPermissions />} />
        </Route>
      </Route>
    </Routes>
  );
}
