import { rutinaModel } from '../models/rutina.model.js';
import { haySesion } from '../models/sesion.model.js';
import { raizSitio } from '../models/storage.model.js';
import { mostrarAviso } from '../views/componentes.view.js';
import { opciones, detalleRutina, editorDias, filaRutina, fichaCliente, filasVaciasRutinas, paginasRutinas } from '../views/rutinas.view.js';

const seleccionar = (selector) => document.querySelector(selector);
const lista = (respuesta) => Array.isArray(respuesta) ? respuesta : (respuesta?.data || []);
let pagina = 1;
let filtroCliente = '';
const estado = {
  id: null, clienteId: '', nivelId: 'PRI', objetivo: '', fechaInicio: '', fechaFin: '',
  detalle: { editable: true, dias: [] }, plantillas: [], ejercicios: [], clientes: [], niveles: []
};

function mensaje(texto, tipo = 'info') {
  const contenedor = seleccionar('#mensaje-rutinas');
  if (!contenedor) return;
  contenedor.textContent = texto;
  contenedor.classList.remove('d-none');
  contenedor.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  mostrarAviso(texto, tipo);
}

function sesionCaducada(error) {
  if (error?.status !== 401) return false;
  window.location.href = new URL('login.html?origen=rutinas', raizSitio()).href;
  return true;
}

async function cargarCatalogos() {
  try {
    const [clientes, niveles, plantillas, ejercicios] = await Promise.all([
      rutinaModel.opcionesClientes(), rutinaModel.opcionesNiveles(), rutinaModel.plantillas(), rutinaModel.ejercicios()
    ]);
    estado.clientes = lista(clientes);
    estado.niveles = lista(niveles);
    estado.plantillas = lista(plantillas);
    estado.ejercicios = lista(ejercicios);
    seleccionar('#rutina-cliente').innerHTML = '<option value="">Selecciona un cliente</option>' + opciones(estado.clientes);
    seleccionar('#rutina-nivel').innerHTML = opciones(estado.niveles, estado.nivelId);
    seleccionar('#rutina-plantilla').innerHTML = '<option value="">Selecciona una plantilla</option>' + estado.plantillas.map((plantilla, indice) => `<option value="${indice}">${plantilla.descripcion || plantilla.nivel || `Plantilla ${indice + 1}`}</option>`).join('');
    seleccionar('#rutina-grupo').innerHTML = '<option value="">Todos los grupos</option>' + estado.ejercicios.map((grupo, indice) => `<option value="${indice}">${grupo.grupo}</option>`).join('');
    actualizarEjercicios();
  } catch (error) {
    if (sesionCaducada(error)) return;
    mensaje(error?.mensaje || 'No se pudieron cargar los catálogos de rutinas.', 'error');
  }
}

function actualizarEjercicios() {
  const grupo = seleccionar('#rutina-grupo');
  const ejercicio = seleccionar('#rutina-ejercicio');
  if (!grupo || !ejercicio) return;
  const datos = grupo.value === '' ? estado.ejercicios.flatMap((g) => g.ejercicios || []) : (estado.ejercicios[Number(grupo.value)]?.ejercicios || []);
  ejercicio.innerHTML = '<option value="">Selecciona un ejercicio</option>' + datos.map((e, indice) => `<option value="${indice}">${e.nombre}</option>`).join('');
  ejercicio.dataset.grupo = grupo.value;
}

function pintarFormulario() {
  if (!seleccionar('#rutina-id')) return;
  seleccionar('#rutina-id').value = estado.id || '';
  seleccionar('#rutina-cliente').value = estado.clienteId || '';
  seleccionar('#rutina-nivel').value = estado.nivelId || 'PRI';
  seleccionar('#rutina-objetivo').value = estado.objetivo || '';
  seleccionar('#rutina-inicio').value = estado.fechaInicio || '';
  seleccionar('#rutina-fin').value = estado.fechaFin || '';
  seleccionar('#editor-rutina-titulo').textContent = estado.id ? `Editar rutina #${estado.id}` : 'Nueva rutina';
}

