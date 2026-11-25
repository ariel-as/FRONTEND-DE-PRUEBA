import { api } from './api.model.js';

export async function confirmarCompra(carritoItems, pago = {}) {
  const productos = carritoItems.filter((i) => i.tipo !== 'plan');
  const planes = carritoItems.filter((i) => i.tipo === 'plan');
  let pedido = null;
  const inscripciones = [];
  const errores = [];
  const confirmadas = [];

  const sinStock = productos.find((p) => Number(p.stock) <= 0 || Number(p.cantidad) > Number(p.stock));
  if (sinStock) {
    const disponible = Math.max(0, Number(sinStock.stock) || 0);
    const error = {
      status: 409,
      mensaje: `Solo quedan ${disponible} unidades de ${sinStock.nombre || sinStock.id}. Revisa el carrito.`,
      detalles: [{ campo: 'items', mensaje: 'Stock insuficiente', productoId: String(sinStock.id), nombre: sinStock.nombre, disponible }]
    };
    throw error;
  }

  if (productos.length) {
    try {
      pedido = await api.post('/pedidos', {
        metodoPago: pago.metodoPago || 'EF',
        refTransferencia: pago.metodoPago === 'TR' ? (pago.refTransferencia || undefined) : undefined,
        items: productos.map((p) => ({ productoId: String(p.id), cantidad: Number(p.cantidad) }))
      }, { requiereSesion: true });
      confirmadas.push(...productos.map((p) => String(p.id)));
    } catch (error) {
      if (error.status === 401 || (error.status === 409 && (error.detalles || []).some((d) => d.campo === 'items'))) throw error;
      errores.push({ tipo: 'pedido', mensaje: error.mensaje, detalles: error.detalles, error });
    }
  }

  for (const plan of planes) {
    try {
      const ins = await api.post('/inscripciones', { membresiaId: String(plan.membresiaId || plan.id) }, { requiereSesion: true });
      inscripciones.push(ins);
      confirmadas.push(String(plan.id));
    } catch (error) {
      if (error.status === 401) throw error;
      errores.push({ tipo: 'inscripcion', plan: plan.nombre, mensaje: error.mensaje, detalles: error.detalles, error });
    }
  }

  return { pedido, inscripciones, errores, confirmadas };
}

export async function misPedidos(page = 1, limit = 10) {
  return api.get(`/pedidos/mis-pedidos?page=${page}&limit=${limit}`, { requiereSesion: true });
}
export async function misInscripciones() {
  return api.get('/inscripciones/mis-inscripciones', { requiereSesion: true });
}
export async function cancelarPedido(id) {
  return api.patch(`/pedidos/${String(id)}/cancelar`, {}, { requiereSesion: true });
}
