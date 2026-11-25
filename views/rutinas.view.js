import { escapar } from './componentes.view.js';
import { paginacionAdmin } from './admin.view.js';

const fecha = (valor) => valor ? String(valor).slice(0, 10) : '';

function parseDetalle(detalle) {
  if (detalle && typeof detalle === 'object' && Array.isArray(detalle.dias)) return detalle;
  if (typeof detalle === 'string') {
    try {
      const parsed = JSON.parse(detalle);
      if (parsed && Array.isArray(parsed.dias)) return parsed;
    } catch {}
    return { editable: true, dias: [], nota: detalle };
  }
  return { editable: true, dias: [] };
}

export function opciones(lista, seleccionado = '') {
  return (lista || []).map((item) => {
    const valor = item.valor ?? item.id ?? item.nivel ?? '';
    const texto = item.texto ?? item.descripcion ?? valor;
    return `<option value="${escapar(valor)}" ${String(valor) === String(seleccionado) ? 'selected' : ''}>${escapar(texto)}</option>`;
  }).join('');
}

export function detalleRutina(detalle, titulo = 'Rutina') {
  const datos = parseDetalle(detalle);
  const dias = datos.dias || [];
  return `<div class="d-flex flex-column gap-3" data-rutina-detalle>
    ${datos.nota ? `<p class="pf-mensaje">${escapar(datos.nota)}</p>` : ''}
    ${dias.length ? dias.map((dia, indice) => `
      <section class="border rounded p-3" data-dia-vista="${indice}">
        <h4 class="h6 mb-2">${escapar(dia.nombre || `Día ${indice + 1}`)}</h4>
        <ol class="mb-0 ps-4">
          ${(dia.ejercicios || []).map((ejercicio) => `
            <li class="mb-2" data-ejercicio-nombre="${escapar(ejercicio.nombre)}">
              <span class="fw-semibold">${escapar(ejercicio.nombre)}</span>
              <span class="text-body-secondary">${ejercicio.grupo ? ` · ${escapar(ejercicio.grupo)}` : ''}${ejercicio.series ? ` · ${ejercicio.series} series` : ''}${ejercicio.repeticiones ? ` de ${ejercicio.repeticiones}` : ''}${ejercicio.tiempo ? ` · ${ejercicio.tiempo} s` : ''}${ejercicio.descanso ? ` · descanso ${escapar(ejercicio.descanso)}` : ''}</span>
              ${ejercicio.nota ? `<p class="small text-body-secondary mb-0">${escapar(ejercicio.nota)}</p>` : ''}
            </li>`).join('')}
        </ol>
      </section>`).join('') : `<p class="text-body-secondary">Esta rutina todavía no tiene días registrados.</p>`}
  </div>`;
}

export function filaRutina(rutina) {
  const estado = rutina.estado || 'vigente';
  return `<tr data-rutina-id="${rutina.id}" data-rutina-estado="${escapar(estado)}">
    <td>${rutina.id}</td>
    <td>${escapar(rutina.cliente || rutina.clienteId)}</td>
    <td>${escapar(rutina.entrenador || '—')}</td>
    <td>${escapar(rutina.nivel || '—')}</td>
    <td>${escapar(rutina.objetivo || '—')}</td>
    <td>${escapar(fecha(rutina.fechaInicio) || '—')}</td>
    <td>${escapar(estado)}</td>
    <td><button type="button" class="btn btn-sm btn-outline-primary" data-editar-rutina="${rutina.id}" data-cliente="${escapar(rutina.clienteId)}">Editar</button></td>
  </tr>`;
}

export function fichaCliente(ficha) {
  if (!ficha) return '';
  const rutina = ficha.rutinaVigente;
  return `<div class="border rounded p-3" data-ficha-cliente="${escapar(ficha.cedula)}">
    <h3 class="h6">${escapar(ficha.nombre)}</h3>
    <p class="small mb-2">${escapar(ficha.correo || 'Sin correo')} · Nivel: ${escapar(ficha.nivel || 'sin nivel')}</p>
    <p class="small mb-2">Plan activo: ${ficha.planActivo ? `${escapar(ficha.planActivo.nombre)} (hasta ${escapar(fecha(ficha.planActivo.fechaFin) || 'sin fecha')})` : 'sin plan con rutina'}</p>
    ${rutina ? `<p class="small mb-2">Rutina vigente #${rutina.id} · ${escapar(rutina.objetivo || 'sin objetivo')} · ${escapar(rutina.entrenador || 'sin entrenador')}</p>
      ${detalleRutina(rutina.detalle)}
      <button type="button" class="btn btn-sm btn-outline-primary mt-3" data-editar-rutina="${rutina.id}" data-cliente="${escapar(ficha.cedula)}">Editar esta rutina</button>` : '<p class="text-body-secondary mb-0">Sin rutina vigente.</p>'}
  </div>`;
}

