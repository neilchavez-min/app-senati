import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { EntregaLocal, Tarea } from './models/tarea.model';
import { StorageService } from './services/storage.service';
import { TareaService } from './services/tarea.service';

// Datos sintéticos que permiten probar filtros y entregas sin depender del archivo JSON.
const tareas: Tarea[] = [
  {
    id: 101,
    curso: 'Desarrollo de Software PWA',
    titulo: 'Configuración de IndexedDB',
    instructor: 'Ing. Jorge Luque',
    fechaEntrega: '2026-10-15',
    estado: 'Pendiente'
  },
  {
    id: 102,
    curso: 'Base de Datos Avanzada',
    titulo: 'Script DDL PostgreSQL',
    instructor: 'Ing. Carlos Mendoza',
    fechaEntrega: '2026-10-18',
    estado: 'Completado'
  }
];

// Pruebas del acceso de demostración y de los principales flujos de la bandeja local.
describe('App', () => {
  let storage: {
    guardarEntregaLocal: ReturnType<typeof vi.fn>;
    listarEntregas: ReturnType<typeof vi.fn>;
    eliminarEntrega: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // Aísla cada caso de prueba y reemplaza IndexedDB/HTTP por dobles controlados.
    localStorage.removeItem('senatiTaskHubDemoUser');
    storage = {
      guardarEntregaLocal: vi.fn().mockResolvedValue(undefined),
      listarEntregas: vi.fn().mockResolvedValue([]),
      eliminarEntrega: vi.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: TareaService, useValue: { obtenerTareas: () => of(tareas) } },
        { provide: StorageService, useValue: storage }
      ]
    }).compileComponents();
  });

  // El acceso local valida formato, abre el panel y nunca persiste la contraseña.
  it('validates demo sign-in details and opens the dashboard without storing a password', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.correoAcceso = 'juan.perez@senati.pe';
    app.claveAcceso = 'clave-demo';

    app.ingresar();

    expect(app.vistaActual).toBe('aplicacion');
    expect(app.nombreUsuario).toBe('Juan Perez');
    expect(localStorage.getItem('senatiTaskHubDemoUser')).toBe('Juan Perez');
    expect(localStorage.getItem('claveAcceso')).toBeNull();
    expect(app.claveAcceso).toBe('');
  });

  // El formulario permanece visible y muestra validación cuando el correo no es válido.
  it('rejects invalid demo sign-in details', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.correoAcceso = 'correo-invalido';
    app.claveAcceso = '12345';

    app.ingresar();

    expect(app.vistaActual).toBe('login');
    expect(app.errorAcceso).toContain('correo electrónico válido');
  });

  // El registro exige un nombre antes de crear la sesión de demostración.
  it('requires a name before creating a demo registration', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.vistaActual = 'registro';
    app.correoAcceso = 'alumna@senati.pe';
    app.claveAcceso = 'clave-demo';

    app.registrarse();

    expect(app.vistaActual).toBe('registro');
    expect(app.errorAcceso).toContain('nombre');
    expect(localStorage.getItem('senatiTaskHubDemoUser')).toBeNull();
  });

  // Un registro válido guarda solo el nombre de usuario en el almacenamiento del navegador.
  it('creates a local demo session from registration without persisting the password', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.vistaActual = 'registro';
    app.nombreRegistro = 'María López';
    app.correoAcceso = 'maria@senati.pe';
    app.claveAcceso = 'clave-demo';

    app.registrarse();

    expect(app.vistaActual).toBe('aplicacion');
    expect(app.nombreUsuario).toBe('María López');
    expect(localStorage.getItem('senatiTaskHubDemoUser')).toBe('María López');
    expect(localStorage.getItem('claveAcceso')).toBeNull();
  });

  // Cerrar sesión elimina la identidad local y devuelve la interfaz al acceso.
  it('clears the local demo session on sign out', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.vistaActual = 'aplicacion';
    app.nombreUsuario = 'Juan Perez';
    localStorage.setItem('senatiTaskHubDemoUser', app.nombreUsuario);

    app.cerrarSesion();

    expect(app.vistaActual).toBe('login');
    expect(localStorage.getItem('senatiTaskHubDemoUser')).toBeNull();
  });

  // Los filtros por texto y curso se aplican simultáneamente.
  it('filters tasks by title and course together', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.listaTareas = tareas;
    app.busquedaTitulo = 'indexeddb';
    app.cursoSeleccionado = 'Desarrollo de Software PWA';

    expect(app.tareasFiltradas.map((tarea) => tarea.id)).toEqual([101]);

    app.cursoSeleccionado = 'Base de Datos Avanzada';
    expect(app.tareasFiltradas).toEqual([]);
  });

  // Una entrega sin tarea seleccionada o comentario no debe persistirse.
  it('rejects a submission without both a task and a comment', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.listaTareas = tareas;
    app.comentarioEntrega = '   ';

    await app.enviarEntrega();

    expect(app.errorTareaId).toContain('Selecciona');
    expect(app.errorComentario).toContain('Escribe');
    expect(storage.guardarEntregaLocal).not.toHaveBeenCalled();
  });

  // Una entrega válida queda pendiente aunque exista conexión mientras no haya API.
  it('stores a valid submission locally and leaves it pending while online', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.listaTareas = tareas;
    app.tareaSeleccionadaId = 101;
    app.comentarioEntrega = '  Avance del laboratorio  ';
    app.online = true;

    await app.enviarEntrega();

    expect(storage.guardarEntregaLocal).toHaveBeenCalledWith({
      tareaId: 101,
      curso: 'Desarrollo de Software PWA',
      tituloTarea: 'Configuración de IndexedDB',
      comentario: 'Avance del laboratorio'
    });
    expect(app.comentarioEntrega).toBe('');
    expect(app.notificacionMensaje).toContain('PENDIENTE');
    expect(app.notificacionMensaje).toContain('No se envió al servidor');
  });

  // Recuperar conectividad no cambia automáticamente el estado de una entrega.
  it('does not change pending deliveries to synchronized when connectivity returns', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.entregasLocales = [{
      id: 1,
      tareaId: 101,
      curso: tareas[0].curso,
      tituloTarea: tareas[0].titulo,
      comentario: 'Entrega',
      fechaRegistro: '2026-10-15T12:00:00.000Z',
      estadoSincronizacion: 'PENDIENTE',
      intentosSincronizacion: 0
    } satisfies EntregaLocal];

    app.alConectarse();

    expect(app.entregasPendientes).toBe(1);
    expect(app.entregasLocales[0].estadoSincronizacion).toBe('PENDIENTE');
    expect(app.notificacionMensaje).toContain('API');
  });

  // La acción de reintento debe informar la limitación sin simular un envío exitoso.
  it('offers an explicit retry without pretending the API call succeeded', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.entregasLocales = [{
      id: 2,
      tareaId: 101,
      curso: tareas[0].curso,
      tituloTarea: tareas[0].titulo,
      comentario: 'Entrega',
      fechaRegistro: '2026-10-15T12:00:00.000Z',
      estadoSincronizacion: 'PENDIENTE',
      intentosSincronizacion: 0
    }];

    app.reintentarSincronizacion();

    expect(app.entregasPendientes).toBe(1);
    expect(app.entregasLocales[0].estadoSincronizacion).toBe('PENDIENTE');
    expect(app.notificacionMensaje).toContain('falta integrar una API');
  });

  // La eliminación requiere confirmación explícita antes de modificar IndexedDB.
  it('deletes a local submission only after explicit confirmation', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const entrega: EntregaLocal = {
      id: 3,
      tareaId: 101,
      curso: tareas[0].curso,
      tituloTarea: tareas[0].titulo,
      comentario: 'Entrega',
      fechaRegistro: '2026-10-15T12:00:00.000Z',
      estadoSincronizacion: 'PENDIENTE',
      intentosSincronizacion: 0
    };
    app.entregasLocales = [entrega];

    app.solicitarEliminacion(entrega);
    app.cancelarEliminacion();
    expect(storage.eliminarEntrega).not.toHaveBeenCalled();

    app.solicitarEliminacion(entrega);
    await app.confirmarEliminacion(entrega);

    expect(storage.eliminarEntrega).toHaveBeenCalledWith(3);
    expect(app.entregasLocales).toEqual([]);
  });
});
