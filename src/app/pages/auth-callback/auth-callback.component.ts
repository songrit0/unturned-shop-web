import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  template: `
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="inline-block w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>{{ 'callback.loading' | translate }}</p>
      </div>
    </div>
  `,
})
export class AuthCallbackComponent implements OnInit {
  constructor(private route: ActivatedRoute, private router: Router, private auth: AuthService) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
    this.auth.setToken(token);
    this.auth.refreshMe().subscribe(() => this.router.navigate(['/home']));
  }
}
