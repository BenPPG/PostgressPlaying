import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/useAuth";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StoryDetail from "./pages/StoryDetail";
import StoryEditor from "./pages/StoryEditor";
import Profile from "./pages/Profile";
import AdminPanel from "./pages/AdminPanel";
import SeriesDetail from "./pages/SeriesDetail";
import SeriesManage from "./pages/SeriesManage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/search" element={<Search />} />
              <Route path="/stories/:id" element={<StoryDetail />} />
              <Route
                path="/stories/new"
                element={<ProtectedRoute><StoryEditor /></ProtectedRoute>}
              />
              <Route
                path="/stories/:id/edit"
                element={<ProtectedRoute><StoryEditor /></ProtectedRoute>}
              />
              <Route
                path="/profile"
                element={<ProtectedRoute><Profile /></ProtectedRoute>}
              />
              <Route path="/profile/:id" element={<Profile />} />
              <Route
                path="/admin"
                element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>}
              />
              <Route path="/series/:id" element={<SeriesDetail />} />
              <Route
                path="/my-series"
                element={<ProtectedRoute><SeriesManage /></ProtectedRoute>}
              />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
