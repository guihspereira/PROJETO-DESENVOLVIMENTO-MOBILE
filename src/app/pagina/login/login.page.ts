import { Component, inject } from '@angular/core';
import {
  IonicModule,
  NavController,
  ToastController,
  ModalController
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  public usuario = '';
  public senha = '';

  private auth = inject(AuthService);
  private nav = inject(NavController);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);

  async entrar() {
    if (!this.usuario || !this.senha) {
      this.showToast('Preencha usuário e senha');
      return;
    }
    const ok = await this.auth.login(this.usuario.trim(), this.senha);
    if (ok) {
      this.showToast('Login efetuado');
      this.nav.navigateRoot(['/home']);
    } else {
      this.showToast('Usuário ou senha inválidos');
    }
  }

  async abrirModalRegistro() {
    const modal = await this.modalCtrl.create({
      component: RegistroModal,
      breakpoints: [0.5, 0.8],
      initialBreakpoint: 0.6
    });
    await modal.present();
  }

  async abrirModalRecuperacao() {
    const modal = await this.modalCtrl.create({
      component: RecuperarModal,
      breakpoints: [0.4],
      initialBreakpoint: 0.4
    });
    await modal.present();
  }

  private async showToast(msg: string, dur = 1400) {
    const t = await this.toastCtrl.create({ message: msg, duration: dur, position: 'bottom' });
    await t.present();
  }
}

@Component({
  selector: 'registro-modal',
  standalone: true,
  template: `
  <ion-content class="ion-padding">
    <h2>Criar Conta</h2>
    <ion-item><ion-label position="stacked">Nome</ion-label><ion-input [(ngModel)]="nome"></ion-input></ion-item>
    <ion-item><ion-label position="stacked">Idade</ion-label><ion-input type="number" [(ngModel)]="idade"></ion-input></ion-item>
    <ion-item><ion-label position="stacked">E-mail</ion-label><ion-input [(ngModel)]="email"></ion-input></ion-item>
    <ion-item><ion-label position="stacked">Nascimento</ion-label><ion-input type="date" [(ngModel)]="nascimento"></ion-input></ion-item>
    <ion-item><ion-label position="stacked">Usuário</ion-label><ion-input [(ngModel)]="username"></ion-input></ion-item>
    <ion-item><ion-label position="stacked">Senha</ion-label><ion-input type="password" [(ngModel)]="password"></ion-input></ion-item>
    <ion-button expand="block" color="success" (click)="registrar()">Criar Conta</ion-button>
    <ion-button expand="block" fill="clear" (click)="fechar()">Cancelar</ion-button>
  </ion-content>
  `,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class RegistroModal {
  nome = '';
  idade = 0;
  email = '';
  nascimento = '';
  username = '';
  password = '';

  private auth = inject(AuthService);
  private nav = inject(NavController);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);

  async registrar() {
    if (!this.nome || !this.username || !this.password || !this.email || !this.nascimento || !this.idade) {
      this.showToast('Preencha todos os campos');
      return;
    }
    const ok = await this.auth.register({
      nome: this.nome,
      idade: this.idade,
      email: this.email,
      nascimento: this.nascimento,
      username: this.username,
      password: this.password
    });
    if (ok) {
      this.showToast('Conta criada e login efetuado');
      await this.modalCtrl.dismiss();
      this.nav.navigateRoot(['/home']);
    } else {
      this.showToast('Usuário ou e-mail já existem');
    }
  }

  async fechar() {
    await this.modalCtrl.dismiss();
  }

  private async showToast(msg: string, dur = 1400) {
    const t = await this.toastCtrl.create({ message: msg, duration: dur, position: 'bottom' });
    await t.present();
  }
}

@Component({
  selector: 'recuperar-modal',
  standalone: true,
  template: `
  <ion-content class="ion-padding">
    <h2>Recuperar Senha</h2>
    <ion-item><ion-label position="stacked">E-mail</ion-label><ion-input [(ngModel)]="email"></ion-input></ion-item>
    <ion-button expand="block" color="tertiary" (click)="recuperar()">Enviar</ion-button>
    <ion-button expand="block" fill="clear" (click)="fechar()">Cancelar</ion-button>
  </ion-content>
  `,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class RecuperarModal {
  email = '';
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);

  async recuperar() {
    if (!this.email) {
      this.showToast('Informe o e-mail');
      return;
    }
    this.showToast('Se o e-mail existir, enviaremos instruções.');
    await this.modalCtrl.dismiss();
  }

  async fechar() {
    await this.modalCtrl.dismiss();
  }

  private async showToast(msg: string, dur = 1400) {
    const t = await this.toastCtrl.create({ message: msg, duration: dur, position: 'bottom' });
    await t.present();
  }
}
