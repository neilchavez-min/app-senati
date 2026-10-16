import { Injectable } from '@angular/core';
import { EntregaLocal, EntregaPayload, EstadoSincronizacion } from '../models/tarea.model';

/** Encapsula el ciclo de vida y las operaciones transaccionales de IndexedDB. */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  /** Identificador persistente de la base de datos del navegador. */
  private readonly dbName = 'senatiTaskDB';

  /** Almacén de registros locales; conserva el nombre usado por versiones anteriores. */
  private readonly storeName = 'entregas_pendientes';

  /**
   * Abre la versión actual de la base y crea o migra el almacén en la primera actualización.
   * Los registros antiguos sin confirmación de servidor se conservan como pendientes.
   */
  async abrirDB(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB no está disponible en este navegador.');
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const request = indexedDB.open(this.dbName, 2);

      request.onupgradeneeded = () => {
        const db = request.result;
        // Una instalación nueva necesita el almacén; las existentes migran sus registros.
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });
          return;
        }

        const transaction = request.transaction;
        if (!transaction) {
          reject(new Error('No se pudo iniciar la migración de IndexedDB.'));
          return;
        }

        const cursorRequest = transaction.objectStore(this.storeName).openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) {
            return;
          }

          // Normaliza datos de versiones anteriores sin descartar campos desconocidos por ausencia.
          const anterior = cursor.value as Record<string, unknown>;
          const estadoAnterior = anterior['estadoSincronizacion'];
          const entregaMigrada: Omit<EntregaLocal, 'id'> = {
            tareaId: typeof anterior['tareaId'] === 'number' ? anterior['tareaId'] : 0,
            curso: typeof anterior['curso'] === 'string' ? anterior['curso'] : 'Curso no disponible',
            tituloTarea: typeof anterior['tituloTarea'] === 'string'
              ? anterior['tituloTarea']
              : `Entrega local ${String(anterior['id'] ?? cursor.primaryKey)}`,
            comentario: typeof anterior['comentario'] === 'string' ? anterior['comentario'] : '',
            fechaRegistro: typeof anterior['fechaRegistro'] === 'string'
              ? anterior['fechaRegistro']
              : new Date().toISOString(),
            estadoSincronizacion: estadoAnterior === 'SINCRONIZADO' || estadoAnterior === 'ERROR'
              ? estadoAnterior
              : 'PENDIENTE',
            intentosSincronizacion: typeof anterior['intentosSincronizacion'] === 'number'
              ? anterior['intentosSincronizacion']
              : 0,
            ...(typeof anterior['ultimoError'] === 'string' ? { ultimoError: anterior['ultimoError'] } : {})
          };

          cursor.update({ id: cursor.primaryKey as number, ...entregaMigrada });
          cursor.continue();
        };
      };

      request.onsuccess = () => {
        // Un evento `blocked` ya pudo rechazar la apertura mientras otra pestaña retenía la BD.
        if (settled) {
          request.result.close();
          return;
        }
        settled = true;
        resolve(request.result);
      };
      request.onerror = () => {
        if (!settled) {
          settled = true;
          reject(request.error ?? new Error('No se pudo abrir IndexedDB.'));
        }
      };
      request.onblocked = () => {
        if (!settled) {
          settled = true;
          reject(new Error('IndexedDB está bloqueada por otra pestaña abierta.'));
        }
      };
    });
  }

  /** Guarda una entrega con fecha y estado inicial pendiente dentro de una transacción atómica. */
  async guardarEntregaLocal(entrega: EntregaPayload): Promise<void> {
    const db = await this.abrirDB();

    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const registro = {
          ...entrega,
          fechaRegistro: new Date().toISOString(),
          estadoSincronizacion: 'PENDIENTE' as const,
          intentosSincronizacion: 0
        };

        store.add(registro);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('No se pudo guardar la entrega.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Se canceló el guardado de la entrega.'));
      });
    } finally {
      db.close();
    }
  }

  /** Recupera todos los registros para reconstruir la bandeja después de recargar. */
  async listarEntregas(): Promise<EntregaLocal[]> {
    const db = await this.abrirDB();

    try {
      return await new Promise<EntregaLocal[]>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const request = transaction.objectStore(this.storeName).getAll();

        request.onsuccess = () => resolve(request.result as EntregaLocal[]);
        request.onerror = () => reject(request.error ?? new Error('No se pudieron consultar las entregas.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Se canceló la consulta de entregas.'));
      });
    } finally {
      db.close();
    }
  }

  /** Consulta un registro por su clave local, devolviendo `undefined` si no existe. */
  async obtenerEntrega(id: number): Promise<EntregaLocal | undefined> {
    const db = await this.abrirDB();

    try {
      return await new Promise<EntregaLocal | undefined>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const request = transaction.objectStore(this.storeName).get(id);

        request.onsuccess = () => resolve(request.result as EntregaLocal | undefined);
        request.onerror = () => reject(request.error ?? new Error('No se pudo consultar la entrega.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Se canceló la consulta de la entrega.'));
      });
    } finally {
      db.close();
    }
  }

  /** Elimina de forma persistente la entrega identificada por su clave local. */
  async eliminarEntrega(id: number): Promise<void> {
    const db = await this.abrirDB();

    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        transaction.objectStore(this.storeName).delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('No se pudo eliminar la entrega.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Se canceló la eliminación de la entrega.'));
      });
    } finally {
      db.close();
    }
  }

  /** Cuenta entregas pendientes a partir de los registros persistidos. */
  async contarPendientes(): Promise<number> {
    const entregas = await this.listarEntregas();
    return entregas.filter((entrega) => entrega.estadoSincronizacion === 'PENDIENTE').length;
  }

  /** Actualiza estado, número de intentos y último error en una sola transacción. */
  async actualizarEstado(
    id: number,
    estado: EstadoSincronizacion,
    ultimoError?: string
  ): Promise<void> {
    const db = await this.abrirDB();

    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(id);

        request.onsuccess = () => {
          const entrega = request.result as EntregaLocal | undefined;
          if (!entrega) {
            transaction.abort();
            reject(new Error(`No existe una entrega local con el identificador ${id}.`));
            return;
          }

          entrega.estadoSincronizacion = estado;
          entrega.intentosSincronizacion += 1;
          if (ultimoError) {
            entrega.ultimoError = ultimoError;
          } else {
            delete entrega.ultimoError;
          }
          store.put(entrega);
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('No se pudo actualizar el estado.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Se canceló la actualización del estado.'));
      });
    } finally {
      db.close();
    }
  }
}
