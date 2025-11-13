import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GastosService, Gasto } from '../../services/gastos.service';

type FamiliaMember = {
  id: string;
  nome: string;
  tipo: string;
  gasto: number;
};

type Sugestao = {
  id: string;
  texto: string;
  impacto?: number;
  aplicado?: boolean;
};

@Component({
  selector: 'app-opcoes',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './opcoes.page.html',
  styleUrls: ['./opcoes.page.scss']
})
export class OpcoesPage implements OnInit {

  public ultimos: Gasto[] = [];
  public totalMesAtual: number = 0;
  public mesAtual: string = '';
  public sugestoes: Sugestao[] = [];
  public metamensal: number = 0;
  public metaPoupanca: number = 0;

  public familia: FamiliaMember[] = [];
  public novoNome = '';
  public novoTipo = 'Cônjuge';
  public novoGasto: number | null = null;

  public areasEconomia: { nome: string; valor: number }[] = [];

  private FAMILIA_KEY = 'familia_financas_v1';
  private SNAPSHOT_KEY = 'familia_snapshots_v1';

  constructor(
    public gastosService: GastosService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit(): void {
    this.mesAtual = new Date().toLocaleString('pt-BR', { month: 'long' });
    this.loadMeta();
    this.loadMetaPoupanca();
    this.loadFamilia();
    this.subscribeService();
  }

  private subscribeService() {
    this.gastosService.gastos$.subscribe(g => {
      this.ultimos = g.slice(-5).reverse();
      this.totalMesAtual = this.gastosService.totalForMonth();
      this.calcularEconomia();
    });
  }

  private loadMeta() {
    const raw = localStorage.getItem('meta_mensal_v1');
    if (raw) {
      const v = Number(raw);
      if (!isNaN(v)) this.metamensal = v;
    }
  }

  private loadMetaPoupanca() {
    const raw = localStorage.getItem('meta_poupanca_v1');
    if (raw) {
      const v = Number(raw);
      if (!isNaN(v)) this.metaPoupanca = v;
    }
  }

  public salvarMeta(): void {
    localStorage.setItem('meta_mensal_v1', String(this.metamensal));
    this.presentToast('Meta mensal salva');
  }

  public salvarMetaPoupanca(): void {
    localStorage.setItem('meta_poupanca_v1', String(this.metaPoupanca));
    this.presentToast('Meta de poupança salva');
  }

  public gerarSugestoesInterativas(): void {
    const total = Math.max(0, this.totalMesAtual);
    this.sugestoes = [
      { id: this.uid(), texto: 'Reduzir transporte em 10%', impacto: Math.round(total * 0.10), aplicado: false },
      { id: this.uid(), texto: 'Diminuir refeições fora em 15%', impacto: Math.round(total * 0.15), aplicado: false },
      { id: this.uid(), texto: 'Rever assinaturas e serviços', impacto: Math.round(total * 0.05), aplicado: false }
    ];
    this.presentToast('Sugestões geradas — toque para aplicar');
  }

  public aplicarSugestao(s: Sugestao): void {
    if (s.aplicado) {
      s.aplicado = false;
      this.presentToast('Sugestão desmarcada');
      return;
    }
    if (s.impacto && s.impacto > 0) {
      this.metamensal = Math.max(0, this.metamensal - s.impacto);
      this.salvarMeta();
    }
    s.aplicado = true;
    this.presentToast('Sugestão aplicada');
  }

  private calcularEconomia(): void {
    this.areasEconomia = [
      { nome: 'Transporte', valor: this.totalMesAtual * 0.10 },
      { nome: 'Refeições fora', valor: this.totalMesAtual * 0.15 },
      { nome: 'Assinaturas', valor: this.totalMesAtual * 0.05 }
    ];
  }

  private loadFamilia(): void {
    try {
      const raw = localStorage.getItem(this.FAMILIA_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) this.familia = parsed;
      }
    } catch {
      this.familia = [];
    }
  }

  private saveFamilia(): void {
    localStorage.setItem(this.FAMILIA_KEY, JSON.stringify(this.familia));
  }

  public adicionarParente(): void {
    if (!this.novoNome || !this.novoTipo || this.novoGasto == null || isNaN(Number(this.novoGasto))) {
      this.presentToast('Preencha nome, tipo e gasto válido', 1600);
      return;
    }
    const member: FamiliaMember = {
      id: this.uid(),
      nome: this.novoNome.trim(),
      tipo: this.novoTipo,
      gasto: Number(this.novoGasto)
    };
    this.familia.push(member);
    this.saveFamilia();
    this.novoNome = '';
    this.novoGasto = null;
    this.presentToast('Parente adicionado');
  }

  public removerParente(id: string): void {
    this.familia = this.familia.filter(f => f.id !== id);
    this.saveFamilia();
    this.presentToast('Parente removido');
  }

  public totalFamilia(): number {
    return this.familia.reduce((s, f) => s + (Number(f.gasto) || 0), 0);
  }

  public guardarFinancas(): void {
    const snapshot = {
      id: this.uid(),
      data: new Date().toISOString(),
      totalMes: this.totalMesAtual,
      familia: this.familia.slice(),
      meta: this.metamensal
    };
    let arr: any[] = [];
    try {
      const raw = localStorage.getItem(this.SNAPSHOT_KEY);
      if (raw) {
        arr = JSON.parse(raw);
        if (!Array.isArray(arr)) arr = [];
      }
    } catch { arr = []; }
    arr.unshift(snapshot);
    localStorage.setItem(this.SNAPSHOT_KEY, JSON.stringify(arr));
    this.presentToast('Finanças salvas (snapshot)');
  }

  public async verSnapshots(): Promise<void> {
    const raw = localStorage.getItem(this.SNAPSHOT_KEY);
    if (!raw) {
      return this.presentAlert('Snapshots', 'Nenhum snapshot encontrado');
    }
    try {
      const arr = JSON.parse(raw);
      const html = (arr as any[]).map(s =>
        `<div style="margin-bottom:8px"><strong>${new Date(s.data).toLocaleString()}</strong><div>Total: ${Number(s.totalMes).toFixed(2)}</div></div>`
      ).join('');
      return this.presentAlert('Snapshots', html, true);
    } catch (e) {
      return this.presentAlert('Snapshots', 'Erro ao ler snapshots');
    }
  }

  public getIconForTipo(tipo: string): string {
    switch (tipo) {
      case 'Cônjuge': return 'heart';
      case 'Filho': return 'happy';
      case 'Pai': return 'man';
      case 'Mãe': return 'woman';
      default: return 'person';
    }
  }

  private uid(prefix = '') { return prefix + Math.random().toString(36).slice(2, 9); }

  private async presentToast(msg: string, duration = 1200) {
    const t = await this.toastCtrl.create({ message: msg, duration, position: 'bottom' });
    await t.present();
  }

  private async presentAlert(header: string, message: string, isHtml = false) {
    const opts: any = { header, buttons: ['OK'] };
    if (isHtml) opts.message = undefined, opts.html = message, opts.cssClass = 'html-alert';
    else opts.message = message;
    const a = await this.alertCtrl.create(opts);
    return a.present();
  }
}
