import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../core/api.service';
import type {
  ReadinessFeedbackIssue,
  ReadinessFeedbackSnapshot,
  SaveReadinessFeedbackPayload,
} from '../../core/project-readiness.model';

@Injectable({ providedIn: 'root' })
export class ReadinessFeedbackService {
  private readonly api = inject(ApiService);

  getFeedback(): Observable<ReadinessFeedbackSnapshot> {
    return this.api
      .get<ReadinessFeedbackSnapshot>('/readiness/feedback')
      .pipe(map((response) => response.data));
  }

  saveIssue(payload: SaveReadinessFeedbackPayload): Observable<ReadinessFeedbackIssue> {
    return this.api
      .post<ReadinessFeedbackIssue>('/readiness/feedback', payload)
      .pipe(map((response) => response.data));
  }

  resolveIssue(id: string, resolutionNote?: string): Observable<ReadinessFeedbackIssue> {
    return this.api
      .patch<ReadinessFeedbackIssue>(`/readiness/feedback/${id}`, {
        resolution_note: resolutionNote ?? '',
      })
      .pipe(map((response) => response.data));
  }
}
