import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Heading,
  Text,
  Link,
  VStack,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { useAuth } from "../hooks/useAuth";
import { useColors } from "../hooks/useColors";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const c = useColors();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={12}>
      <Heading size="lg" mb={6} textAlign="center" color={c.heading}>
        Log In
      </Heading>
      <Box
        bg={c.cardBg}
        p={8}
        rounded="lg"
        borderWidth="1px"
        borderColor={c.border}
        shadow="sm"
      >
        {error && (
          <Alert status="error" mb={4} rounded="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </FormControl>
            <Button type="submit" colorScheme="purple" width="full" isLoading={loading}>
              Log In
            </Button>
          </VStack>
        </form>
        <Text mt={4} fontSize="sm" textAlign="center" color={c.subtext}>
          Don't have an account?{" "}
          <Link as={RouterLink} to="/register" color="purple.500">
            Register
          </Link>
        </Text>
      </Box>
    </Box>
  );
}
