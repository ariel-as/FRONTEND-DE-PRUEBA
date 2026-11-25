import { api } from './api.model.js';

const q = (params = {}) => {
  const datos = new URLSearchParams();
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor !== '' && valor !== undefined && valor !== null) datos.set(clave, String(valor));
  });
  const texto = datos.toString();
  return texto ? `?${texto}` : '';
};

export const rutinaModel = {
  listar: (params = {}) => api.get(`/admin/rutinas${q(params)}`, { requiereSesion: true }),
  detalle: (id) => api.get(`/admin/rutinas/${encodeURIComponent(id)}`, { requiereSesion: true }),
  fichaCliente: (cedula) => api.get(`/admin/rutinas/cliente/${encodeURIComponent(cedula)}`, { requiereSesion: true }),
  plantillas: () => api.get('/admin/rutinas/plantillas', { requiereSesion: true }),
  ejercicios: () => api.get('/admin/rutinas/ejercicios', { requiereSesion: true }),
  opcionesClientes: () => api.get('/admin/tablas/cliente/opciones', { requiereSesion: true }),
  opcionesNiveles: () => api.get('/admin/tablas/nivel/opciones', { requiereSesion: true }),
  crear: (body) => api.post('/admin/rutinas', body, { requiereSesion: true }),
  editar: (id, body) => api.put(`/admin/rutinas/${encodeURIComponent(id)}`, body, { requiereSesion: true }),
  mia: () => api.get('/rutinas/mi-rutina', { requiereSesion: true })
};
