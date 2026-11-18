import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `
    @if (!online()) {
      <div class="aviso-offline" role="status">
        ⚠ Sem internet – seus registros ficam salvos neste celular
      </div>
    }
    <router-outlet />
  `,
})
export class App {
  protected readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.online.set(true));
      window.addEventListener('offline', () => this.online.set(false));
    }
  }
}
