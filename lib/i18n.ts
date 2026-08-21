export type Locale = "en" | "es";

export const navigationMessages = {
  en: { operations: "Operations", overview: "Overview", floorMode: "Floor Mode", controlTower: "Control Tower", revenueProtection: "Revenue Protection", inbound: "Inbound", inventory: "Inventory", workOrders: "Prep & Orders", outbound: "Outbound", scanner: "Scanner Setup", management: "Management", customers: "Customers", products: "Products", warehouses: "Warehouses", clientPortal: "Client Portal", workspace: "Workspace", team: "Team", reports: "Reports", settings: "Settings" },
  es: { operations: "Operaciones", overview: "Resumen", floorMode: "Modo Piso", controlTower: "Torre de Control", revenueProtection: "Protección de Ingresos", inbound: "Recepciones", inventory: "Inventario", workOrders: "Prep y órdenes", outbound: "Despachos", scanner: "Configurar scanner", management: "Gestión", customers: "Clientes", products: "Productos", warehouses: "Almacenes", clientPortal: "Portal de clientes", workspace: "Espacio de trabajo", team: "Personal", reports: "Reportes", settings: "Configuración" },
} as const;
