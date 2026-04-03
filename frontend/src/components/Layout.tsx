import { Link as RouterLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Toaster } from "sonner";
import {
  Box,
  Flex,
  HStack,
  Link,
  Button,
  Text,
  Container,
  IconButton,
  useColorMode,
} from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { useColors } from "../hooks/useColors";

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { colorMode, toggleColorMode } = useColorMode();
  const c = useColors();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Box minH="100vh" bg={c.pageBg} color={c.text} display="flex" flexDirection="column">
      <Toaster position="top-right" richColors />
      <Box as="header" bg={c.headerBg} borderBottomWidth="1px" borderColor={c.borderSubtle} shadow="sm">
        <Container maxW="6xl" py={3}>
          <Flex align="center" justify="space-between">
            <Link as={RouterLink} to="/" fontSize="xl" fontWeight="bold" color="purple.500" _hover={{ color: "purple.400", textDecoration: "none" }}>
              📖 Short Stories
            </Link>
            <HStack spacing={2} fontSize="sm">
              <IconButton
                size="sm"
                aria-label={colorMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
                icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                variant="ghost"
                color={c.link}
                _hover={{ bg: c.hoverBg }}
              />
              <Link as={RouterLink} to="/" color={c.link} _hover={{ color: c.linkHover }}>
                Browse
              </Link>
              {user ? (
                <>
                  <Link as={RouterLink} to="/stories/new" color="purple.500" fontWeight="medium" _hover={{ color: "purple.400" }}>
                    ✍️ Write
                  </Link>
                  <Link as={RouterLink} to="/profile" color={c.link} _hover={{ color: c.linkHover }}>
                    {user.username}
                  </Link>
                  {isAdmin && (
                    <Link as={RouterLink} to="/admin" color="red.400" fontWeight="medium" _hover={{ color: "red.300" }}>
                      Admin
                    </Link>
                  )}
                  <Button size="sm" variant="ghost" onClick={handleLogout} color={c.link} _hover={{ bg: c.hoverBg }}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link as={RouterLink} to="/login" color={c.link} _hover={{ color: c.linkHover }}>
                    Login
                  </Link>
                  <Button as={RouterLink} to="/register" size="sm" colorScheme="purple">
                    Register
                  </Button>
                </>
              )}
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container as="main" maxW="6xl" flex="1" py={6}>
        <Outlet />
      </Container>

      <Box as="footer" borderTopWidth="1px" borderColor={c.borderSubtle} bg={c.headerBg} py={4} textAlign="center">
        <Text fontSize="sm" color={c.subtext}>
          Short Stories Repository &copy; {new Date().getFullYear()}
        </Text>
      </Box>
    </Box>
  );
}
