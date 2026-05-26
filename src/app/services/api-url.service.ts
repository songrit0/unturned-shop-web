import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiUrlService {
  private _url: string | null = null;

  /** Resolved on APP_INITIALIZER. After this, get() never returns null. */
  async load(): Promise<void> {
    // Try Firestore first if firebase config has a projectId.
    if (environment.firebase.projectId) {
      try {
        const app = initializeApp(environment.firebase);
        const fs = getFirestore(app);
        const [coll, name] = environment.apiUrlDoc.split('/');
        const snap = await getDoc(doc(fs, coll, name));
        if (snap.exists()) {
          const data = snap.data() as { url?: string };
          if (data?.url) { this._url = data.url; return; }
        }
        console.warn('[ApiUrl] Firestore doc missing url field, using fallback');
      } catch (e) {
        console.warn('[ApiUrl] Firestore lookup failed, using fallback', e);
      }
    }
    this._url = environment.apiUrlFallback || '';
  }

  get(): string {
    return this._url ?? environment.apiUrlFallback ?? '';
  }
}
