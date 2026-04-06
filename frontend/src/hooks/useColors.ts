import { useColorModeValue } from "@chakra-ui/react";

export function useColors() {
  return {
    // Backgrounds
    pageBg: useColorModeValue("gray.50", "gray.900"),
    headerBg: useColorModeValue("white", "gray.800"),
    cardBg: useColorModeValue("white", "gray.700"),
    inputBg: useColorModeValue("white", "gray.800"),

    // Borders
    border: useColorModeValue("gray.200", "gray.600"),
    borderSubtle: useColorModeValue("gray.200", "gray.700"),

    // Text
    heading: useColorModeValue("gray.800", "gray.100"),
    text: useColorModeValue("gray.800", "gray.100"),
    subtext: useColorModeValue("gray.500", "gray.300"),
    meta: useColorModeValue("gray.400", "gray.500"),

    // Links & Nav
    link: useColorModeValue("gray.600", "gray.300"),
    linkHover: useColorModeValue("gray.900", "white"),
    accent: useColorModeValue("purple.600", "purple.300"),
    accentHover: useColorModeValue("purple.400", "purple.100"),
    accentBg: useColorModeValue("purple.500", "purple.400"),

    // Status
    error: useColorModeValue("red.500", "red.400"),

    // Hero sections (on fixed purple gradient banners)
    heroSubtext: useColorModeValue("gray.100", "gray.100"),

    // CTA button
    ctaBg: useColorModeValue("orange.400", "orange.400"),
    ctaBgHover: useColorModeValue("orange.500", "orange.500"),

    // Interactive
    hoverBg: useColorModeValue("gray.100", "gray.700"),
  };
}
