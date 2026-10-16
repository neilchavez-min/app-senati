/** Tarea del catálogo JSON que puede relacionarse con una entrega local. */
export interface Tarea {
  id: number;
  curso: string;
  titulo: string;
  instructor: string;
  fechaEntrega: string;
  estado: string;
}

/** Estados permitidos para representar una entrega en la cola de sincronización. */
export type EstadoSincronizacion = 'PENDIENTE' | 'SINCRONIZADO' | 'ERROR';

/** Registro persistido en IndexedDB, incluido su estado y metadatos de reintento. */
export interface EntregaLocal {
  id: number;
  tareaId: number;
  curso: string;
  tituloTarea: string;
  comentario: string;
  fechaRegistro: string;
  estadoSincronizacion: EstadoSincronizacion;
  intentosSincronizacion: number;
  ultimoError?: string;
}

/** Campos que aporta el formulario antes de que IndexedDB genere los metadatos locales. */
export interface EntregaPayload {
  tareaId: number;
  curso: string;
  tituloTarea: string;
  comentario: string;
}
