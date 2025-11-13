// src/app/pagina/home/home.page.ts
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GastosService, Gasto } from '../../services/gastos.service';
import { AuthService } from '../../services/auth.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-home',
  standalone: true,
  // Template inline — garante que o Angular compile este arquivo que você está editando
  template: `
  <ion-header [translucent]="true">
    <ion-toolbar color="tertiary">
      <ion-buttons slot="start"><ion-menu-button></ion-menu-button></ion-buttons>
      <ion-title>Home</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content [fullscreen]="true" class="home-content">

    <div class="boas-vindas">
      <h2>Bem-vindo, {{ nomeUsuario }}!</h2>
      <p>Você tem {{ idade }} anos e está controlando bem suas finanças 💪</p>
    </div>

    <ion-card *ngIf="metaMensal > 0">
      <ion-card-header>
        <ion-card-title>Meta do Mês</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>Sua meta é <strong>{{ formatCurrency(metaMensal) }}</strong>.</p>
        <p>Você já gastou <strong>{{ formatCurrency(totalGastos) }}</strong>.</p>
        <ion-progress-bar [value]="clamp01(totalGastos / (metaMensal || 1))" color="tertiary"></ion-progress-bar>
        <p *ngIf="totalGastos < metaMensal">
          Faltam <strong>{{ restantePercentual() }}%</strong> para atingir sua meta.
        </p>
        <p *ngIf="totalGastos >= metaMensal">
          <strong>Você atingiu ou ultrapassou sua meta!</strong>
        </p>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header>
        <ion-card-title>Resumo - {{ mesAtual | titlecase }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <div>Total gasto: <strong>{{ formatCurrency(totalGastos) }}</strong></div>
        <div class="grafico-container">
          <canvas #gastoChart></canvas>
          <div class="grafico-empty" *ngIf="!hasCategorias()">Sem categorias para o mês</div>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- correction: avoid 'possibly undefined' by using (familia?.length || 0) -->
    <ion-card *ngIf="(familia?.length || 0) > 0">
      <ion-card-header>
        <ion-card-title>Família Financeira</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>Total gasto pela família: <strong>{{ formatCurrency(totalFamilia) }}</strong></p>
        <p>Membro com maior gasto: <strong>{{ maiorGastoNome || '-' }}</strong> ({{ formatCurrency(maiorGastoValor) }})</p>

        <ion-list lines="none">
          <ion-item *ngFor="let f of familia">
            <ion-label>
              <div class="fam-line">
                <div class="fam-name">{{ f.nome }}</div>
                <div class="fam-value">{{ formatCurrency(f.gasto || 0) }}</div>
              </div>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>

    <ion-card *ngIf="resumo.total > 0">
      <ion-card-header>
        <ion-card-title>Categorias</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-list>
          <ion-item *ngFor="let cat of (resumo.porCategoria | keyvalue)">
            <ion-label>
              {{ cat.key }}
              <p class="muted">{{ formatCurrency(cat.value) }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>

    <ion-card *ngIf="(ultimos?.length || 0) > 0">
      <ion-card-header>
        <ion-card-title>Últimos Gastos</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-list>
          <ion-item *ngFor="let g of ultimos">
            <ion-label>
              <strong>{{ g.descricao }}</strong>
              <p class="muted">{{ g.categoria }} — {{ g.criadoEm | date:'dd/MM/yyyy' }}</p>
              <div>{{ formatCurrency(g.valor) }}</div>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>

  </ion-content>
  `,
  styleUrls: ['./home.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule]
})
export class HomePage implements OnInit, AfterViewInit {
  @ViewChild('gastoChart', { static: false }) gastoChart!: ElementRef<HTMLCanvasElement>;

  // usuário
  public nomeUsuario = '';
  public idade = 0;

  // gastos / resumo
  public gastos: Gasto[] = [];
  public totalGastos = 0;
  public mesAtual = new Date().toLocaleString('pt-BR', { month: 'long' });
  public resumo: { total: number; porCategoria: Record<string, number> } = { total: 0, porCategoria: {} };
  public ultimos: Gasto[] = [];

