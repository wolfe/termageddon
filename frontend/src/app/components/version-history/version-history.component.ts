import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntryVersion, Entry, User } from '../../models';
import { GlossaryService } from '../../services/glossary.service';

@Component({
  selector: 'app-version-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-history.component.html',
  styleUrls: ['./version-history.component.scss'],
})
export class VersionHistoryComponent implements OnInit {
  @Input() entry!: Entry;
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() versionSelected = new EventEmitter<EntryVersion>();

  versions: EntryVersion[] = [];
  loading = false;
  error: string | null = null;
  selectedVersion: EntryVersion | null = null;

  constructor(private glossaryService: GlossaryService) {}

  ngOnInit() {
    if (this.isOpen && this.entry) {
      this.loadVersions();
    }
  }

  ngOnChanges() {
    if (this.isOpen && this.entry) {
      this.loadVersions();
    }
  }

  loadVersions() {
    this.loading = true;
    this.error = null;

    this.glossaryService.getEntryVersions(this.entry.id).subscribe({
      next: (response) => {
        this.versions = response.results;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading versions:', error);
        this.error = 'Failed to load version history';
        this.loading = false;
      },
    });
  }

  selectVersion(version: EntryVersion) {
    this.selectedVersion = version;
    this.versionSelected.emit(version);
  }

  isActiveVersion(version: EntryVersion): boolean {
    return this.entry.active_version?.id === version.id;
  }

  getVersionStatus(version: EntryVersion): string {
    if (version.is_published) {
      return 'Published';
    } else if (version.is_approved) {
      return 'Approved';
    } else {
      return 'Pending';
    }
  }

  getVersionStatusClass(version: EntryVersion): string {
    if (version.is_published) {
      return 'status-published';
    } else if (version.is_approved) {
      return 'status-approved';
    } else {
      return 'status-pending';
    }
  }

  getInitials(user: User): string {
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  }

  onClose() {
    this.close.emit();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
