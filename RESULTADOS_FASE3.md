# Resultados Fase 3 — Frontend Planeta Fitness

## 1. Inventario y alertas

- Commit `3fd95cd`: inventario y alertas.
- Commit `c8326eb`: conservación de contratos del panel de productos.
- `models/config.js` apunta al backend local `http://localhost:5050/api/v1` y al backend público de Render en GitHub Pages.
- `models/admin.model.js` conserva los contratos existentes y agrega lotes, alertas, kárdex, bajas, bloqueos y reporte.
- `controllers/admin-inventario.controller.js` implementa filtros, paginación, FEFO/FIFO, kárdex y acciones de inventario.
- `admin/productos.html` incluye las pestañas Productos, Lotes, Alertas y Ayuda, además del diálogo de kárdex.
- El dashboard muestra tarjetas de inventario con enlaces a caducidad próxima, caducados y sin stock.
- El endpoint `/admin/inventario/alertas` se consume sin parámetros; `?dias=30` devuelve `400` en el backend.

## 2. Stock visible y control de venta

- Commit `c0c34bf`: stock visible y sin venta por encima del disponible.
- Las tarjetas de productos muestran unidades disponibles o “Agotado”; el botón de agregar se deshabilita sin stock.
- `models/carrito.model.js` expone `maximoDe` y `fijarStock`; las líneas del carrito muestran el máximo y deshabilitan “+” al llegar a él.
- `models/pedido.model.js` valida stock localmente y propaga el error `409` del backend.
- `controllers/checkout.controller.js` muestra el error por producto, ajusta la cantidad y repinta el resumen.
- `controllers/admin-productos.controller.js` muestra “Disponible” o “Agotado” en la columna Stock.

## 3. Planes por duración y ahorro

- Commit `2b51d3f`: planes por duración y ahorro.
- `views/componentes.view.js` agrega `precioPlan`, `duracionPlan`, `sufijoPrecio`, `ahorroPlan` y `agruparPlanes`; `tarjetaPlan` recibe el listado completo para calcular ahorros.
- Agrupación verificada: diario (`PDI`), mensual (`MI1`, `MI2`), trimestral (`TRI`), anual (`ANU`) e ingresos (`TAR`).
- Las tarjetas muestran duración, número de personas, precio con IVA y etiqueta de ahorro cuando aplica.
- Verificación: `TRI` muestra “Ahorras $20.00 frente a contratar mes a mes”.
- El carrito agrega planes usando `precioConIva ?? precio`.

## 4. Facturas pendientes y corrección SRI

- Commit `676603f`: facturas pendientes y corrección SRI.
- Nuevos archivos: `admin/facturas.html`, `controllers/facturas.controller.js` y `views/facturas.view.js`.
- `models/admin.model.js` agrega `facturas`, `facturasPendientes`, `generarFactura` y `actualizarSri`.
- La vista separa pendientes y emitidas, muestra el entorno simulado, el estado SRI como texto y badge, y permite paginar y filtrar.
- El diálogo de corrección valida número `NNN-NNN-999999999` y clave de 49 dígitos.
- El formulario envía `ventaId` o `inscripcionId` según el tipo y envía `numComprobante` y `claveAcceso` al `PATCH`.
- Se agregó “Facturas” a la navegación administrativa y una tarjeta al dashboard.

## 5. Fichas y editor de rutinas

- Commit `a5f8893`: fichas y editor de rutinas.
- Nuevos archivos: `admin/rutinas.html`, `cliente/mi-cuenta.html`, `cliente/mi-rutina.html`, `controllers/cuenta.controller.js`, `controllers/rutinas.controller.js`, `models/rutina.model.js` y `views/rutinas.view.js`.
- `models/rutina.model.js` centraliza todas las llamadas a rutinas, plantillas, ejercicios, opciones, ficha y rutina del cliente.
- El panel busca una ficha por cédula, lista “Mis clientes”, permite editar días y ejercicios, aplicar plantillas y guardar con `POST`/`PUT`.
- La ficha verificada para `1712345675` devolvió `Cliente Prueba`, plan `Plan individual`, rutina `#29` y el ejercicio `Sentadilla · Pierna · 3 series de 12 · descanso 60s`.
- `Mi cuenta` muestra perfil, inscripciones y resumen de rutina; `Mi rutina` renderiza `/rutinas/mi-rutina`.
- `controllers/main.controller.js` despacha `mi-cuenta` y `mi-rutina`, y ambos se agregaron a la navegación y a la lista de expiración de sesión.
- Se agregó “Rutinas” a la navegación administrativa y una tarjeta al dashboard.

## 6. Pruebas y cierre

- Backend local verificado en `http://localhost:5050/api/v1/salud`: `200 {"status":"ok","servicio":"Planeta Fitness API"}`.
- Auditoría Playwright + axe-core ejecutada contra `http://localhost:5500`, con backend local, en escritorio (1280×800) y móvil (375×812), en temas claro y oscuro.
- Etiquetas axe evaluadas: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa`.
- Flujos verificados: inicio, dashboard, inventario, facturas con perfil contadora, ficha/editor de rutinas, Mi cuenta y Mi rutina con perfil cliente.
- Comprobaciones funcionales: grupos de planes, cálculo de ahorro, tablas de productos y facturas, ficha de cliente, editor de rutina y ejercicios en Mi rutina.
- Resultado final de auditoría: `{"hallazgos":[],"errores":[]}`; sin violaciones `critical` ni `serious` y sin errores de página.
- Correcciones finales de accesibilidad: nombres accesibles de carrito y botones, contraste de botones y enlaces del panel en ambos temas, y regiones desplazables con teclado.
- `node scripts/ci-check.mjs`: `Frontend: 20 HTML, 46 JavaScript, 1 CSS`; `Validación de estructura, rutas locales e inventario de dependencias: correcta.`
- No se requirieron cambios en el backend durante esta fase; las rutas y respuestas coincidieron con el contrato documentado.
