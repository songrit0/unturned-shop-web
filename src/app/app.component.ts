import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  template: `
    <app-header></app-header>
    <main class="min-h-[calc(100vh-7rem)]"><router-outlet></router-outlet></main>
    <app-footer></app-footer>
    <app-basket-drawer></app-basket-drawer>
  `,
})
export class AppComponent implements OnInit {
  constructor(private auth: AuthService) {}
  ngOnInit() { this.auth.refreshMe().subscribe(); }
}