function pintarEditor() {
  const contenedor = seleccionar('#rutina-dias');
  if (contenedor) contenedor.innerHTML = editorDias(estado.detalle, estado.ejercicios);
}

function capturarFormulario() {
  if (!seleccionar('#rutina-id')) return;
  estado.id = seleccionar('#rutina-id').value || null;
  estado.clienteId = seleccionar('#rutina-cliente').value;
  estado.nivelId = seleccionar('#rutina-nivel').value;
  estado.objetivo = seleccionar('#rutina-objetivo').value.trim();
  estado.fechaInicio = seleccionar('#rutina-inicio').value;
  estado.fechaFin = seleccionar('#rutina-fin').value;
  const dias = [...document.querySelectorAll('[data-dia-editor]')].map((nodo) => {
    const indice = nodo.dataset.diaEditor;
    const ejercicios = [...nodo.querySelectorAll('[data-ejercicio-editor]')].map((fila) => {
      const ejIndice = fila.dataset.ejercicioEditor;
      const valor = (campo) => fila.querySelector(`[data-campo="${campo}"][data-dia="${indice}"][data-ejercicio="${ejIndice}"]`);
      const numero = (campo) => {
        const crudo = valor(campo)?.value;
        return crudo === '' || crudo === undefined || crudo === null ? null : Number(crudo);
      };
      return {
        nombre: valor('ej-nombre')?.value.trim() || '',
        grupo: valor('ej-grupo')?.value || null,
        series: numero('ej-series'),
        repeticiones: numero('ej-repeticiones'),
        tiempo: numero('ej-tiempo'),
        descanso: valor('ej-descanso')?.value.trim() || '60s',
        nota: valor('ej-nota')?.value.trim() || '',
        editable: valor('ej-editable')?.checked !== false
      };
    });
    return { nombre: nodo.querySelector('[data-campo="dia-nombre"]')?.value.trim() || '', ejercicios };
  });
  estado.detalle = { editable: true, dias };
}

function validar() {
  if (!/^\d{10}$/.test(estado.clienteId)) return 'Selecciona un cliente válido.';
  if (!estado.nivelId) return 'Selecciona el nivel de entrenamiento.';
  if (estado.objetivo.length < 3) return 'Escribe un objetivo de al menos 3 caracteres.';
  if (!estado.detalle.dias.length) return 'Agrega al menos un día a la rutina.';
  for (const dia of estado.detalle.dias) {
    if (dia.nombre.length < 3) return 'Cada día necesita un nombre de al menos 3 caracteres.';
    if (!dia.ejercicios.length) return `Agrega al menos un ejercicio a ${dia.nombre}.`;
    for (const ejercicio of dia.ejercicios) {
      if (ejercicio.nombre.length < 2) return 'Cada ejercicio necesita un nombre de al menos 2 caracteres.';
      if (!(ejercicio.repeticiones > 0 || ejercicio.tiempo > 0)) return `${ejercicio.nombre} necesita repeticiones o tiempo.`;
    }
  }
  if (estado.fechaFin && estado.fechaInicio && estado.fechaFin < estado.fechaInicio) return 'La fecha de fin no puede ser anterior a la de inicio.';
  return '';
}

async function cargarLista() {
  const cuerpo = seleccionar('[data-tabla-rutinas]');
  const paginacion = seleccionar('[data-paginacion="rutinas"]');
  if (!cuerpo) return;
  try {
    const respuesta = await rutinaModel.listar({ mias: 'S', page: pagina, limit: 10, ...(filtroCliente ? { clienteId: filtroCliente } : {}) });
    const filas = lista(respuesta);
    cuerpo.innerHTML = filas.length ? filas.map(filaRutina).join('') : filasVaciasRutinas('No hay rutinas para este cliente.');
    if (paginacion) paginacion.innerHTML = paginasRutinas(respuesta?.pagination);
  } catch (error) {
    if (sesionCaducada(error)) return;
    cuerpo.innerHTML = filasVaciasRutinas(error?.mensaje || 'No se pudieron cargar las rutinas.');
    mensaje(error?.mensaje || 'No se pudieron cargar las rutinas.', 'error');
  }
}

