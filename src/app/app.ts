import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TareaService } from './services/tarea.service';
import { StorageService } from './services/storage.service';
import { EntregaLocal, EntregaPayload, Tarea } from './models/tarea.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html'
})
export class App implements OnInit {
  /** Fecha usada en el saludo del panel principal. */
  readonly hoy = new Date();

  /** Estado de red del navegador, independiente del estado de sincronización. */
  online = navigator.onLine;

  /** Servicios usados para consultar tareas y persistir las entregas locales. */
  private readonly tareaService = inject(TareaService);
  private readonly storageService = inject(StorageService);

  /** Permite actualizar la vista después de completar operaciones asíncronas. */
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  /** Controla el acceso inicial y la sección visible tras iniciar sesión. */
  vistaActual: 'login' | 'registro' | 'aplicacion' = 'login';
  seccionActual: 'inicio' | 'tareas' | 'entregas' | 'perfil' = 'inicio';

  /** Datos temporales del formulario y nombre visible de la sesión demostrativa. */
  nombreUsuario = '';
  correoAcceso = '';
  claveAcceso = '';
  nombreRegistro = '';
  mostrarClave = false;
  errorAcceso = '';

  /** Datos para renderizar la lista, los formularios y las bandejas de la interfaz. */
  listaTareas: Tarea[] = [];
  entregasLocales: EntregaLocal[] = [];
  tareaSeleccionadaId: number | null = null;
  comentarioEntrega = '';
  busquedaTitulo = '';
  cursoSeleccionado = '';
  cargandoTareas = true;
  cargandoEntregas = true;
  notificacionMensaje = '';
  tipoNotificacion: 'exito' | 'pendiente' | 'error' | '' = '';
  errorTareaId = '';
  errorComentario = '';
  entregaAEliminarId: number | null = null;

  /** Recupera la sesión de demostración si existe y carga catálogo y entregas persistidas. */
  ngOnInit(): void {
    try {
      const usuarioGuardado = localStorage.getItem('senatiTaskHubDemoUser');
      if (usuarioGuardado) {
        this.nombreUsuario = usuarioGuardado;
        this.vistaActual = 'aplicacion';
      }
    } catch (error) {
      console.error('No se pudo recuperar la sesión demostrativa:', error);
      this.notificacionMensaje = 'No se pudo recordar la sesión en este navegador. Inicia sesión nuevamente.';
      this.tipoNotificacion = 'error';
    }

    this.cargarTareas();
    void this.cargarEntregas();
  }

  /** Devuelve los cursos únicos del catálogo para los selectores de filtro. */
  get cursos(): string[] {
    return [...new Set(this.listaTareas.map((tarea) => tarea.curso))].sort((a, b) => a.localeCompare(b));
  }

  /** Aplica simultáneamente el texto buscado y el curso a la lista de tareas. */
  get tareasFiltradas(): Tarea[] {
    const busqueda = this.busquedaTitulo.trim().toLocaleLowerCase();
    return this.listaTareas.filter((tarea) => {
      const coincideTitulo = !busqueda || tarea.titulo.toLocaleLowerCase().includes(busqueda);
      const coincideCurso = !this.cursoSeleccionado || tarea.curso === this.cursoSeleccionado;
      return coincideTitulo && coincideCurso;
    });
  }

  /** Filtra la bandeja local con los mismos criterios del catálogo. */
  get entregasFiltradas(): EntregaLocal[] {
    const busqueda = this.busquedaTitulo.trim().toLocaleLowerCase();
    return this.entregasLocales.filter((entrega) => {
      const coincideTitulo = !busqueda || entrega.tituloTarea.toLocaleLowerCase().includes(busqueda);
      const coincideCurso = !this.cursoSeleccionado || entrega.curso === this.cursoSeleccionado;
      return coincideTitulo && coincideCurso;
    });
  }

  /** Cuenta exclusivamente registros que todavía están pendientes de confirmación remota. */
  get entregasPendientes(): number {
    return this.entregasLocales.filter((entrega) => entrega.estadoSincronizacion === 'PENDIENTE').length;
  }

  /** Calcula los contadores académicos que se muestran en las tarjetas del panel. */
  get tareasEnCurso(): number {
    return this.listaTareas.filter((tarea) => tarea.estado.toLocaleLowerCase() === 'en curso').length;
  }

  get tareasCompletadas(): number {
    return this.listaTareas.filter((tarea) => tarea.estado.toLocaleLowerCase() === 'completado').length;
  }

  get tareasPendientesAcademicas(): number {
    return this.listaTareas.filter((tarea) => tarea.estado.toLocaleLowerCase() === 'pendiente').length;
  }

