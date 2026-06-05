import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-stats.component.html',
  styleUrl: './progress-stats.component.scss',
})
export class ProgressStatsComponent {
  @Input() current: number = 0;
  @Input() total: number = 0;
  @Input() showPercentage: boolean = true;
  @Input() showCount: boolean = true;

  getProgressPercentage(): number {
    if (!this.total || this.total === 0) {
      return 0;
    }
    return Math.round((this.current / this.total) * 100);
  }
}
