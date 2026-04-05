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
  Image,
  useColorMode,
} from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { FaPenNib } from "react-icons/fa";
import logo from "../assets/logo.svg";
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
      <Box
        as="header"
        bg={c.headerBg}
        borderBottomWidth="1px"
        borderColor={c.borderSubtle}
        shadow="sm"
        position="sticky"
        top="0"
        zIndex="sticky"
        backdropFilter="saturate(180%) blur(8px)"
      >
        <Container maxW="6xl" py={4}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
            <Link
              as={RouterLink}
              to="/"
              display="inline-flex"
              alignItems="center"
              fontSize="2xl"
              fontWeight="bold"
              color="purple.500"
              _hover={{ color: "purple.400", textDecoration: "none" }}
            >
              <Image src={logo} alt="Novara logo" boxSize={14} objectFit="contain" mr={4} />
              <Box>
                <Text fontSize="2xl">Novara</Text>
                <Text fontSize="sm" color={c.subtext} mt={1}>
                  Read, write, and share short fiction
                </Text>
              </Box>
            </Link>

            <HStack spacing={2} fontSize="sm" flexWrap="wrap" alignItems="center">
              <IconButton
                size="sm"
                aria-label={colorMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
                icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                variant="ghost"
                color={c.link}
                _hover={{ bg: c.hoverBg }}
              />
              <Button as={RouterLink} to="/" variant="ghost" size="sm" color={c.link} _hover={{ bg: c.hoverBg }}>
                Browse
              </Button>
              {user ? (
                <>
                  <Button
                    as={RouterLink}
                    to="/stories/new"
                    size="sm"
                    colorScheme="purple"
                    variant="solid"
                    leftIcon={<FaPenNib />}
                  >
                    Write
                  </Button>
                  <Link as={RouterLink} to="/profile" color={c.link} _hover={{ color: c.linkHover }}>
                    {user.username}
                  </Link>
                  {isAdmin && (
                    <Button as={RouterLink} to="/admin" size="sm" colorScheme="red" variant="outline">
                      Admin
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={handleLogout} color={c.link} _hover={{ bg: c.hoverBg }}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button as={RouterLink} to="/login" size="sm" variant="ghost" color={c.link} _hover={{ bg: c.hoverBg }}>
                    Login
                  </Button>
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
