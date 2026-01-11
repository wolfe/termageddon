import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Entry, User } from '../../../models';
import { DefinitionFormComponent } from '../../definition-form/definition-form.component';
import { PerspectivePillComponent } from '../perspective-pill/perspective-pill.component';

@Component({
    selector: 'app-new-entry-detail-panel',
    imports: [
    FormsModule,
    DefinitionFormComponent,
    PerspectivePillComponent
],
    template: `
    <div class="new-entry-detail-panel">
      <!-- Header -->
      <div class="panel-header">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">
              {{ displayTermText }}
            </h2>
            <div class="flex items-center space-x-2 mt-1">
              @if (displayPerspective) {
                <app-perspective-pill
                  [perspective]="displayPerspective"
                ></app-perspective-pill>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-6">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Definition Content
              </label>
              <app-definition-form
                [content]="editContent"
                [placeholder]="'Enter the definition content here...'"
                (contentChange)="editContent = $event"
              ></app-definition-form>
            </div>

            <div class="flex space-x-3">
              <button
                (click)="onSave()"
                [disabled]="!editContent.trim()"
                class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
                >
                Create Draft
              </button>
              <button
                (click)="onCancel()"
                class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm font-medium"
                >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    `,
    styleUrls: ['./new-entry-detail-panel.component.scss']
})
export class NewEntryDetailPanelComponent implements OnInit {
  @Input() entry: Entry | null = null;
  @Input() currentUserId: number | null = null;
  @Input() termText: string | null = null;
  @Input() perspective: any | null = null;
  @Output() createFirstDraft = new EventEmitter<string>();

  editContent = '';

  ngOnInit(): void {
    // Initialize with empty content for new entry
    this.editContent = '';
  }

  get displayTermText(): string {
    return this.termText || this.entry?.term?.text || '';
  }

  get displayPerspective(): any {
    return this.perspective || this.entry?.perspective;
  }

  onSave(): void {
    if (!this.editContent.trim()) {
      return;
    }

    this.createFirstDraft.emit(this.editContent);
  }

  onCancel(): void {
    this.editContent = '';
    // Could emit a cancel event if needed
  }
}