  // meta
  public metaMensal = 0;

  // gráfico
  public chart: Chart | null = null;

  // família
  public familia: { nome: string; gasto: number }[] = [];
  public totalFamilia = 0;
  public maiorGastoNome = '';
  public maiorGastoValor = 0;

  // cor da barra (ajuste se quiser)
  public progressBarColor = 'var(--ion-color-tertiary)';

  private gastosService = inject(GastosService);
  private authService = inject(AuthService);

  ngOnInit() {
    const user = this.authService?.getLoggedUser?.() || { nome: 'Usuário', idade: 0 };
    this.nomeUsuario = user?.nome || 'Usuário';
    this.idade = user?.idade || 0;

    this.metaMensal = Number(localStorage.getItem('meta_mensal_v1')) || 0;
    this.carregarDados();
  }

  ngAfterViewInit() {
    setTimeout(() => this.criarGrafico(), 150);
  }

  public ionViewWillEnter() {
    this.carregarDados();
    setTimeout(() => this.atualizarGrafico(), 150);
  }

  public carregarDados() {
    try { this.gastos = this.gastosService.getAll() || []; } catch { this.gastos = []; }
    try { this.totalGastos = Number(this.gastosService.totalForMonth() || 0); } catch { this.totalGastos = 0; }
    try { this.resumo.porCategoria = this.gastosService.totalsByCategoryForMonth() || {}; } catch { this.resumo.porCategoria = {}; }
    this.resumo.total = this.totalGastos;
    this.ultimos = (this.gastos || []).slice(0, 5);

    try {
      const raw = localStorage.getItem('familia_financas_v1');
      if (raw) {
        this.familia = JSON.parse(raw);
        this.totalFamilia = this.familia.reduce((s, f) => s + (Number(f.gasto) || 0), 0);
        const maior = this.familia.reduce((a, b) => (Number(a.gasto || 0) > Number(b.gasto || 0) ? a : b), { nome: '', gasto: 0 });
        this.maiorGastoNome = maior.nome || '';
        this.maiorGastoValor = Number(maior.gasto) || 0;
      } else {
        this.familia = [];
        this.totalFamilia = 0;
        this.maiorGastoNome = '';
        this.maiorGastoValor = 0;
      }
    } catch {
      this.familia = [];
      this.totalFamilia = 0;
      this.maiorGastoNome = '';
      this.maiorGastoValor = 0;
    }
  }

  public formatCurrency(v: number): string {
    return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  public restantePercentual(): number {
    if (!this.metaMensal || this.metaMensal <= 0) return 0;
    const restante = this.metaMensal - (this.totalGastos || 0);
    const percentual = (restante / this.metaMensal) * 100;
    return Math.max(0, Math.round(percentual));
  }

  public clamp01(v: number): number {
    if (!isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
  }

  public hasCategorias(): boolean {
    const keys = Object.keys(this.resumo?.porCategoria || {});
    return keys.length > 0 && keys.some(k => (this.resumo.porCategoria[k] || 0) > 0);
  }

  public criarGrafico() {
    if (!this.gastoChart?.nativeElement) return;
    const ctx = this.gastoChart.nativeElement.getContext('2d');
    if (!ctx) return;

    const categorias = Object.keys(this.resumo.porCategoria || {});
    const valores = categorias.map(k => Number(this.resumo.porCategoria[k] || 0));
    if (!valores.length || valores.every(v => v <= 0)) {
      if (this.chart) { this.chart.destroy(); this.chart = null; }
      return;
    }

    const cores = categorias.map(c => {
      try { return this.gastosService.getCategoriaColor(c) || '#c5cae9'; }
      catch { return '#c5cae9'; }
    });

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categorias,
        datasets: [{ data: valores, backgroundColor: cores, borderWidth: 1, borderColor: '#fff' }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  public atualizarGrafico() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    this.criarGrafico();
  }
}
