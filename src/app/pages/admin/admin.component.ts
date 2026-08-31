import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService, UserRole } from '@services/auth.service';
import { ManagedUser, UsersApiService } from '@services/users-api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './admin.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private readonly usersApi = inject(UsersApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;

  readonly users = signal<ManagedUser[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  newUsername = '';
  newPassword = '';
  newRole: UserRole = 'user';

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.usersApi.listUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la lista de usuarios.');
        this.loading.set(false);
      },
    });
  }

  createUser(): void {
    if (!this.newUsername || !this.newPassword) return;

    this.creating.set(true);
    this.createError.set(null);

    this.usersApi
      .createUser({ username: this.newUsername, password: this.newPassword, role: this.newRole })
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.newUsername = '';
          this.newPassword = '';
          this.newRole = 'user';
          this.loadUsers();
        },
        error: (error) => {
          this.creating.set(false);
          this.createError.set(error?.error?.error ?? 'No se pudo crear el usuario.');
        },
      });
  }

  toggleRole(user: ManagedUser): void {
    const newRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
    this.usersApi.updateRole(user.id, newRole).subscribe({
      next: () => this.loadUsers(),
      error: () => this.errorMessage.set('No se pudo cambiar el rol del usuario.'),
    });
  }

  deleteUser(user: ManagedUser): void {
    if (!confirm(`¿Eliminar al usuario "${user.username}"? Se borrará también su colección.`)) {
      return;
    }

    this.usersApi.deleteUser(user.id).subscribe({
      next: () => this.loadUsers(),
      error: () => this.errorMessage.set('No se pudo eliminar el usuario.'),
    });
  }

  isSelf(user: ManagedUser): boolean {
    return user.id === this.currentUser()?.id;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
