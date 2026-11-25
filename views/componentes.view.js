import { formatearPrecio, contarArticulos } from '../models/carrito.model.js';
import { raizSitio } from '../models/storage.model.js';

export function escapar(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function rutaArchivo(ruta) {
  if (!ruta) return '';
  if (/^(https?:|data:)/.test(ruta)) return ruta;
  return new URL(ruta, raizSitio()).href;
}

export function tarjetaProducto(producto) {
  const stock = Number(producto.stock ?? 0);
  const disponible = producto.disponible !== false && stock > 0;
  const etiquetaStock = disponible
    ? `Quedan ${new Intl.NumberFormat('es-EC').format(stock)} unidades disponibles`
    : 'Agotado: sin unidades disponibles';
  const boton = disponible
    ? `<button type="button" class="pf-boton pf-boton-primario w-full" data-accion="agregar" data-id="${escapar(producto.id)}" aria-label="Agregar ${escapar(producto.nombre)} al carrito, precio ${formatearPrecio(producto.precio)}, quedan ${stock} unidades">Agregar al carrito</button>`
    : `<button type="button" class="pf-boton pf-boton-primario w-full" disabled aria-disabled="true">Agotado</button>`;
  return `
    <article class="pf-tarjeta h-full flex flex-col overflow-hidden" data-producto="${escapar(producto.id)}">
      <img class="pf-imagen-tarjeta" src="${escapar(rutaArchivo(producto.imagen))}" alt="${escapar(producto.nombre)} de Planeta Fitness" loading="lazy" width="800" height="800">
      <div class="flex flex-col gap-3 p-5 flex-1">
        <p class="pf-etiqueta">${escapar(producto.categoria || producto.categoriaId || '')}</p>
        <h4 class="text-lg font-bold text-white">${escapar(producto.nombre)}</h4>
        <p class="text-sm text-neutral-300 flex-1">${escapar(producto.descripcion || '')}</p>
        <div>
          <p class="text-2xl font-extrabold pf-precio">${formatearPrecio(producto.precio)}</p>
          <p class="text-xs text-neutral-400">IVA incluido</p>
          <p class="text-xs text-neutral-300" data-stock-producto>${escapar(etiquetaStock)}</p>
        </div>
        ${boton}
      </div>
    </article>`;
}

function generarSlug(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'categoria';
}

export function seccionCategoriaTienda({ categoria, productos }) {
  const slug = generarSlug(categoria);
  return `
    <section class="pf-tienda-categoria" aria-labelledby="categoria-${slug}">
      <h3 id="categoria-${slug}" class="pf-tienda-titulo">${escapar(categoria)}</h3>
      <div class="pf-tienda-grid">${productos.map(tarjetaProducto).join('')}</div>
    </section>`;
}

function precioPlan(plan) {
  return Number(plan?.precioConIva ?? plan?.precio ?? 0);
}

function duracionPlan(plan) {
  if (plan.tipo === 'I') return { clave: 'ingresos', titulo: 'Planes por ingresos', detalle: 'Sin fecha de vencimiento' };
  if (plan.unidadDuracion === 'D') return { clave: 'diario', titulo: 'Planes diarios', detalle: 'Acceso por un día' };
  const meses = Number(plan.duracion) || 1;
  if (meses === 1) return { clave: 'mensual', titulo: 'Planes mensuales', detalle: 'Acceso por un mes' };
  if (meses === 3) return { clave: 'trimestral', titulo: 'Planes trimestrales', detalle: 'Acceso por tres meses' };
  if (meses === 12) return { clave: 'anual', titulo: 'Planes anuales', detalle: 'Acceso por doce meses' };
  return { clave: `duracion-${meses}`, titulo: `Planes de ${meses} meses`, detalle: `Acceso por ${meses} meses` };
}

function sufijoPrecio(plan) {
  if (plan.tipo === 'I') return ` / ${plan.numIngresos} ingresos`;
  if (plan.unidadDuracion === 'D') return ' / día';
  return Number(plan.duracion) === 1 ? ' / mes' : ` / ${plan.duracion} meses`;
}

function ahorroPlan(plan, planes) {
  const precio = precioPlan(plan);
  if (plan.unidadDuracion === 'D' || plan.tipo === 'I') return null;
  const base = planes.find((p) => p.id === 'MI1' || (p.tipo === 'T' && p.unidadDuracion === 'M' && Number(p.duracion) === 1 && Number(p.personas || 1) === 1));
  if (!base) return null;
  const meses = Number(plan.duracion) || 1;
  const personas = Number(plan.personas || 1);
  const ahorro = precioPlan(base) * meses * personas - precio;
  if (ahorro <= 0) return null;
  return { total: ahorro, texto: `Ahorras ${formatearPrecio(ahorro)} ${meses === 1 ? 'frente al plan individual' : 'frente a contratar mes a mes'}` };
}

export function agruparPlanes(planes) {
  const grupos = new Map();
  planes.forEach((plan) => {
    const grupo = duracionPlan(plan);
    if (!grupos.has(grupo.clave)) grupos.set(grupo.clave, { ...grupo, planes: [] });
    grupos.get(grupo.clave).planes.push(plan);
  });
  return [...grupos.values()];
}

export function tarjetaPlan(plan, planes = []) {
  const beneficios = (plan.beneficios || []).map((b) => `
        <li class="flex items-start gap-2 text-sm text-neutral-300"><span aria-hidden="true" class="font-bold text-pf-amarillo">✓</span><span>${escapar(b)}</span></li>`).join('');
  const precio = precioPlan(plan);
  const ahorro = ahorroPlan(plan, planes);
  const duracion = duracionPlan(plan);
  return `
    <article class="pf-tarjeta h-full flex flex-col overflow-hidden" data-plan="${escapar(plan.id)}" data-duracion="${escapar(duracion.clave)}"${ahorro?` data-ahorro="${escapar(ahorro.total.toFixed(2))}"`:''}>
      <img class="pf-imagen-tarjeta" src="${escapar(rutaArchivo(plan.imagen))}" alt="${escapar(plan.nombre)} de Planeta Fitness" loading="lazy" width="600" height="450">
      <div class="flex flex-col gap-4 p-6 flex-1">
        <h3 class="text-xl font-bold text-white">${escapar(plan.nombre)}</h3>
        <p class="text-sm text-neutral-300">${escapar(plan.descripcion || '')}</p>
        <p class="pf-etiqueta self-start" data-duracion-plan>${escapar(duracion.detalle)}</p>
        <p class="text-3xl font-extrabold pf-precio">${formatearPrecio(precio)} <span class="text-sm font-semibold text-neutral-300">${escapar(sufijoPrecio(plan))}</span></p>
        <p class="text-xs text-neutral-400">IVA incluido${Number(plan.personas || 1) > 1 ? ` · ${plan.personas} personas` : ''}</p>
        ${ahorro?`<p class="pf-etiqueta self-start" data-ahorro-plan>${escapar(ahorro.texto)}</p>`:''}
        <h4 class="text-sm font-bold uppercase tracking-wide text-pf-amarillo">Incluye</h4>
        <ul class="space-y-1 flex-1">${beneficios}</ul>
        <button type="button" class="pf-boton pf-boton-primario w-full" data-accion="elegir-plan" data-plan-id="${escapar(plan.id)}" data-plan-nombre="${escapar(plan.nombre)}" data-plan-precio="${escapar(precio)}" aria-label="Agregar ${escapar(plan.nombre)} al carrito, precio ${formatearPrecio(precio)}">Elegir plan</button>
      </div>
    </article>`;
}

export function tarjetaServicio(servicio) {
  return `
    <article class="pf-tarjeta h-full flex flex-col overflow-hidden">
      <img class="pf-imagen-tarjeta" src="${escapar(rutaArchivo(servicio.imagen))}" alt="${escapar(servicio.nombre)} en Planeta Fitness" loading="lazy" width="600" height="450">
      <div class="flex flex-col gap-2 p-5 flex-1">
        <h4 class="text-lg font-bold text-white">${escapar(servicio.nombre)}</h4>
        <p class="text-sm text-neutral-300">${escapar(servicio.descripcion || '')}</p>
      </div>
    </article>`;
}

export function tarjetaClase(clase, entrenador) {
  const horarios = (clase.horarios || []).map((h) => `
        <li class="pf-clase-horario"><span class="pf-clase-dia">${escapar(h.dia)}</span><span class="pf-clase-hora">${escapar(h.horaInicio)}${h.horaFin ? ` – ${escapar(h.horaFin)}` : ''}</span></li>`).join('');
  const nombreEntrenador = entrenador ? (entrenador.nombre || `${entrenador.nombres || ''} ${entrenador.apellidos || ''}`.trim()) : (clase.entrenador?.nombre || 'Por confirmar');
  return `
    <article class="pf-clase" data-clase="${escapar(clase.id)}">
      <img class="pf-clase-imagen" src="${escapar(rutaArchivo(clase.imagen))}" alt="Clase de ${escapar(clase.nombre)} en Planeta Fitness" loading="lazy" width="600" height="400">
      <div class="pf-clase-cuerpo">
        <h3 class="pf-clase-nombre">${escapar(clase.nombre)}</h3>
        <p class="pf-clase-descripcion">${escapar(clase.descripcion || '')}</p>
        <ul class="pf-clase-horarios">${horarios}</ul>
        <dl class="pf-clase-meta">
          <div class="pf-clase-meta-fila"><dt>Lugar</dt><dd>${escapar(clase.lugar || 'Gimnasio')}</dd></div>
          <div class="pf-clase-meta-fila"><dt>Entrenador</dt><dd>${escapar(nombreEntrenador)}</dd></div>
        </dl>
      </div>
    </article>`;
}

export function tarjetaEntrenador(entrenador) {
  const nombre = entrenador.nombre || `${entrenador.nombres || ''} ${entrenador.apellidos || ''}`.trim();
  return `
    <article class="pf-tarjeta h-full flex flex-col overflow-hidden" data-entrenador="${escapar(entrenador.id)}">
      <img class="pf-imagen-tarjeta object-cover" src="${escapar(rutaArchivo(entrenador.imagen))}" alt="${escapar(nombre)} de Planeta Fitness" loading="lazy" width="600" height="450">
      <div class="flex flex-col gap-2 p-5 flex-1">
        <h4 class="text-lg font-bold text-white">${escapar(nombre)}</h4>
        <p class="pf-etiqueta self-start">${escapar(entrenador.especialidad || 'Entrenador')}</p>
        <p class="text-sm text-neutral-300">${escapar(entrenador.descripcion || '')}</p>
      </div>
    </article>`;
}

export function renderizar(contenedor, tarjetas) { if (contenedor) contenedor.innerHTML = tarjetas.join(''); }
export function vacio(mensaje = 'No hay información disponible por ahora.') { return `<p class="pf-mensaje w-full">${escapar(mensaje)}</p>`; }

export function actualizarContadorCarrito(articulos = contarArticulos()) {
  document.querySelectorAll('[data-contador-carrito]').forEach((elemento) => {
    elemento.textContent = articulos;
    const contenedor = elemento.closest('a') || elemento.closest('button');
    if (contenedor) {
      contenedor.setAttribute('aria-label', articulos === 0 ? 'Carrito de compras, vacío' : `Carrito de compras con ${articulos} producto${articulos === 1 ? '' : 's'}`);
    }
  });
}

export function actualizarEstadoSesion(usuario) {
  document.querySelectorAll('[data-sesion]').forEach((bloque) => {
    const mostrar = bloque.dataset.sesion === (usuario ? 'activa' : 'inactiva');
    bloque.hidden = !mostrar;
  });
  document.querySelectorAll('[data-nombre-sesion]').forEach((elemento) => {
    elemento.textContent = usuario ? String(usuario.nombre || usuario.login || '').trim().split(/\s+/)[0] : '';
  });
}

export function mostrarAviso(mensaje, tipo = 'info') {
  const aviso = document.querySelector('[data-aviso]');
  if (!aviso) return;
  aviso.textContent = mensaje;
  aviso.dataset.tipo = tipo;
  aviso.hidden = false;
  aviso.classList.add('pf-aparece');
  window.clearTimeout(aviso.dataset.timer);
  aviso.dataset.timer = window.setTimeout(() => { aviso.hidden = true; aviso.classList.remove('pf-aparece'); }, 4000);
}
