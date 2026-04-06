import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Center, Spinner } from "@chakra-ui/react";
import { useColors } from "../hooks/useColors";

export default function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAuth();
  const c = useColors();

  if (loading) return <Center p={8}><Spinner size="lg" color={c.accent} /></Center>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "ADMIN") return <Navigate to="/" replace />;

  return <>{children}</>;
}
