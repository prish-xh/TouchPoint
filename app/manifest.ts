import type { MetadataRoute } from "next";

// Lets the demo phone "Add to Home Screen" with the Touchpoint name and icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Touchpoint",
    short_name: "Touchpoint",
    description: "Any appliance, your way.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF7EE",
    theme_color: "#C2410C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