  /** Proporciona un nombre de respaldo para las vistas de usuario. */
  get saludoUsuario(): string {
    return this.nombreUsuario || 'Estudiante';
  }

  /** Alterna entre acceso y registro y limpia el error anterior del formulario. */
  cambiarModoAcceso(modo: 'login' | 'registro'): void {
    this.vistaActual = modo;
    this.errorAcceso = '';
    this.claveAcceso = '';
  }

  /** Valida los datos mínimos del acceso de demostración; no autentica contra un servidor. */
  ingresar(): void {
    this.errorAcceso = '';
    const correo = this.correoAcceso.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      this.errorAcceso = 'Escribe un correo electrónico válido.';
      return;
    }
    if (this.claveAcceso.trim().length < 6) {
      this.errorAcceso = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.nombreUsuario = this.nombreDesdeCorreo(correo);
    this.iniciarSesionDemo();
  }

  /** Valida el formulario de registro local sin crear una cuenta remota. */
  registrarse(): void {
    this.errorAcceso = '';
    const nombre = this.nombreRegistro.trim();
    const correo = this.correoAcceso.trim();
    if (nombre.length < 2) {
      this.errorAcceso = 'Escribe tu nombre para continuar.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      this.errorAcceso = 'Escribe un correo electrónico válido.';
      return;
    }
    if (this.claveAcceso.trim().length < 6) {
      this.errorAcceso = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.nombreUsuario = nombre;
    this.iniciarSesionDemo();
  }

  /** Elimina el nombre de sesión local y vuelve al formulario de acceso. */
  cerrarSesion(): void {
    try {
      localStorage.removeItem('senatiTaskHubDemoUser');
    } catch (error) {
      console.error('No se pudo borrar la sesión demostrativa:', error);
      this.mostrarNotificacion('No se pudo cerrar la sesión guardada en este navegador.', 'error');
      return;
    }

    this.vistaActual = 'login';
    this.seccionActual = 'inicio';
    this.claveAcceso = '';
    this.mostrarNotificacion('', 'exito');
  }

  /** Cambia la sección del panel seleccionada en la navegación. */
  seleccionarSeccion(seccion: 'inicio' | 'tareas' | 'entregas' | 'perfil'): void {
    this.seccionActual = seccion;
  }

  /** Crea un nombre legible a partir de la parte local de un correo electrónico. */
  private nombreDesdeCorreo(correo: string): string {
    const nombre = correo.split('@')[0].replace(/[._-]+/g, ' ').trim();
    return nombre.replace(/\b\p{L}/gu, (letra) => letra.toLocaleUpperCase()) || 'Estudiante';
  }

  /** Inicia la sesión de demostración y recuerda solo el nombre, nunca la contraseña. */
  private iniciarSesionDemo(): void {
    try {
      localStorage.setItem('senatiTaskHubDemoUser', this.nombreUsuario);
    } catch (error) {
      console.error('No se pudo guardar la sesión demostrativa:', error);
      this.mostrarNotificacion('No se pudo recordar la sesión; podrás continuar en esta pestaña.', 'error');
    }

    this.vistaActual = 'aplicacion';
    this.seccionActual = 'inicio';
    this.claveAcceso = '';
  }

  /** Presenta una fecha de entrega sin desplazar el día por la zona horaria local. */
  formatearFechaEntrega(fecha: string): string {
    const fechaUTC = new Date(`${fecha}T00:00:00Z`);
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'UTC' }).format(fechaUTC);
  }

  /** Traduce los estados académicos al nombre de clase que usa su indicador visual. */
  claseEstadoTarea(estado: string): string {
    const estadoNormalizado = estado.toLocaleLowerCase();
    if (estadoNormalizado === 'completado' || estadoNormalizado === 'entregada') {
      return 'completed';
    }
    if (estadoNormalizado === 'en curso') {
      return 'in-progress';
    }
    return 'pending';
  }

  /** Actualiza el indicador de red sin cambiar por ello los estados de las entregas. */
  @HostListener('window:online')
  alConectarse(): void {
    this.online = true;
    this.mostrarNotificacion(
      'Conexión restablecida. Las entregas siguen PENDIENTES: esta app aún no tiene una API para sincronizarlas.',
      'pendiente'
    );
  }

  /** Informa que falta una API; no simula un reintento ni altera los datos persistidos. */
  reintentarSincronizacion(): void {
    this.mostrarNotificacion(
      'No se puede reintentar todavía: falta integrar una API de entregas. Tus registros permanecen PENDIENTES.',
      'pendiente'
    );
  }

  /** Actualiza el modo local cuando el navegador pierde conexión. */
  @HostListener('window:offline')
  alDesconectarse(): void {
    this.online = false;
    this.mostrarNotificacion('Sin conexión. Puedes seguir guardando entregas en este dispositivo.', 'pendiente');
  }

  /** Recupera el catálogo JSON y notifica explícitamente si la consulta falla. */
  cargarTareas(): void {
    this.cargandoTareas = true;
    this.tareaService.obtenerTareas().subscribe({
      next: (data: Tarea[]) => {
        this.listaTareas = data;
        this.cargandoTareas = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (error: unknown) => {
        console.error('Error al recuperar el catálogo de tareas:', error);
        this.cargandoTareas = false;
        this.mostrarNotificacion('No se pudo cargar el catálogo de tareas. Intenta recargar la aplicación.', 'error');
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  /** Lee las entregas guardadas y siempre libera el indicador de carga. */
  async cargarEntregas(): Promise<boolean> {
    this.cargandoEntregas = true;
    try {
      this.entregasLocales = await this.storageService.listarEntregas();
      return true;
    } catch (error) {
      console.error('Error al recuperar entregas de IndexedDB:', error);
      this.mostrarNotificacion('No se pudieron recuperar las entregas locales. Revisa el almacenamiento del navegador.', 'error');
      return false;
    } finally {
      this.cargandoEntregas = false;
      this.changeDetectorRef.markForCheck();
    }
  }

  /** Valida y guarda la entrega seleccionada como pendiente en IndexedDB. */
  async enviarEntrega(): Promise<void> {
    this.errorTareaId = '';
    this.errorComentario = '';

    const tarea = this.listaTareas.find((item) => item.id === Number(this.tareaSeleccionadaId));
    const comentario = this.comentarioEntrega.trim();
    if (!tarea) {
      this.errorTareaId = 'Selecciona una tarea válida antes de guardar.';
    }
    if (!comentario) {
      this.errorComentario = 'Escribe un comentario para la entrega.';
    }
    if (!tarea || !comentario) {
      this.mostrarNotificacion('Completa los campos obligatorios para guardar la entrega.', 'error');
      return;
    }

    const entrega: EntregaPayload = {
      tareaId: tarea.id,
      curso: tarea.curso,
      tituloTarea: tarea.titulo,
      comentario
    };

    try {
      await this.storageService.guardarEntregaLocal(entrega);
      this.comentarioEntrega = '';
      if (!(await this.cargarEntregas())) {
        return;
      }

      if (this.online) {
        this.mostrarNotificacion(
          'Entrega guardada localmente con estado PENDIENTE. No se envió al servidor porque aún no hay una API configurada.',
          'pendiente'
        );
      } else {
        this.mostrarNotificacion('Entrega guardada en este dispositivo con estado PENDIENTE.', 'exito');
      }
    } catch (error) {
      console.error('Error al guardar la entrega local:', error);
      this.mostrarNotificacion('No se pudo guardar la entrega. Verifica que IndexedDB esté disponible y vuelve a intentar.', 'error');
    }
  }

  /** Muestra la confirmación previa a eliminar un registro local. */
  solicitarEliminacion(entrega: EntregaLocal): void {
    this.entregaAEliminarId = entrega.id;
  }

  /** Cancela la eliminación y conserva intacta la entrega. */
  cancelarEliminacion(): void {
    this.entregaAEliminarId = null;
  }

  /** Elimina el registro solo después de la confirmación explícita del usuario. */
  async confirmarEliminacion(entrega: EntregaLocal): Promise<void> {
    if (this.entregaAEliminarId !== entrega.id) {
      return;
    }

    try {
      await this.storageService.eliminarEntrega(entrega.id);
      this.entregasLocales = this.entregasLocales.filter((item) => item.id !== entrega.id);
      this.entregaAEliminarId = null;
      this.mostrarNotificacion('La entrega local se eliminó correctamente.', 'exito');
    } catch (error) {
      console.error('Error al eliminar la entrega local:', error);
      this.mostrarNotificacion('No se pudo eliminar la entrega local. Intenta nuevamente.', 'error');
    }
  }

  /** Actualiza el aviso accesible de estado y solicita renderizarlo. */
  private mostrarNotificacion(mensaje: string, tipo: 'exito' | 'pendiente' | 'error'): void {
    this.notificacionMensaje = mensaje;
    this.tipoNotificacion = tipo;
    this.changeDetectorRef.markForCheck();
  }
}
