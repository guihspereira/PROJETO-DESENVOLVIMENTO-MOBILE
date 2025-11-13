// src/app/pagina/gastos/gastos.page.ts
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { GastosService, Gasto } from '../../services/gastos.service';

@Component({
  selector: 'app-gastos',
  standalone: true,
  // TEMPLATE INLINE — garante que a versão que você editou é a que será compilada
  template: `
  <ion-header [translucent]="true">
    <ion-toolbar color="tertiary">
      <ion-buttons slot="start">
        <ion-menu-button></ion-menu-button>
      </ion-buttons>
      <ion-title>Gastos</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content [fullscreen]="true" class="gastos-content ion-padding">

    <div class="top-row">
      <ion-card class="card-resumo">
        <ion-card-header>
          <ion-card-title>Resumo do Mês</ion-card-title>
          <ion-card-subtitle>{{ mesAtual | titlecase }}</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="resumo-inner">
            <div class="resumo-info">
              <div class="label-small">Total</div>
              <div class="total-valor">{{ formatCurrency(totalMesAtual) }}</div>
              <div class="muted small">Categorias e participação</div>
            </div>

            <div class="resumo-chart">
              <div class="chart-wrapper">
                <canvas #gastosChart></canvas>
              </div>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card class="card-acoes">
        <ion-card-header>
          <ion-card-title>Adicionar Rápido</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row class="ion-align-items-center">
              <ion-col size="8">
                <ion-item class="input-quick">
                  <ion-input
                    type="number"
                    placeholder="Valor (ex: 25.50)"
                    [(ngModel)]="quickValor"
                    inputmode="decimal"
                    min="0"
                  ></ion-input>
                </ion-item>
              </ion-col>
              <ion-col size="4">
                <ion-button expand="block" color="primary" (click)="adicionarRapido()">Adicionar</ion-button>
              </ion-col>
            </ion-row>

            <ion-row>
              <ion-col>
                <ion-button expand="block" fill="clear" (click)="abrirAlertDetalhado()">
                  + Adicionar detalhado
                </ion-button>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>
    </div>

    <div class="lista-gastos">
      <h3 class="section-title">Últimos Gastos</h3>

      <ion-list *ngIf="(ultimos?.length || 0) > 0; else semGastos">
        <ion-item
          *ngFor="let g of ultimos"
          class="gasto-item"
          lines="none"
          [style.--border-start-color]="getCategoriaColor(g.categoria)"
        >
          <div class="left-thumb" [style.background]="getCategoriaColor(g.categoria)"></div>
          <ion-label class="gasto-label">
            <div class="gasto-desc">{{ g.descricao }}</div>
            <div class="muted gasto-meta">{{ g.categoria }} • {{ g.criadoEm | date:'dd/MM/yyyy' }}</div>
          </ion-label>

          <div class="gasto-right">
            <div class="gasto-valor">{{ formatCurrency(g.valor) }}</div>
            <ion-button fill="clear" color="danger" size="small" (click)="remover(g)">Remover</ion-button>
          </div>
        </ion-item>
      </ion-list>

      <ng-template #semGastos>
        <div class="sem-gastos">
          <p class="muted">Nenhum gasto adicionado ainda.</p>
          <ion-button fill="outline" (click)="abrirAlertDetalhado()">Adicionar primeiro gasto</ion-button>
        </div>
      </ng-template>
    </div>

  </ion-content>
  `,
  // STYLES INLINE
  styles: [`
    .gastos-content {
      --ion-background-color: var(--ion-color-light);
      background: linear-gradient(180deg, #fcf9ff 0%, #f8f6ff 100%);
      min-height: 100vh;
    }

    .top-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    @media (min-width: 720px) {
      .top-row { grid-template-columns: 2fr 1fr; align-items: start; }
    }

    ion-card {
      border-radius: 14px;
      box-shadow: 0 8px 30px rgba(99, 57, 135, 0.08);
      overflow: hidden;
      transition: transform .18s ease, box-shadow .18s ease;
      background: linear-gradient(180deg, #fff, #fbf7ff);
    }

    .resumo-inner {
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 8px 0;
    }
    .resumo-info { flex: 1; }
    .label-small { font-size: 0.85rem; color: var(--ion-color-medium); }
    .total-valor { font-size: 1.6rem; font-weight: 700; color: var(--ion-color-tertiary); margin: 6px 0; }
    .resumo-chart { width: 160px; height: 120px; }
    .chart-wrapper { width: 100%; height: 100%; position: relative; }
    .chart-wrapper canvas { width: 100% !important; height: 100% !important; }

    .card-acoes { display:flex; flex-direction:column; justify-content:center; }
    ion-item.input-quick { --padding-start:8px; border-radius:8px; background:#fff; box-shadow: inset 0 1px 0 rgba(0,0,0,0.02); }

    .lista-gastos .section-title { margin: 8px 0 6px; font-size: 1rem; color: var(--ion-color-dark); }

    ion-list { display: grid; gap: 10px; }

    .gasto-item {
      display: flex; align-items: center; gap: 12px;
      background: linear-gradient(180deg, #fff, #fcf9ff);
      border-radius: 12px; padding: 10px;
      box-shadow: 0 6px 20px rgba(99,57,135,0.05);
      transition: transform .15s ease, box-shadow .15s ease;
      border-left: 6px solid transparent;
      overflow: hidden;
    }
    .gasto-item:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(99,57,135,0.08); }

    .left-thumb { width:44px; height:44px; border-radius:10px; flex-shrink:0; box-shadow:0 6px 18px rgba(99,57,135,0.06); }
    .gasto-label { flex:1; }
    .gasto-desc { font-weight:700; color:var(--ion-color-dark); }
    .gasto-meta { font-size:0.85rem; color:var(--ion-color-medium); margin-top:4px; }

    .gasto-right { display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
    .gasto-valor { font-weight:700; color:var(--ion-color-dark); }
    .sem-gastos { text-align:center; padding:18px 6px; color:var(--ion-color-medium); }

    .muted { color: var(--ion-color-medium); }
  `],
  imports: [IonicModule, CommonModule, FormsModule]
})
export class GastosPage implements OnInit, AfterViewInit {
  @ViewChild('gastosChart', { static: false }) gastosChart!: ElementRef<HTMLCanvasElement>;
  public chart?: Chart;

