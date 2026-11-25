import { adminModel } from '../models/admin.model.js';
import { usuarioActual, cerrarSesion } from '../models/sesion.model.js';
import { mostrarAviso } from '../views/componentes.view.js';

const select = (selector, raiz = document) => raiz.querySelector(selector);
const selectAll = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];
const numero = (valor) => new Intl.NumberFormat('es-EC').format(Number(valor) || 0);
const textoEstado = { P: 'Pendiente', A: 'A la venta', I: 'Inactivo', C: 'Cancelado' };

function esAdministrador() {
  const usuario = usuarioActual();
  return Boolean(usuario && (usuario.rol === 'ADM' || usuario.rol === 'admin' || usuario.esAdmin === true));
}

async function cargarResumen() {
  try {
    const resumen = await adminModel.resumen();
    const valores = {
      '[data-total-productos]': resumen.productosActivos ?? resumen.productos ?? 0,
      '[data-total-bajo-stock]': resumen.bajoStock ?? 0,
      '[data-total-pedidos]': resumen.pedidosPendientes ?? resumen.pedidos ?? 0,
      '[data-total-clientes]': resumen.clientesActivos ?? resumen.clientes ?? 0,
      '[data-total-inscripciones]': resumen.inscripcionesPendientes ?? resumen.inscripciones ?? 0,
      '[data-total-mensajes]': resumen.mensajesPendientes ?? 0,
      '[data-total-facturas]': resumen.facturasPendientes ?? 0,
      '[data-total-mis-rutinas]': resumen.misRutinas ?? 0,
      '[data-total-lotes-por-caducar]': resumen.lotesPorCaducar ?? 0,
      '[data-total-lotes-caducados]': resumen.lotesCaducados ?? 0,
      '[data-total-sin-stock]': resumen.productosSinStock ?? 0
    };
    Object.entries(valores).forEach(([selector, valor]) => {
      const nodo = select(selector);
      if (nodo) nodo.textContent = numero(valor);
    });
    const aviso = select('[data-alerta-inventario]');
    if (aviso) {
      const porCaducar = Number(resumen.lotesPorCaducar) || 0;
      const caducados = Number(resumen.lotesCaducados) || 0;
      aviso.hidden = !(porCaducar || caducados);
      aviso.textContent = `${porCaducar} lote${porCaducar === 1 ? '' : 's'} caduca${porCaducar === 1 ? '' : 'n'} esta semana · ${caducados} lote${caducados === 1 ? '' : 's'} caducado${caducados === 1 ? '' : 's'} con unidades`;
    }
  } catch (error) {
    mostrarAviso(error.mensaje || 'No se pudo cargar el resumen.', 'error');
  }
}

async function cargarPedidos() {
  const tbody = select('[data-tabla-pedidos-recientes]');
  if (!tbody) return;
  try {
    const pedidos = await adminModel.pedidos({ page: 1, limit: 5 });
    const filas = pedidos.data || pedidos;
    tbody.innerHTML = filas.length
      ? filas.map((p) => `<tr><th scope="row">#${p.id}</th><td>${p.cliente || 'Cliente'}</td><td>${numero(p.total)}</td><td>${textoEstado[p.estado] || p.estado || ''}</td></tr>`).join('')
      : '<tr><td colspan="4">No hay pedidos recientes.</td></tr>';
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="4">No se pudieron cargar los pedidos.</td></tr>';
  }
}

export async function iniciarPanelAdmin() {
  if (!select('[data-panel-admin]')) return;
  if (!esAdministrador()) {
    window.location.replace(new URL('login.html', document.baseURI).href);
    return;
  }
  selectAll('[data-admin-tipo]').forEach((nodo) => { nodo.textContent = 'Administración'; });
  selectAll('[data-solo-adm]').forEach((nodo) => { nodo.hidden = false; });
  selectAll('[data-cerrar-sesion]').forEach((boton) => boton.addEventListener('click', () => {
    cerrarSesion();
    window.location.replace(new URL('login.html', document.baseURI).href);
  }));
  selectAll('[data-anio]').forEach((nodo) => { nodo.textContent = new Date().getFullYear(); });
  await Promise.all([cargarResumen(), cargarPedidos()]);
}
