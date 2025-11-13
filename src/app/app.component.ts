import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import {
  IonApp, IonSplitPane, IonMenu, IonHeader, IonToolbar, IonTitle,
  IonContent, IonList, IonItem, IonIcon, IonLabel, IonRouterOutlet,
  IonMenuToggle
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  homeOutline, homeSharp,
  settingsOutline, settingsSharp,
  walletOutline, walletSharp,
  logOutOutline, logOutSharp
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonApp, IonSplitPane, IonMenu, IonHeader, IonToolbar, IonTitle,
    IonContent, IonList, IonItem, IonIcon, IonLabel, IonRouterOutlet, IonMenuToggle
  ],
})
export class AppComponent {
  public appPages = [
    { title: 'Home', url: '/home', icon: 'home' },
    { title: 'Opções', url: '/opcoes', icon: 'settings' },
    { title: 'Gastos', url: '/gastos', icon: 'wallet' }
  ];

  public nomeUsuario: string = 'Visitante';

  private auth = inject(AuthService);
  private router = inject(Router);

  constructor() {
    addIcons({
      homeOutline, homeSharp,
      settingsOutline, settingsSharp,
      walletOutline, walletSharp,
      logOutOutline, logOutSharp
    });

    const user = this.auth.getLoggedUser();
    this.nomeUsuario = user.nome || 'Visitante';
  }

  sair() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
