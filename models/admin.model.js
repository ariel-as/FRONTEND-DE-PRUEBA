import { api } from './api.model.js';

const qs = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') q.set(clave, String(valor));
  });
  const texto = q.toString();
  return texto ? `?${texto}` : '';
};

export const adminModel = {
  resumen: () => api.get('/admin/resumen', { requiereSesion: true }),
  productos: (params = {}) => api.get(`/admin/productos${qs(params)}`, { requiereSesion: true }),
  categorias: () => api.get('/categorias'),
  lotes: (params = {}) => api.get(`/admin/inventario/lotes${qs(params)}`, { requiereSesion: true }),
  alertasInventario: () => api.get('/admin/inventario/alertas', { requiereSesion: true }),
  kardex: (productoId) => api.get(`/admin/inventario/kardex/${encodeURIComponent(productoId)}`, { requiereSesion: true }),
  bajaLote: (loteId, observacion) => api.post(`/admin/inventario/lotes/${loteId}/baja`, { observacion }, { requiereSesion: true }),
  bloquearLote: (loteId, bloquear) => api.patch(`/admin/inventario/lotes/${loteId}/bloqueo`, { bloquear }, { requiereSesion: true }),
  reporteInventario: (params = {}) => api.get(`/admin/reportes/inventario${qs(params)}`, { requiereSesion: true })
};
