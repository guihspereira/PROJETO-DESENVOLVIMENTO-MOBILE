import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Gasto {
  descricao: string;
  valor: number;
  categoria: string;
  data: string;       // Data no formato YYYY-MM-DD
  criadoEm: string;   // ISO string completo
}

const STORAGE_KEY = 'meus_gastos_v1';

const CATEGORIA_COLORS: Record<string, string> = {
  'Alimentação': '#FF6384',
  'Casa': '#36A2EB',
  'Compras': '#FFCE56',
  'Transporte': '#4BC0C0',
  'Saúde': '#9966FF',
  'Outros': '#FF9F40',
};

@Injectable({
  providedIn: 'root'
})
export class GastosService {
  private gastos: Gasto[] = [];
  private gastosSubject = new BehaviorSubject<Gasto[]>([]);
  public gastos$ = this.gastosSubject.asObservable();

  constructor() {
    this.carregarGastos();
  }

  private carregarGastos(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed: any = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.gastos = parsed
            .map(g => ({
              descricao: g.descricao,
              valor: Number(g.valor),
              categoria: g.categoria,
              data: g.data,
              criadoEm: g.criadoEm
            }))
            .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
        }
      }
    } catch (e) {
      console.error('Erro ao carregar gastos do localStorage', e);
      this.gastos = [];
    }
    this.gastosSubject.next(this.gastos);
  }

  private _salvar(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.gastos));
    this.gastosSubject.next(this.gastos);
  }

  adicionarGasto(novoGasto: Omit<Gasto, 'data' | 'criadoEm'>): void {
    const now = new Date();
    const gastoCompleto: Gasto = {
      ...novoGasto,
      data: now.toISOString().substring(0, 10),
      criadoEm: now.toISOString(),
    };
    this.gastos.unshift(gastoCompleto);
    this._salvar();
  }

  removerGastoByPredicate(predicate: (g: Gasto) => boolean): void {
    const initialLength = this.gastos.length;
    this.gastos = this.gastos.filter(g => !predicate(g));
    if (this.gastos.length < initialLength) {
      this._salvar();
    }
  }

  getAll(): Gasto[] {
    return [...this.gastos];
  }

  totalForMonth(): number {
    return this.gastos
      .filter(this.isGastoThisMonth)
      .reduce((sum, g) => sum + g.valor, 0);
  }

  totalsByCategoryForMonth(): Record<string, number> {
    const totals: Record<string, number> = {};
    this.gastos
      .filter(this.isGastoThisMonth)
      .forEach(g => {
        totals[g.categoria] = (totals[g.categoria] || 0) + g.valor;
      });
    return totals;
  }

  getCategoriaColor(categoria: string): string {
    return CATEGORIA_COLORS[categoria] || '#6c757d';
  }

  private isGastoThisMonth = (g: Gasto): boolean => {
    const today = new Date();
    const gastoDate = new Date(g.criadoEm);
    return gastoDate.getFullYear() === today.getFullYear() && gastoDate.getMonth() === today.getMonth();
  };
}
