import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-card-collection',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, NgOptimizedImage],
  templateUrl: './card-collection.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './card-collection.component.scss',
})
export class CardCollectionComponent {
  private readonly router = inject(Router);

  // Prefijos de las claves de localStorage para diferentes tipos de colecciones
  // IMPORTANTE: Si añades un nuevo tipo de colección, añade su prefijo aquí
  private readonly COLLECTION_PREFIXES = [
    'collection_', // Magic: The Gathering
    'naruto_collection_', // Naruto
    'pokemon_collection_', // Pokémon (para uso futuro)
  ];

  private readonly METADATA_PREFIXES = [
    'ownedCards_', // Contador de cartas poseídas
    'sales_', // Historial de ventas de cartas
  ];

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

  exportCollections(): void {
    const collections: { [key: string]: any } = {};

    // Recoger todas las colecciones y metadatos del localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Verificar si la clave coincide con algún prefijo conocido
      const isCollection = this.COLLECTION_PREFIXES.some((prefix) => key.startsWith(prefix));
      const isMetadata = this.METADATA_PREFIXES.some((prefix) => key.startsWith(prefix));

      if (isCollection || isMetadata) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            collections[key] = JSON.parse(data);
          } catch {
            // Si no es JSON válido, guardar como string
            collections[key] = data;
          }
        }
      }
    }

    // Crear un blob con los datos y descargarlo
    const dataStr = JSON.stringify(collections, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `card-collections-${this.formatDate(new Date())}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
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

        let importedCount = 0;

        // Guardar cada colección en localStorage
        Object.keys(collections).forEach((key) => {
          // Verificar si es una colección o metadato válido
          const isCollection = this.COLLECTION_PREFIXES.some((prefix) => key.startsWith(prefix));
          const isMetadata = this.METADATA_PREFIXES.some((prefix) => key.startsWith(prefix));

          if (isCollection) {
            const data = collections[key];
            localStorage.setItem(key, JSON.stringify(data));
            importedCount++;

            // Si es una colección de Magic (collection_), actualizar ownedCards
            if (key.startsWith('collection_')) {
              const setId = key.replace('collection_', '');
              const uniqueCards = Array.isArray(data) ? data.length : 0;
              localStorage.setItem(`ownedCards_${setId}`, uniqueCards.toString());
            }
          } else if (isMetadata) {
            // Guardar metadatos
            // Para sales_ (ventas), guardar como JSON
            if (key.startsWith('sales_')) {
              localStorage.setItem(key, JSON.stringify(collections[key]));
            } else {
              // Para otros metadatos (como ownedCards_), guardar como string
              const value =
                typeof collections[key] === 'string' ? collections[key] : String(collections[key]);
              localStorage.setItem(key, value);
            }
          }
        });

        alert(`${importedCount} colecciones importadas correctamente`);
        // Recargar la página para actualizar las estadísticas
        window.location.reload();
      } catch (error) {
        console.error('Error al importar colecciones:', error);
        alert('Error al importar el archivo. Asegúrate de que sea un archivo JSON válido.');
      }
    };

    reader.readAsText(file);

    // Resetear el input para permitir reimportar el mismo archivo
    input.value = '';
  }
}
