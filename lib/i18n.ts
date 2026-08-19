export type Locale = "en" | "es";

export const navigationMessages = {
  en: { operations: "Operations", overview: "Overview", controlTower: "Control Tower", inbound: "Inbound", inventory: "Inventory", workOrders: "Prep & Orders", outbound: "Outbound", scanner: "Scanner Setup", management: "Management", customers: "Customers", products: "Products", warehouses: "Warehouses", clientPortal: "Client Portal", workspace: "Workspace", reports: "Reports", settings: "Settings" },
  es: { operations: "Operaciones", overview: "Resumen", controlTower: "Torre de Control", inbound: "Recepciones", inventory: "Inventario", workOrders: "Prep y órdenes", outbound: "Despachos", scanner: "Configurar scanner", management: "Gestión", customers: "Clientes", products: "Productos", warehouses: "Almacenes", clientPortal: "Portal de clientes", workspace: "Espacio de trabajo", reports: "Reportes", settings: "Configuración" },
} as const;
