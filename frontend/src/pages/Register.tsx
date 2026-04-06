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

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const c = useColors();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await register(email, username, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={12}>
      <Heading size="lg" mb={6} textAlign="center" color={c.heading}>
        Create Account
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
              <FormLabel>Username</FormLabel>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </FormControl>
            <Button type="submit" colorScheme="purple" width="full" isLoading={loading}>
              Register
            </Button>
          </VStack>
        </form>
        <Text mt={4} fontSize="sm" textAlign="center" color={c.subtext}>
          Already have an account?{" "}
          <Link as={RouterLink} to="/login" color={c.accent}>
            Log in
          </Link>
        </Text>
      </Box>
    </Box>
  );
}
