import { adminModel } from '../models/admin.model.js';
import { usuarioActual } from '../models/sesion.model.js';
import { escapar, mostrarAviso, vacio } from '../views/componentes.view.js';
import { paginacionAdmin } from '../views/admin.view.js';

const s = (selector, raiz = document) => raiz.querySelector(selector);
const ss = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];
const numero = (valor) => new Intl.NumberFormat('es-EC').format(Number(valor) || 0);
const dinero = (valor) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(valor) || 0);
const fecha = (valor) => valor ? new Date(String(valor).length === 10 ? `${valor}T00:00:00` : valor).toLocaleDateString('es-EC') : '—';
const datos = (respuesta) => Array.isArray(respuesta) ? respuesta : (respuesta?.data || []);
const errorTexto = (error) => error?.mensaje || error?.message || 'No se pudo completar la operación.';

const estadoLote = { D: 'Disponible', A: 'Agotado', C: 'Caducado', B: 'Bloqueado' };
const paginas = { lotes: 1 };
let lotes = [];
let lotesCargados = false;
let alertasCargadas = false;

function puedeGestionar() {
  const usuario = usuarioActual();
  return Boolean(usuario && (usuario.rol === 'ADM' || usuario.rol === 'admin'));
}

function diasParaCaducar(lote) {
  if (!lote.fechaCaducidad) return null;
  const fechaLote = new Date(String(lote.fechaCaducidad).length === 10 ? `${lote.fechaCaducidad}T00:00:00` : lote.fechaCaducidad);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((fechaLote - hoy) / 86400000);
}

function situacion(lote) {
  const dias = lote.diasRestantes ?? diasParaCaducar(lote);
  if (lote.estado === 'C' || (dias !== null && dias < 0)) return 'Caducado';
  if (lote.estado === 'B') return 'Bloqueado';
  if (dias === 0) return 'Caduca hoy';
  if (dias !== null && dias > 0) return `Caduca en ${dias} día${dias === 1 ? '' : 's'}`;
  return 'Sin caducidad';
}

function metodoTexto(lote) {
  const fefo = lote.controlaCaducidad === true || lote.metodoSalida === 'FEFO' || lote.metodoSalida === 'E';
  return fefo ? 'FEFO: sale primero lo que caduca antes' : 'FIFO: sale primero lo que entró antes';
}

function botonesLote(lote) {
  const productoId = lote.productoId || '';
  const bloqueado = lote.estado === 'B';
  return `<div class="d-flex flex-wrap gap-1">
    <button type="button" class="btn btn-outline-secondary btn-sm" data-kardex="${escapar(productoId)}" aria-label="Ver kárdex de ${escapar(lote.producto || productoId)}">Kárdex</button>
    <button type="button" class="btn btn-outline-danger btn-sm" data-baja="${escapar(lote.id)}" aria-label="Dar de baja el lote ${escapar(lote.id)}">Dar de baja</button>
    <button type="button" class="btn btn-outline-warning btn-sm" data-bloquear="${escapar(lote.id)}" data-bloqueado="${bloqueado}" aria-label="${bloqueado ? 'Desbloquear' : 'Bloquear'} lote ${escapar(lote.id)}">${bloqueado ? 'Desbloquear' : 'Bloquear'}</button>
  </div>`;
}

function pintarPaginacion(contenedor, paginaActual, totalPaginas, prefijo) {
  if (!contenedor) return;
  contenedor.innerHTML = paginacionAdmin({ page: paginaActual, totalPages: Math.max(totalPaginas, 1) }, prefijo);
}

function paginarLocal(lista, paginaActual, tamano = 10) {
  const totalPaginas = Math.max(Math.ceil(lista.length / tamano), 1);
  const pagina = Math.min(Math.max(paginaActual, 1), totalPaginas);
  const inicio = (pagina - 1) * tamano;
  return { items: lista.slice(inicio, inicio + tamano), pagina, totalPaginas };
}

function pintarLista(selector, lista, fila, mensajeVacio) {
  const contenedor = s(selector);
  if (!contenedor) return;
  contenedor.innerHTML = lista.length
    ? `<ul class="list-group list-group-flush">${lista.map(fila).join('')}</ul>`
    : `<p class="text-body-secondary small mb-0">${escapar(mensajeVacio)}</p>`;
}

async function cargarCatalogos() {
  try {
    const categorias = datos(await adminModel.categorias());
    const selector = s('[data-filtro-categoria]');
    if (selector) selector.innerHTML = '<option value="">Todas</option>' + categorias.map((c) => `<option value="${escapar(c.id)}">${escapar(c.descripcion || c.nombre || c.id)}</option>`).join('');
    const productos = datos(await adminModel.productos({ page: 1, limit: 200 }));
    const lista = s('[data-lista-productos]');
    if (lista) lista.innerHTML = productos.map((p) => `<option value="${escapar(p.id)}" label="${escapar(p.nombre || p.id)}"></option>`).join('');
  } catch (error) {
    mostrarAviso(errorTexto(error), 'error');
  }
}

