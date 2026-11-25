import { escapar } from './componentes.view.js';
import { formatearPrecio } from '../models/carrito.model.js';
import { paginacionAdmin } from './admin.view.js';

const fecha = (valor) => valor ? new Date(valor).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const estadoNombre = (f) => f.estadoNombre || ({ P: 'Pendiente', E: 'Emitida', A: 'Anulada' }[f.estado] || f.estado || 'Desconocido');

export function filaFacturaPendiente(item) {
  const tipo = item.tipo === 'inscripcion' ? 'inscripcion' : 'venta';
  const id = Number(item.numero);
  return `<tr data-pendiente="${tipo}-${id}">
    <td>${tipo === 'venta' ? 'Venta' : 'Inscripción'} #${id}</td>
    <td>${escapar(item.cliente || 'CONSUMIDOR FINAL')}</td>
    <td>${escapar(fecha(item.fecha))}</td>
    <td class="text-end">${formatearPrecio(item.total ?? 0)}</td>
    <td><button type="button" class="btn btn-sm btn-outline-primary" data-emitir-factura data-tipo="${tipo}" data-numero="${id}" aria-label="Emitir factura de ${tipo} ${id}">Emitir factura</button></td>
  </tr>`;
}

export function filaFactura(f) {
  const nombre = estadoNombre(f);
  return `<tr data-factura-id="${f.id}" data-estado-nombre="${escapar(nombre)}">
    <td>${f.id}</td>
    <td>${escapar(f.cliente || '—')}</td>
    <td>${escapar(fecha(f.fecha))}</td>
    <td>${f.ventaId ? `Venta #${f.ventaId}` : f.inscripcionId ? `Inscripción #${f.inscripcionId}` : '—'}</td>
    <td class="font-monospace">${escapar(f.numComprobante || 'Sin número')}</td>
    <td class="text-end">${formatearPrecio(f.total ?? 0)}</td>
    <td><span class="badge text-bg-secondary" data-estado-factura>${escapar(nombre)}</span>${f.simulado ? `<span class="d-block small text-body-secondary">Simulado · ${escapar(f.ambiente || 'Pruebas')}</span>` : ''}</td>
    <td><button type="button" class="btn btn-sm btn-outline-primary" data-editar-sri data-id="${f.id}" data-numero="${escapar(f.numComprobante || '')}" data-clave="${escapar(f.claveAcceso || '')}" ${f.estado === 'A' ? 'disabled' : ''} aria-label="Corregir SRI de la factura ${f.id}">Corregir SRI</button></td>
  </tr>`;
}

export function paginasFacturas(pagination) {
  return paginacionAdmin(pagination || { page: 1, totalPages: 1 }, 'facturas');
}

export function listaVacia(texto) {
  return `<tr><td colspan="8" class="text-center text-body-secondary py-4">${escapar(texto)}</td></tr>`;
}
