import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EventListPage from './pages/events/EventListPage.jsx';
import EventDetailPage from './pages/events/EventDetailPage.jsx';
import RouletteResultPage from './pages/events/RouletteResultPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import SignupPage from './pages/auth/SignupPage.jsx';
import MyEntriesPage from './pages/mypage/MyEntriesPage.jsx';
import MyProfilePage from './pages/mypage/MyProfilePage.jsx';
import AdminLoginPage from './pages/admin/AdminLoginPage.jsx';
import AdminEventListPage from './pages/admin/AdminEventListPage.jsx';
import AdminEventFormPage from './pages/admin/AdminEventFormPage.jsx';
import AdminEntryListPage from './pages/admin/AdminEntryListPage.jsx';
import NotFoundPage from './pages/common/NotFoundPage.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import RequireAuth from './components/RequireAuth.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 참여자 경로 */}
        <Route path="/" element={<EventListPage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        <Route path="/events/:eventId/result" element={<RouletteResultPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/mypage" element={<MyEntriesPage />} />
          <Route path="/mypage/profile" element={<MyProfilePage />} />
        </Route>

        {/* 관리자 경로 */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route element={<RequireAdmin />}>
          <Route path="/admin/events" element={<AdminEventListPage />} />
          <Route path="/admin/events/new" element={<AdminEventFormPage />} />
          <Route path="/admin/events/:eventId/edit" element={<AdminEventFormPage />} />
          <Route path="/admin/events/:eventId/entries" element={<AdminEntryListPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