function parametrosLotes() {
  const parametros = {};
  const metodoSalida = s('#filtro-tipo-inventario')?.value;
  const productoId = s('#filtro-producto')?.value.trim();
  const categoriaId = s('[data-filtro-categoria]')?.value;
  const estado = s('#filtro-estado-lote')?.value;
  const desde = s('#filtro-caduca-desde')?.value;
  const hasta = s('#filtro-caduca-hasta')?.value;
  if (metodoSalida) parametros.metodoSalida = metodoSalida;
  if (productoId) parametros.productoId = productoId;
  if (categoriaId) parametros.categoriaId = categoriaId;
  if (estado) parametros.estado = estado;
  if (s('#filtro-por-caducar')?.checked) parametros.porCaducar = 'S';
  if (s('#filtro-solo-stock')?.checked) parametros.conStock = 'S';
  if (metodoSalida === 'FEFO' && desde) parametros.caducaDesde = desde;
  if (metodoSalida === 'FEFO' && hasta) parametros.caducaHasta = hasta;
  return parametros;
}

async function cargarLotes() {
  const tbody = s('[data-tabla-lotes]');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7">Cargando lotes…</td></tr>';
  try {
    const respuesta = await adminModel.lotes({ ...parametrosLotes(), page: paginas.lotes, limit: 10 });
    lotes = datos(respuesta);
    const pagina = paginarLocal(lotes, paginas.lotes, 10);
    paginas.lotes = pagina.pagina;
    const total = respuesta?.pagination?.totalPages || pagina.totalPaginas;
    tbody.innerHTML = pagina.items.length
      ? pagina.items.map((lote) => `<tr>
          <th scope="row">${escapar(lote.producto || lote.productoId || '')}<div class="small text-body-secondary">${escapar(lote.productoId || '')}</div></th>
          <td class="small">${escapar(metodoTexto(lote))}</td>
          <td><span class="badge text-bg-secondary">${escapar(situacion(lote))}</span></td>
          <td>${escapar(fecha(lote.fechaCaducidad))}</td>
          <td>${numero(lote.cantidadDisponible)}</td>
          <td>${escapar(lote.estadoNombre || estadoLote[lote.estado] || lote.estado || '')}</td>
          <td>${botonesLote(lote)}</td>
        </tr>`).join('')
      : '<tr><td colspan="7">No hay lotes con estos filtros.</td></tr>';
    pintarPaginacion(s('[data-paginacion-lotes]'), paginas.lotes, total, 'lotes');
    lotesCargados = true;
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="7">No se pudieron cargar los lotes.</td></tr>';
    mostrarAviso(errorTexto(error), 'error');
  }
}

async function cargarAlertas() {
  try {
    const alertas = await adminModel.alertasInventario();
    pintarLista('[data-lista-por-caducar]', alertas.porCaducar || [], (lote) => `<li class="list-group-item px-0 d-flex flex-wrap gap-2 justify-content-between align-items-center">
      <span><strong>${escapar(lote.producto)}</strong><br><span class="small text-body-secondary">${escapar(fecha(lote.fechaCaducidad))} · ${numero(lote.cantidadDisponible)} unidades</span></span>
      <span class="badge text-bg-warning">${escapar(situacion(lote))}</span>
      ${botonesLote(lote)}
    </li>`, 'No hay lotes por caducar.');
    pintarLista('[data-lista-caducados]', alertas.caducadosConUnidades || [], (lote) => `<li class="list-group-item px-0 d-flex flex-wrap gap-2 justify-content-between align-items-center">
      <span><strong>${escapar(lote.producto)}</strong><br><span class="small text-body-secondary">${escapar(fecha(lote.fechaCaducidad))} · ${numero(lote.cantidadDisponible)} unidades</span></span>
      <span class="badge text-bg-danger">Caducado</span>
      ${botonesLote(lote)}
    </li>`, 'No hay lotes caducados con unidades.');
    pintarLista('[data-lista-sin-stock]', alertas.sinStockYMinimo || [], (producto) => `<li class="list-group-item px-0 d-flex flex-wrap gap-2 justify-content-between align-items-center">
      <span><strong>${escapar(producto.nombre)}</strong><br><span class="small text-body-secondary">${escapar(producto.productoId)} · mínimo ${numero(producto.stockMin)}</span></span>
      <span class="badge text-bg-secondary">Stock ${numero(producto.stock)}</span>
    </li>`, 'Todos los productos tienen stock suficiente.');
    alertasCargadas = true;
  } catch (error) {
    mostrarAviso(errorTexto(error), 'error');
  }
}

function activarPestana(nombre, { scroll = false } = {}) {
  ss('[data-pestana]').forEach((boton) => {
    const activo = boton.dataset.pestana === nombre;
    boton.setAttribute('aria-selected', String(activo));
    boton.tabIndex = activo ? 0 : -1;
  });
  ss('[data-panel-pestana]').forEach((panel) => { panel.hidden = panel.dataset.panelPestana !== nombre; });
  if (nombre === 'lotes' && !lotesCargados) cargarLotes();
  if (nombre === 'alertas' && !alertasCargadas) cargarAlertas();
  if (scroll) s(`#pestana-${nombre}`)?.scrollIntoView({ block: 'start' });
}

