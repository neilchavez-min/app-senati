import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tarea } from '../models/tarea.model';

/** Lee el catálogo de tareas estático servido como recurso de la PWA. */
@Injectable({
  providedIn: 'root'
})
export class TareaService {
  /** Cliente HTTP configurado a nivel de aplicación. */
  private readonly http = inject(HttpClient);

  /** Ruta pública del catálogo JSON incluida en la carpeta `public`. */
  private readonly url = '/assets/data/tareas.json';

  /** Devuelve las tareas tipadas; los errores HTTP se propagan al suscriptor. */
  obtenerTareas(): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(this.url);
  }
}