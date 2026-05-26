import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { AuthCallbackComponent } from './pages/auth-callback/auth-callback.component';
import { HomeComponent } from './pages/home/home.component';
import { ShopComponent } from './pages/shop/shop.component';
import { BillsComponent } from './pages/bills/bills.component';
import { CoinsComponent } from './pages/coins/coins.component';
import { CodesComponent } from './pages/codes/codes.component';
import { HelpComponent } from './pages/help/help.component';
import { AdminMarketComponent } from './pages/admin-market/admin-market.component';
import { AdminCoinsComponent } from './pages/admin-coins/admin-coins.component';
import { adminGuard } from './guards/admin.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: '', component: HomeComponent, canActivate: [authGuard] },
  { path: 'shop', component: ShopComponent, canActivate: [authGuard] },
  { path: 'bills', component: BillsComponent, canActivate: [authGuard] },
  { path: 'coins', component: CoinsComponent, canActivate: [authGuard] },
  { path: 'codes', component: CodesComponent, canActivate: [authGuard] },
  { path: 'help', component: HelpComponent },
  { path: 'admin/market', component: AdminMarketComponent, canActivate: [adminGuard] },
  { path: 'admin/coins', component: AdminCoinsComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