function aplicarFiltroDeEnlace() {
  const filtro = new URLSearchParams(window.location.search).get('filtro');
  if (filtro === 'porCaducar' || filtro === 'caducados' || filtro === 'sinStock') {
    activarPestana('alertas', { scroll: true });
    return;
  }
  if (filtro === 'caducaPronto') {
    const casilla = s('#filtro-por-caducar');
    if (casilla) casilla.checked = true;
  }
  if (filtro === 'lotes' || filtro === 'caducaPronto' || window.location.hash === '#lotes') activarPestana('lotes');
}

async function verKardex(productoId) {
  try {
    const respuesta = await adminModel.kardex(productoId);
    const movimientos = datos(respuesta);
    const contenido = s('[data-contenido-kardex]');
    if (!contenido) return;
    contenido.innerHTML = movimientos.length
      ? `<div class="table-responsive"><table class="table pf-tabla align-middle"><thead><tr><th scope="col">Fecha</th><th scope="col">Movimiento</th><th scope="col">Cantidad</th><th scope="col">Saldo</th><th scope="col">Observación</th></tr></thead><tbody>${movimientos.map((m) => `<tr><td>${escapar(fecha(m.fecha))}</td><td>${escapar(m.tipoMovimientoId || '')}</td><td>${numero(m.cantidad)}</td><td>${numero(m.saldoCantidad)}</td><td>${escapar(m.observacion || '')}</td></tr>`).join('')}</tbody></table></div>`
      : vacio('Este producto no tiene movimientos registrados.');
    const dialogo = s('#dialogo-kardex');
    if (dialogo?.showModal) dialogo.showModal();
    else if (dialogo) dialogo.setAttribute('open', '');
  } catch (error) {
    mostrarAviso(errorTexto(error), 'error');
  }
}

async function recargar() {
  lotesCargados = false;
  alertasCargadas = false;
  await Promise.all([cargarLotes(), cargarAlertas()]);
}

async function alHacerClic(evento) {
  const objetivo = evento.target;
  const pestana = objetivo.closest('[data-pestana]');
  if (pestana) {
    activarPestana(pestana.dataset.pestana);
    return;
  }
  const paginaBoton = objetivo.closest('[data-paginacion-lotes] [data-page]');
  if (paginaBoton) {
    paginas.lotes = Number(String(paginaBoton.dataset.page).split('-').pop()) || 1;
    await cargarLotes();
    return;
  }
  const kardex = objetivo.closest('[data-kardex]');
  if (kardex) {
    await verKardex(kardex.dataset.kardex);
    return;
  }
  if (!puedeGestionar()) return;
  const baja = objetivo.closest('[data-baja]');
  if (baja) {
    const observacion = window.prompt('Observación de la baja (mínimo 3 caracteres)');
    if (!observacion || observacion.trim().length < 3) return;
    try {
      await adminModel.bajaLote(baja.dataset.baja, observacion.trim());
      mostrarAviso('La baja del lote se registró en el kárdex.', 'ok');
      await recargar();
    } catch (error) {
      mostrarAviso(errorTexto(error), 'error');
    }
    return;
  }
  const bloqueo = objetivo.closest('[data-bloquear]');
  if (bloqueo) {
    const bloquear = bloqueo.dataset.bloqueado !== 'true';
    if (!window.confirm(bloquear ? '¿Bloquear este lote?' : '¿Desbloquear este lote?')) return;
    try {
      await adminModel.bloquearLote(bloqueo.dataset.bloquear, bloquear);
      mostrarAviso(bloquear ? 'El lote quedó bloqueado.' : 'El lote quedó desbloqueado.', 'ok');
      await recargar();
    } catch (error) {
      mostrarAviso(errorTexto(error), 'error');
    }
  }
}

export async function iniciarInventarioAdmin() {
  if (!s('[data-panel-admin]') || !s('[data-tabla-lotes]') || !puedeGestionar()) return;
  ss('[data-anio]').forEach((nodo) => { nodo.textContent = new Date().getFullYear(); });
  document.addEventListener('click', alHacerClic);
  ['#filtro-tipo-inventario', '#filtro-producto', '[data-filtro-categoria]', '#filtro-estado-lote', '#filtro-caduca-desde', '#filtro-caduca-hasta', '#filtro-por-caducar', '#filtro-solo-stock'].forEach((selector) => {
    s(selector)?.addEventListener('change', () => {
      paginas.lotes = 1;
      const esFefo = s('#filtro-tipo-inventario')?.value === 'FEFO';
      ss('[data-rango-caducidad]').forEach((nodo) => { nodo.hidden = !esFefo; });
      if (lotesCargados) cargarLotes();
    });
  });
  await cargarCatalogos();
  aplicarFiltroDeEnlace();
}