async function verFicha() {
  const cedula = seleccionar('#ficha-cedula')?.value.trim();
  if (!/^\d{10}$/.test(cedula || '')) {
    mensaje('Indica una cédula de 10 dígitos para ver la ficha.', 'error');
    return;
  }
  try {
    const ficha = await rutinaModel.fichaCliente(cedula);
    seleccionar('#ficha-cliente').innerHTML = fichaCliente(ficha);
    mensaje(`Ficha de ${ficha.nombre} cargada.`, 'exito');
  } catch (error) {
    if (sesionCaducada(error)) return;
    seleccionar('#ficha-cliente').innerHTML = '';
    mensaje(error?.mensaje || 'No se pudo cargar la ficha del cliente.', 'error');
  }
}

async function cargarRutina(id) {
  try {
    const rutina = await rutinaModel.detalle(id);
    estado.id = rutina.id;
    estado.clienteId = rutina.clienteId;
    estado.nivelId = rutina.nivelId || 'PRI';
    estado.objetivo = rutina.objetivo || '';
    estado.fechaInicio = rutina.fechaInicio || '';
    estado.fechaFin = rutina.fechaFin || '';
    estado.detalle = rutina.detalle || { editable: true, dias: [] };
    pintarFormulario();
    pintarEditor();
    seleccionar('#editor-rutina').scrollIntoView({ behavior: 'smooth', block: 'start' });
    mensaje(`Rutina #${rutina.id} cargada para editar.`, 'info');
  } catch (error) {
    if (sesionCaducada(error)) return;
    mensaje(error?.mensaje || 'No se pudo cargar la rutina.', 'error');
  }
}

