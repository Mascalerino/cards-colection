import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DataTransferApiService } from '../services/data-transfer-api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-card-collection',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './card-collection.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrl: './card-collection.component.scss',
})
export class CardCollectionComponent {
  private readonly router = inject(Router);
  private readonly dataTransferApi = inject(DataTransferApiService);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly isAdmin = this.authService.isAdmin;

  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  navigateToMagic() {
    this.router.navigate(['/magic']);
  }

  navigateToPokemon() {
    this.router.navigate(['/pokemon']);
  }

  navigateToNaruto() {
    this.router.navigate(['/naruto']);
  }

  navigateToOnePiece() {
    this.router.navigate(['/onepiece']);
  }

  navigateToAdmin() {
    this.router.navigate(['/admin']);
  }

  logout(): void {
    this.authService.logout().subscribe(() => this.router.navigate(['/login']));
  }

  exportCollections(): void {
    this.dataTransferApi.exportData().subscribe({
      next: (collections) => {
        const dataStr = JSON.stringify(collections, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `card-collections-${this.formatDate(new Date())}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error al exportar las colecciones:', error);
        alert('Error al exportar las colecciones.');
      },
    });
  }

  importCollections(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const collections = JSON.parse(result);

        this.dataTransferApi.importData(collections).subscribe({
          next: (summary) => {
            alert(`${summary.importedKeys} colecciones importadas correctamente`);
            window.location.reload();
          },
          error: (error) => {
            console.error('Error al importar colecciones:', error);
            alert('Error al importar el archivo en el servidor.');
          },
        });
      } catch (error) {
        console.error('Error al importar colecciones:', error);
        alert('Error al importar el archivo. Asegúrate de que sea un archivo JSON válido.');
      }
    };

    reader.readAsText(file);
    input.value = '';
  }
}