  public gastos: Gasto[] = [];
  public categorias = ['Alimentação', 'Casa', 'Compras', 'Transporte', 'Saúde', 'Outros'];

  public quickValor: number | null = null;

  public mesAtual: string = '';
  public totalMesAtual: number = 0;
  public ultimos: Gasto[] = [];

  constructor(
    public gastosService: GastosService,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.mesAtual = new Date().toLocaleString('pt-BR', { month: 'long' });
    this.carregarGastos();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.renderChart(), 200);
  }

  ionViewWillEnter(): void {
    this.carregarGastos();
    this.updateChart();
  }

  public carregarGastos(): void {
    this.gastos = this.gastosService.getAll();
    this.totalMesAtual = this.gastosService.totalForMonth();
    this.ultimos = this.gastos.slice(-8).reverse();
  }

  public abrirAlertDetalhado(): void {
    this.abrirAlertAdicionar();
  }

  public formatCurrency(v: number): string {
    return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  public getCategoriaColor(categoria: string): string {
    return this.gastosService.getCategoriaColor(categoria);
  }

  public remover(g: Gasto): void {
    this.gastosService.removerGastoByPredicate(item =>
      item.criadoEm === g.criadoEm && item.descricao === g.descricao && item.valor === g.valor
    );
    this.carregarGastos();
    this.updateChart();
  }

  public adicionarRapido(): void {
    if (!this.quickValor || isNaN(this.quickValor) || this.quickValor <= 0) {
      this.alertController.create({
        header: 'Valor inválido',
        message: 'Digite um valor maior que zero.',
        buttons: ['OK']
      }).then(a => a.present());
      return;
    }

    this.gastosService.adicionarGasto({
      descricao: 'Gasto Rápido',
      valor: Number(this.quickValor),
      categoria: 'Outros'
    } as any);

    this.quickValor = null;
    this.carregarGastos();
    this.updateChart();
  }

  public async abrirAlertAdicionar(): Promise<void> {
    const alert1 = await this.alertController.create({
      header: 'Adicionar Gasto',
      inputs: [
        { name: 'descricao', type: 'text', placeholder: 'Descrição (ex: Supermercado)' },
        { name: 'valor', type: 'number', placeholder: 'Valor (ex: 25.50)', attributes: { step: '0.01' } }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Próximo',
          handler: (data: any) => {
            const descricao = String(data.descricao ?? '').trim();
            const valor = Number(data.valor);
            if (!descricao || isNaN(valor) || valor <= 0) {
              return false;
            }
            setTimeout(() => this._abrirAlertSelecionarCategoria({ descricao, valor }), 50);
            return true;
          }
        }
      ]
    });

    await alert1.present();
  }

  private async _abrirAlertSelecionarCategoria(base: { descricao: string; valor: number }) {
    const radioInputs = this.categorias.map(c => ({
      type: 'radio' as const,
      label: c,
      value: c,
      checked: false
    }));

    const alert = await this.alertController.create({
      header: 'Categoria',
      inputs: radioInputs,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Adicionar',
          handler: (selectedCategoria: string) => {
            const categoria = selectedCategoria ?? 'Outros';
            this.gastosService.adicionarGasto({
              descricao: base.descricao,
              valor: base.valor,
              categoria
            } as any);
            this.carregarGastos();
            this.updateChart();
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private renderChart(): void {
    const ctx = this.gastosChart?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const porCat = this.gastosService.totalsByCategoryForMonth();
    const labels = Object.keys(porCat);
    const values = Object.values(porCat);

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map(l => this.gastosService.getCategoriaColor(l)),
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } }
        },
        maintainAspectRatio: false,
        responsive: true
      }
    });
  }

  private updateChart(): void {
    if (!this.chart) {
      setTimeout(() => this.renderChart(), 80);
      return;
    }

    const porCat = this.gastosService.totalsByCategoryForMonth();
    const labels = Object.keys(porCat);
    const values = Object.values(porCat);

    this.chart.data.labels = labels;
    (this.chart.data.datasets[0] as any).data = values;
    (this.chart.data.datasets[0] as any).backgroundColor = labels.map(l => this.gastosService.getCategoriaColor(l));
    this.chart.update();
  }
}
