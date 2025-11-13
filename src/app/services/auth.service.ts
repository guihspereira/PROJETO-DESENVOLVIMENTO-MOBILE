import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly USERS_KEY = 'ff_users_v1';
  private readonly LOGGED_KEY = 'ff_logged_v1';

  async register(data: {
    username: string;
    password: string;
    nome: string;
    idade: number;
    email: string;
    nascimento: string;
  }): Promise<boolean> {
    const raw = localStorage.getItem(this.USERS_KEY);
    let users: any[] = raw ? JSON.parse(raw) : [];

    if (users.find(u => u.username === data.username || u.email === data.email)) return false;

    users.push(data);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    localStorage.setItem(this.LOGGED_KEY, JSON.stringify({
      username: data.username,
      nome: data.nome,
      idade: data.idade,
      email: data.email
    }));
    return true;
  }

  async login(username: string, password: string): Promise<boolean> {
    const raw = localStorage.getItem(this.USERS_KEY);
    if (!raw) return false;

    const users = JSON.parse(raw);
    const user = users.find((u: any) => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem(this.LOGGED_KEY, JSON.stringify({
        username: user.username,
        nome: user.nome,
        idade: user.idade,
        email: user.email
      }));
      return true;
    }
    return false;
  }

  logout(): void {
    localStorage.removeItem(this.LOGGED_KEY);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.LOGGED_KEY);
  }

  getLoggedUser(): { nome: string; idade: number } {
    const raw = localStorage.getItem(this.LOGGED_KEY);
    if (!raw) return { nome: '', idade: 0 };
    try {
      const user = JSON.parse(raw);
      return {
        nome: user.nome || '',
        idade: user.idade || 0
      };
    } catch {
      return { nome: '', idade: 0 };
    }
  }
}
