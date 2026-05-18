export type Variant = {
  id: string
  title: string
  sku: string
  price: number
  compareAtPrice?: number
}

export type Product = {
  id: string
  handle: string
  title: string
  subtitle: string
  description: string
  collection: string
  type: string
  thumbnail: string
  variants: Variant[]
}

export const products: Product[] = [
  {
    id: "prod_aether_hoodie",
    handle: "aether-pullover-hoodie",
    title: "Aether Pullover Hoodie",
    subtitle: "Cloud-weight French terry",
    description:
      "A weightless French terry hoodie cut for layering. Brushed interior, dropped shoulders, ribbed cuffs.",
    collection: "Spring Essentials",
    type: "Apparel",
    thumbnail: "https://picsum.photos/seed/aether-hoodie/640/640",
    variants: [
      { id: "var_aether_hoodie_s", title: "S / Mist", sku: "AET-HOOD-S", price: 84 },
      { id: "var_aether_hoodie_m", title: "M / Mist", sku: "AET-HOOD-M", price: 84 },
      { id: "var_aether_hoodie_l", title: "L / Mist", sku: "AET-HOOD-L", price: 84 },
    ],
  },
  {
    id: "prod_kasai_kettle",
    handle: "kasai-electric-kettle",
    title: "Kasai Pour-Over Kettle",
    subtitle: "Variable-temp, gooseneck spout",
    description:
      "A precision pour-over kettle for the morning ritual. 0.9L stainless body, 1°C control between 40–100°C.",
    collection: "Home & Kitchen",
    type: "Home",
    thumbnail: "https://picsum.photos/seed/kasai-kettle/640/640",
    variants: [
      {
        id: "var_kasai_kettle_matte",
        title: "Matte Black",
        sku: "KAS-KETT-MB",
        price: 159,
        compareAtPrice: 189,
      },
      {
        id: "var_kasai_kettle_white",
        title: "Cloud White",
        sku: "KAS-KETT-CW",
        price: 159,
      },
    ],
  },
  {
    id: "prod_ferris_runners",
    handle: "ferris-trail-runners",
    title: "Ferris Trail Runners",
    subtitle: "All-day cushioning, all-terrain grip",
    description:
      "A do-everything trail runner with a sticky rubber outsole, breathable engineered mesh, and 32mm of foam.",
    collection: "Spring Essentials",
    type: "Footwear",
    thumbnail: "https://picsum.photos/seed/ferris-runners/640/640",
    variants: [
      { id: "var_ferris_8", title: "Size 8 / Slate", sku: "FRR-RUN-8", price: 142 },
      { id: "var_ferris_9", title: "Size 9 / Slate", sku: "FRR-RUN-9", price: 142 },
      { id: "var_ferris_10", title: "Size 10 / Slate", sku: "FRR-RUN-10", price: 142 },
    ],
  },
  {
    id: "prod_okapi_carryon",
    handle: "okapi-carryon-bag",
    title: "Okapi Carry-On",
    subtitle: "38L, weatherproof, lifetime warranty",
    description:
      "An expanding carry-on built for two weeks abroad. Sailcloth shell, hidden laptop sleeve, lay-flat clamshell.",
    collection: "Travel",
    type: "Bags",
    thumbnail: "https://picsum.photos/seed/okapi-carryon/640/640",
    variants: [
      { id: "var_okapi_olive", title: "Olive", sku: "OKP-CO-OL", price: 268 },
      { id: "var_okapi_clay", title: "Clay", sku: "OKP-CO-CL", price: 268 },
    ],
  },
  {
    id: "prod_meridian_mug",
    handle: "meridian-ceramic-mug",
    title: "Meridian Ceramic Mug",
    subtitle: "Handthrown stoneware, 12oz",
    description:
      "A heavy-bottomed stoneware mug with a satin reactive glaze. Microwave and dishwasher safe.",
    collection: "Home & Kitchen",
    type: "Home",
    thumbnail: "https://picsum.photos/seed/meridian-mug/640/640",
    variants: [
      { id: "var_meridian_indigo", title: "Indigo", sku: "MER-MUG-IN", price: 28 },
      { id: "var_meridian_oat", title: "Oat", sku: "MER-MUG-OT", price: 28 },
    ],
  },
  {
    id: "prod_kestrel_lamp",
    handle: "kestrel-task-lamp",
    title: "Kestrel Task Lamp",
    subtitle: "Magnetic head, warm CRI-95 LED",
    description:
      "A magnetically articulated task lamp with stepless dimming and full-spectrum warm white LEDs.",
    collection: "Workspace",
    type: "Home",
    thumbnail: "https://picsum.photos/seed/kestrel-lamp/640/640",
    variants: [
      { id: "var_kestrel_charcoal", title: "Charcoal", sku: "KST-LMP-CH", price: 215 },
      { id: "var_kestrel_brass", title: "Brushed Brass", sku: "KST-LMP-BR", price: 245 },
    ],
  },
]

export const shippingOptions = [
  { id: "so_standard", name: "Standard Shipping (3-5 days)", amount: 6 },
  { id: "so_express", name: "Express (1-2 days)", amount: 18 },
  { id: "so_pickup", name: "In-store Pickup", amount: 0 },
]
