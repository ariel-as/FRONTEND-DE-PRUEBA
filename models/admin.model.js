import { api } from './api.model.js';

const q = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') sp.set(k, v); });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const adminModel = {
  resumen: () => api.get('/admin/resumen', { requiereSesion: true }),
  productos: (params) => api.get(`/admin/productos${q(params)}`, { requiereSesion: true }),
  crearProducto: (body) => api.post('/productos', body, { requiereSesion: true }),
  editarProducto: (id, body) => api.put(`/productos/${encodeURIComponent(id)}`, body, { requiereSesion: true }),
  desactivarProducto: (id) => api.delete(`/productos/${encodeURIComponent(id)}`, { requiereSesion: true }),
  categorias: () => api.get('/categorias'),
  pedidos: (params) => api.get(`/pedidos${q(params)}`, { requiereSesion: true }),
  cambiarEstadoPedido: (id, body) => api.patch(`/pedidos/${encodeURIComponent(id)}/estado`, body, { requiereSesion: true }),
  crearUsuario: (body) => api.post('/admin/usuarios', body, { requiereSesion: true }),
  estadoUsuario: (id, body) => api.patch(`/admin/usuarios/${encodeURIComponent(id)}/estado`, body, { requiereSesion: true }),
  tablas: () => api.get('/admin/tablas', { requiereSesion: true }),
  tablaMeta: (tabla) => api.get(`/admin/tablas/${encodeURIComponent(tabla)}/meta`, { requiereSesion: true }),
  tablaOpciones: (tabla) => api.get(`/admin/tablas/${encodeURIComponent(tabla)}/opciones`, { requiereSesion: true }),
  tablaFilas: (tabla, params) => api.get(`/admin/tablas/${encodeURIComponent(tabla)}${q(params)}`, { requiereSesion: true }),
  tablaFila: (tabla, id) => api.get(`/admin/tablas/${encodeURIComponent(tabla)}/${encodeURIComponent(id)}`, { requiereSesion: true }),
  tablaCrear: (tabla, body) => api.post(`/admin/tablas/${encodeURIComponent(tabla)}`, body, { requiereSesion: true }),
  tablaEditar: (tabla, id, body) => api.put(`/admin/tablas/${encodeURIComponent(tabla)}/${encodeURIComponent(id)}`, body, { requiereSesion: true }),
  tablaEliminar: (tabla, id) => api.delete(`/admin/tablas/${encodeURIComponent(tabla)}/${encodeURIComponent(id)}`, { requiereSesion: true }),
  pedido: (id) => api.get(`/pedidos/${encodeURIComponent(id)}`, { requiereSesion: true }),
  lotes: (params = {}) => api.get(`/admin/inventario/lotes${q(params)}`, { requiereSesion: true }),
  alertasInventario: () => api.get('/admin/inventario/alertas', { requiereSesion: true }),
  kardex: (productoId) => api.get(`/admin/inventario/kardex/${encodeURIComponent(productoId)}`, { requiereSesion: true }),
  bajaLote: (loteId, observacion) => api.post(`/admin/inventario/lotes/${loteId}/baja`, { observacion }, { requiereSesion: true }),
  bloquearLote: (loteId, bloquear) => api.patch(`/admin/inventario/lotes/${loteId}/bloqueo`, { bloquear }, { requiereSesion: true }),
  reporteInventario: (params = {}) => api.get(`/admin/reportes/inventario${q(params)}`, { requiereSesion: true })
};
