import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Center, Spinner } from "@chakra-ui/react";

export default function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading) return <Center p={8}><Spinner size="lg" color="purple.500" /></Center>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "ADMIN") return <Navigate to="/" replace />;

  return <>{children}</>;
}