function ejercicioEditor(ejercicio, diaIndice, ejIndice, grupos) {
  const e = ejercicio || {};
  const opcionesGrupo = [''].concat(grupos.map((g) => g.grupo)).map((g) => `<option value="${escapar(g)}" ${g === e.grupo ? 'selected' : ''}>${escapar(g || 'Sin grupo')}</option>`).join('');
  return `<li class="border rounded p-3 mb-2" data-ejercicio-editor="${ejIndice}">
    <div class="row g-2">
      <div class="col-md-4"><label class="form-label small mb-1">Ejercicio<input class="form-control form-control-sm" data-campo="ej-nombre" data-dia="${diaIndice}" data-ejercicio="${ejIndice}" value="${escapar(e.nombre || '')}" required minlength="2" maxlength="60"></label></div>
      <div class="col-md-2"><label class="form-label small mb-1">Grupo<select class="form-select form-select-sm" data-campo="ej-grupo" data-dia="${diaIndice}" data-ejercicio="${ejIndice}">${opcionesGrupo}</select></label></div>
      <div class="col-md-2"><label class="form-label small mb-1">Series<input class="form-control form-control-sm" type="number" min="1" max="10" data-campo="ej-series" data-dia="${diaIndice}" data-ejercicio="${ejIndice}" value="${e.series ?? 3}" required></label></div>
      <div class="col-md-2"><label class="form-label small mb-1">Repeticiones<input class="form-control form-control-sm" type="number" min="1" max="100" data-campo="ej-repeticiones" data-dia="${diaIndice}" data-ejercicio="${ejIndice}" value="${e.repeticiones ?? 12}"></label></div>
      <div class="col-md-2"><label class="form-label small mb-1">Tiempo (s)<input class="form-control form-control-sm" type="number" min="1" max="3600" data-campo="ej-tiempo" data-dia="${diaIndice}" data-ejercicio="${ejIndice}" value="${e.tiempo ?? ''}"></label></div>
      <div class="col-md-3"><label class="form-label small mb-1">Descanso<input class="form-control form-control-sm" data-campo="ej-descanso" data-dia="${diaIndice}" data-ejercicio="${ejIndice}" value="${escapar(e.descanso || '60s')}" required maxlength="15"></label></div>
      <div class="col-md-7"><label class="form-label small mb-1">Nota<input class="form-control form-control-sm" data-campo="ej-nota" data-dia="${diaIndice}" data-ejercicio="${ejIndice}" value="${escapar(e.nota || '')}" maxlength="120"></label></div>
      <div class="col-md-2 d-flex align-items-end pb-1"><div class="form-check"><input class="form-check-input" type="checkbox" data-campo="ej-editable" data-dia="${diaIndice}" data-ejercicio="${ejIndice}" ${e.editable !== false ? 'checked' : ''} id="editable-${diaIndice}-${ejIndice}"><label class="form-check-label small" for="editable-${diaIndice}-${ejIndice}">Editable</label></div></div>
    </div>
    <button type="button" class="btn btn-sm btn-outline-danger mt-2" data-quitar-ejercicio data-dia="${diaIndice}" data-ejercicio="${ejIndice}">Quitar ejercicio</button>
  </li>`;
}

export function editorDias(detalle, grupos = []) {
  const datos = parseDetalle(detalle);
  const dias = datos.dias || [];
  return dias.map((dia, diaIndice) => `
    <section class="border rounded p-3 mb-3" data-dia-editor="${diaIndice}">
      <div class="d-flex justify-content-between align-items-center gap-2">
        <label class="form-label small mb-1 flex-grow-1">Día ${diaIndice + 1}<input class="form-control form-control-sm" data-campo="dia-nombre" data-dia="${diaIndice}" value="${escapar(dia.nombre || '')}" required minlength="3" maxlength="30"></label>
        <button type="button" class="btn btn-sm btn-outline-danger" data-quitar-dia data-dia="${diaIndice}">Quitar día</button>
      </div>
      <ol class="list-unstyled mt-2">${(dia.ejercicios || []).map((ejercicio, ejIndice) => ejercicioEditor(ejercicio, diaIndice, ejIndice, grupos)).join('')}</ol>
      <button type="button" class="btn btn-sm btn-outline-secondary" data-agregar-ejercicio data-dia="${diaIndice}">Agregar ejercicio</button>
    </section>`).join('') || '<p class="text-body-secondary">Agrega al menos un día para guardar la rutina.</p>';
}

export function paginasRutinas(pagination) {
  return paginacionAdmin(pagination || { page: 1, totalPages: 1 }, 'rutinas');
}

export function filasVaciasRutinas(texto) {
  return `<tr><td colspan="8" class="text-center text-body-secondary py-4">${escapar(texto)}</td></tr>`;
}
