import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FulfillOS",
    short_name: "FulfillOS",
    description:
      "Warehouse operations for prep centers and small 3PL teams — every action proven and every exception surfaced.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#eef1f5",
    theme_color: "#162033",
    orientation: "any",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/brand/fulfillos-mark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/fulfillos-mark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
