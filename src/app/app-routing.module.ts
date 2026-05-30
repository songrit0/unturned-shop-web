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
import { AdminVipComponent } from './pages/admin-vip/admin-vip.component';
import { VipComponent } from './pages/vip/vip.component';
import { AdminQuestsComponent } from './pages/admin-quests/admin-quests.component';
import { AdminItemTypesComponent } from './pages/admin-item-types/admin-item-types.component';
import { AdminItemsComponent } from './pages/admin-items/admin-items.component';
import { QuestsComponent } from './pages/quests/quests.component';
import { MarketDetailComponent } from './pages/market-detail/market-detail.component';
import { MarketHistoryComponent } from './pages/market-history/market-history.component';
import { VaultsComponent } from './pages/vaults/vaults.component';
import { P2pMarketComponent } from './pages/p2p-market/p2p-market.component';
import { MyListingsComponent } from './pages/my-listings/my-listings.component';
import { AdminVaultsComponent } from './pages/admin-vaults/admin-vaults.component';
import { MySubmissionsComponent } from './pages/my-submissions/my-submissions.component';
import { AdminItemSubmissionsComponent } from './pages/admin-item-submissions/admin-item-submissions.component';
import { InventoryComponent } from './pages/inventory/inventory.component';
import { adminGuard } from './guards/admin.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: '', component: HomeComponent, canActivate: [authGuard] },
  { path: 'shop', component: ShopComponent, canActivate: [authGuard] },
  { path: 'bills', component: BillsComponent, canActivate: [authGuard] },
  { path: 'coins', component: CoinsComponent, canActivate: [authGuard] },
  { path: 'codes', component: CodesComponent, canActivate: [authGuard] },
  { path: 'vip', component: VipComponent, canActivate: [authGuard] },
  { path: 'help', component: HelpComponent },
  { path: 'quests', component: QuestsComponent, canActivate: [authGuard] },
  { path: 'admin/market', component: AdminMarketComponent, canActivate: [adminGuard] },
  { path: 'admin/coins', component: AdminCoinsComponent, canActivate: [adminGuard] },
  { path: 'admin/vip', component: AdminVipComponent, canActivate: [adminGuard] },
  { path: 'admin/quests', component: AdminQuestsComponent, canActivate: [adminGuard] },
  { path: 'admin/item-types', component: AdminItemTypesComponent, canActivate: [adminGuard] },
  { path: 'admin/items', component: AdminItemsComponent, canActivate: [adminGuard] },
  { path: 'market/history', component: MarketHistoryComponent, canActivate: [authGuard] },
  { path: 'market/:id', component: MarketDetailComponent, canActivate: [authGuard] },
  { path: 'vaults', component: VaultsComponent, canActivate: [authGuard] },
  { path: 'p2p-market', component: P2pMarketComponent, canActivate: [authGuard] },
  { path: 'my-listings', component: MyListingsComponent, canActivate: [authGuard] },
  { path: 'admin/vaults', component: AdminVaultsComponent, canActivate: [adminGuard] },
  { path: 'my-submissions', component: MySubmissionsComponent, canActivate: [authGuard] },
  { path: 'admin/submissions', component: AdminItemSubmissionsComponent, canActivate: [adminGuard] },
  { path: 'inventory', component: InventoryComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
