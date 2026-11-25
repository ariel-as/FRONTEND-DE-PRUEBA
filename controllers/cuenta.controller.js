import { haySesion, refrescarPerfil, usuarioActual } from '../models/sesion.model.js';
import { raizSitio } from '../models/storage.model.js';
import { misInscripciones } from '../models/pedido.model.js';
import { rutinaModel } from '../models/rutina.model.js';
import { escapar, mostrarAviso } from '../views/componentes.view.js';
import { tarjetaInscripcion } from '../views/pedidos.view.js';
import { detalleRutina } from '../views/rutinas.view.js';

function proteger(origen) {
  if (haySesion()) return true;
  window.location.href = new URL(`login.html?origen=${origen}`, raizSitio()).href;
  return false;
}

function mensaje(texto, tipo = 'info') {
  const nodo = document.querySelector('#mensaje-cuenta');
  if (!nodo) return;
  nodo.textContent = texto;
  nodo.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
}

export async function iniciarMiCuenta() {
  if (!proteger('mi-cuenta')) return;
  try {
    const perfil = await refrescarPerfil().catch(() => usuarioActual());
    const usuario = perfil?.usuario || perfil || usuarioActual();
    document.querySelector('#cuenta-nombre').textContent = usuario.nombre || usuario.login || 'Cliente';
    document.querySelector('#cuenta-correo').textContent = usuario.correo || 'Sin correo registrado';
    document.querySelector('#cuenta-cliente').textContent = usuario.clienteId || 'Sin cédula vinculada';
    const inscripciones = await misInscripciones();
    const lista = Array.isArray(inscripciones) ? inscripciones : (inscripciones?.data || []);
    document.querySelector('#cuenta-planes').innerHTML = lista.length ? lista.map(tarjetaInscripcion).join('') : '<p class="text-body-secondary">No tienes planes registrados.</p>';
  } catch (error) {
    mensaje(error?.mensaje || 'No se pudo cargar tu cuenta.', 'error');
    mostrarAviso(error?.mensaje || 'No se pudo cargar tu cuenta.', 'error');
  }
  try {
    const rutina = await rutinaModel.mia();
    document.querySelector('#cuenta-rutina').innerHTML = `<p class="mb-1"><span class="fw-semibold">Rutina vigente:</span> ${escapar(rutina.objetivo || 'Sin objetivo')}</p><p class="small text-neutral-400 mb-0">Estado: ${escapar(rutina.estado || 'vigente')}. Entrenador: ${escapar(rutina.entrenador || 'sin asignar')}.</p>`;
  } catch {
    document.querySelector('#cuenta-rutina').innerHTML = '<p class="mb-0 text-body-secondary">Todavía no tienes una rutina asignada.</p>';
  }
}

export async function iniciarMiRutina() {
  if (!proteger('mi-rutina')) return;
  const contenedor = document.querySelector('#contenido-rutina');
  try {
    const rutina = await rutinaModel.mia();
    document.querySelector('#rutina-estado').textContent = `Estado: ${rutina.estado || 'vigente'}${rutina.fechaFin ? ` · vigente hasta ${String(rutina.fechaFin).slice(0, 10)}` : ''}`;
    document.querySelector('#rutina-titulo').textContent = rutina.objetivo || 'Mi rutina';
    document.querySelector('#rutina-entrenador').textContent = rutina.entrenador || 'Sin entrenador asignado';
    document.querySelector('#rutina-nivel').textContent = rutina.nivel || 'Sin nivel';
    contenedor.innerHTML = detalleRutina(rutina.detalle);
  } catch (error) {
    mensaje(error?.status === 404 ? 'Todavía no tienes una rutina asignada.' : (error?.mensaje || 'No se pudo cargar tu rutina.'), error?.status === 404 ? 'info' : 'error');
    contenedor.innerHTML = '<p class="text-body-secondary">Cuando tu entrenador te asigne una rutina, aparecerá aquí.</p>';
  }
}
