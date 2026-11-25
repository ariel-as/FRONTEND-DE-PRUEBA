import { adminModel } from '../models/admin.model.js';
import { haySesion } from '../models/sesion.model.js';
import { raizSitio } from '../models/storage.model.js';
import { mostrarAviso } from '../views/componentes.view.js';
import { filaFacturaPendiente, filaFactura, listaVacia, paginasFacturas } from '../views/facturas.view.js';

const NUMERO_SRI = /^\d{3}-\d{3}-\d{9}$/;
const CLAVE_SRI = /^\d{49}$/;
const seleccionar = (selector) => document.querySelector(selector);
let pagina = 1;
let facturaSeleccionada = null;

function mensaje(texto, tipo = 'info') {
  const contenedor = seleccionar('#mensaje-facturas');
  if (!contenedor) return;
  contenedor.textContent = texto;
  contenedor.classList.remove('d-none');
  contenedor.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  mostrarAviso(texto, tipo);
}

function sesionCaducada(error) {
  if (error?.status !== 401) return false;
  window.location.href = new URL('login.html?origen=facturas', raizSitio()).href;
  return true;
}

async function cargarPendientes() {
  const cuerpo = seleccionar('[data-tabla-pendientes]');
  if (!cuerpo) return;
  try {
    const respuesta = await adminModel.facturasPendientes({ page: 1, limit: 10 });
    const filas = respuesta?.data || [];
    cuerpo.innerHTML = filas.length ? filas.map(filaFacturaPendiente).join('') : listaVacia('No hay ventas ni inscripciones pendientes de facturar.');
  } catch (error) {
    if (sesionCaducada(error)) return;
    cuerpo.innerHTML = listaVacia(error?.mensaje || 'No se pudieron cargar las facturas pendientes.');
    mensaje(error?.mensaje || 'No se pudieron cargar las facturas pendientes.', 'error');
  }
}

async function cargarEmitidas() {
  const cuerpo = seleccionar('[data-tabla-facturas]');
  const paginacion = seleccionar('[data-paginacion="facturas"]');
  if (!cuerpo) return;
  try {
    const respuesta = await adminModel.facturas({ page: pagina, limit: 10 });
    const filas = respuesta?.data || [];
    cuerpo.innerHTML = filas.length ? filas.map(filaFactura).join('') : listaVacia('No hay facturas emitidas.');
    if (paginacion) paginacion.innerHTML = paginasFacturas(respuesta?.pagination);
  } catch (error) {
    if (sesionCaducada(error)) return;
    cuerpo.innerHTML = listaVacia(error?.mensaje || 'No se pudieron cargar las facturas.');
    mensaje(error?.mensaje || 'No se pudieron cargar las facturas.', 'error');
  }
}

async function recargar() {
  await Promise.all([cargarPendientes(), cargarEmitidas()]);
}

async function emitir(boton) {
  const tipo = boton.dataset.tipo === 'inscripcion' ? 'inscripcion' : 'venta';
  const numero = Number(boton.dataset.numero);
  if (!numero) return;
  if (!confirm(`¿Emitir la factura de ${tipo} #${numero} con numeración SRI simulada?`)) return;
  boton.disabled = true;
  try {
    const body = tipo === 'venta' ? { ventaId: numero } : { inscripcionId: numero };
    const factura = await adminModel.generarFactura(body);
    mensaje(`Factura ${factura?.numComprobante || factura?.id || ''} emitida en ambiente de pruebas.`, 'exito');
    await recargar();
  } catch (error) {
    if (sesionCaducada(error)) return;
    mensaje(error?.mensaje || 'No se pudo emitir la factura.', 'error');
  } finally {
    boton.disabled = false;
  }
}

function abrirDialogo(boton) {
  const dialogo = seleccionar('#dialogo-sri');
  if (!dialogo) return;
  facturaSeleccionada = Number(boton.dataset.id);
  seleccionar('#sri-id').textContent = `Factura #${facturaSeleccionada}`;
  seleccionar('#sri-numero').value = boton.dataset.numero || '';
  seleccionar('#sri-clave').value = boton.dataset.clave || '';
  seleccionar('#mensaje-sri').textContent = '';
  dialogo.showModal();
  seleccionar('#sri-numero').focus();
}

async function guardarSri() {
  const numero = seleccionar('#sri-numero').value.trim();
  const clave = seleccionar('#sri-clave').value.trim();
  const aviso = seleccionar('#mensaje-sri');
  if (!NUMERO_SRI.test(numero)) {
    aviso.textContent = 'El número debe tener el formato 001-001-000000123.';
    aviso.setAttribute('role', 'alert');
    return;
  }
  if (!CLAVE_SRI.test(clave)) {
    aviso.textContent = 'La clave de acceso debe tener 49 dígitos.';
    aviso.setAttribute('role', 'alert');
    return;
  }
  const boton = seleccionar('#sri-guardar');
  boton.disabled = true;
  try {
    await adminModel.actualizarSri(facturaSeleccionada, { numComprobante: numero, claveAcceso: clave });
    seleccionar('#dialogo-sri').close();
    mensaje(`Datos SRI de la factura #${facturaSeleccionada} actualizados.`, 'exito');
    await recargar();
  } catch (error) {
    if (sesionCaducada(error)) return;
    aviso.textContent = error?.mensaje || 'No se pudieron actualizar los datos SRI.';
    aviso.setAttribute('role', 'alert');
    mensaje(aviso.textContent, 'error');
  } finally {
    boton.disabled = false;
  }
}

export async function iniciarFacturas() {
  if (document.body.dataset.pagina !== 'facturas-admin') return;
  if (!haySesion()) {
    window.location.href = new URL('login.html?origen=facturas', raizSitio()).href;
    return;
  }
  await recargar();

  document.addEventListener('click', async (evento) => {
    const paginaSiguiente = evento.target.closest('[data-paginacion="facturas"] [data-page]');
    if (paginaSiguiente && !paginaSiguiente.disabled) {
      pagina = Number(paginaSiguiente.dataset.page) || 1;
      await cargarEmitidas();
      return;
    }
    const emitirBoton = evento.target.closest('[data-emitir-factura]');
    if (emitirBoton) {
      await emitir(emitirBoton);
      return;
    }
    const editarBoton = evento.target.closest('[data-editar-sri]');
    if (editarBoton && !editarBoton.disabled) abrirDialogo(editarBoton);
  });

  seleccionar('#sri-cancelar')?.addEventListener('click', () => seleccionar('#dialogo-sri').close());
  seleccionar('#sri-guardar')?.addEventListener('click', guardarSri);
}
