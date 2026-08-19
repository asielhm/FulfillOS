export type Locale = "en" | "es";

export const navigationMessages = {
  en: { operations: "Operations", overview: "Overview", inbound: "Inbound", inventory: "Inventory", workOrders: "Prep & Orders", outbound: "Outbound", management: "Management", customers: "Customers", products: "Products", warehouses: "Warehouses", workspace: "Workspace", reports: "Reports", settings: "Settings" },
  es: { operations: "Operaciones", overview: "Resumen", inbound: "Recepciones", inventory: "Inventario", workOrders: "Prep y órdenes", outbound: "Despachos", management: "Gestión", customers: "Clientes", products: "Productos", warehouses: "Almacenes", workspace: "Espacio de trabajo", reports: "Reportes", settings: "Configuración" },
} as const;