function nuevaRutina(cedula = '') {
  estado.id = null;
  estado.clienteId = cedula;
  estado.nivelId = 'PRI';
  estado.objetivo = '';
  estado.fechaInicio = '';
  estado.fechaFin = '';
  estado.detalle = { editable: true, dias: [] };
  pintarFormulario();
  pintarEditor();
  seleccionar('#editor-rutina').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function aplicarPlantilla() {
  const indice = seleccionar('#rutina-plantilla').value;
  if (indice === '') return;
  const plantilla = estado.plantillas[Number(indice)];
  if (!plantilla) return;
  estado.detalle = JSON.parse(JSON.stringify({ editable: true, dias: plantilla.dias || [] }));
  if (plantilla.nivel) estado.nivelId = plantilla.nivel;
  pintarFormulario();
  pintarEditor();
  mensaje(`Plantilla ${plantilla.descripcion || plantilla.nivel} aplicada.`, 'info');
}

function agregarDia() {
  capturarFormulario();
  estado.detalle.dias.push({ nombre: `Día ${estado.detalle.dias.length + 1}`, ejercicios: [] });
  pintarEditor();
}

function agregarEjercicio(diaIndice) {
  capturarFormulario();
  const dia = estado.detalle.dias[Number(diaIndice)];
  if (!dia) return;
  const grupoIndice = seleccionar('#rutina-grupo').value;
  const ejercicioIndice = seleccionar('#rutina-ejercicio').value;
  const grupos = grupoIndice === '' ? estado.ejercicios : [estado.ejercicios[Number(grupoIndice)]];
  const elegido = ejercicioIndice === '' ? null : (grupoIndice === ''
    ? estado.ejercicios.flatMap((g) => g.ejercicios || [])[Number(ejercicioIndice)]
    : estado.ejercicios[Number(grupoIndice)]?.ejercicios?.[Number(ejercicioIndice)]);
  const plantilla = elegido || grupos.find((g) => g?.ejercicios?.length)?.ejercicios[0];
  dia.ejercicios.push({
    nombre: plantilla?.nombre || 'Nuevo ejercicio',
    grupo: plantilla?.grupo || null,
    series: plantilla?.series || 3,
    repeticiones: plantilla?.repeticiones || 12,
    tiempo: plantilla?.tiempo || null,
    descanso: plantilla?.descanso || '60s',
    nota: plantilla?.nota || '',
    editable: true
  });
  pintarEditor();
}

async function guardar() {
  capturarFormulario();
  const error = validar();
  if (error) {
    mensaje(error, 'error');
    return;
  }
  const body = {
    clienteId: estado.clienteId,
    nivelId: estado.nivelId,
    objetivo: estado.objetivo,
    detalle: estado.detalle,
    fechaInicio: estado.fechaInicio || undefined
  };
  if (estado.fechaFin) body.fechaFin = estado.fechaFin;
  const boton = seleccionar('#rutina-guardar');
  boton.disabled = true;
  try {
    const rutina = estado.id ? await rutinaModel.editar(estado.id, body) : await rutinaModel.crear(body);
    estado.id = rutina.id;
    seleccionar('#rutina-id').value = rutina.id;
    mensaje(`Rutina #${rutina.id} guardada.`, 'exito');
    await cargarLista();
  } catch (errorApi) {
    if (sesionCaducada(errorApi)) return;
    mensaje(errorApi?.mensaje || 'No se pudo guardar la rutina.', 'error');
  } finally {
    boton.disabled = false;
  }
}

export async function iniciarRutinas() {
  if (document.body.dataset.pagina !== 'rutinas-admin') return;
  if (!haySesion()) {
    window.location.href = new URL('login.html?origen=rutinas', raizSitio()).href;
    return;
  }
  await Promise.all([cargarCatalogos(), cargarLista()]);
  pintarFormulario();
  pintarEditor();

  document.addEventListener('click', async (evento) => {
    const paginaSiguiente = evento.target.closest('[data-paginacion="rutinas"] [data-page]');
    if (paginaSiguiente && !paginaSiguiente.disabled) {
      pagina = Number(paginaSiguiente.dataset.page) || 1;
      await cargarLista();
      return;
    }
    if (evento.target.closest('#rutina-nueva')) { nuevaRutina(); return; }
    if (evento.target.closest('#rutina-aplicar')) { aplicarPlantilla(); return; }
    if (evento.target.closest('#rutina-agregar-dia')) { agregarDia(); return; }
    if (evento.target.closest('#rutina-guardar')) { await guardar(); return; }
    if (evento.target.closest('#ficha-buscar')) { await verFicha(); return; }
    if (evento.target.closest('#clientes-filtrar')) {
      capturarFormulario();
      filtroCliente = seleccionar('#clientes-filtro')?.value.trim() || '';
      pagina = 1;
      await cargarLista();
      return;
    }
    const editar = evento.target.closest('[data-editar-rutina]');
    if (editar) { await cargarRutina(editar.dataset.editarRutina); return; }
    const agregar = evento.target.closest('[data-agregar-ejercicio]');
    if (agregar) { agregarEjercicio(agregar.dataset.dia); return; }
    const quitarDia = evento.target.closest('[data-quitar-dia]');
    if (quitarDia) {
      capturarFormulario();
      estado.detalle.dias.splice(Number(quitarDia.dataset.dia), 1);
      pintarEditor();
      return;
    }
    const quitarEjercicio = evento.target.closest('[data-quitar-ejercicio]');
    if (quitarEjercicio) {
      capturarFormulario();
      estado.detalle.dias[Number(quitarEjercicio.dataset.dia)]?.ejercicios.splice(Number(quitarEjercicio.dataset.ejercicio), 1);
      pintarEditor();
    }
  });

  seleccionar('#rutina-grupo')?.addEventListener('change', actualizarEjercicios);
}
