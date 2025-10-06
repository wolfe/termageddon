import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { Entry } from '../../models';
import { EntryPickerComponent } from '../entry-picker/entry-picker.component';

@Component({
  selector: 'app-definition-form',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule, EntryPickerComponent],
  templateUrl: './definition-form.component.html',
  styleUrls: ['./definition-form.component.scss'],
})
export class DefinitionFormComponent implements OnInit, OnDestroy {
  @Input() content: string = '';
  @Input() placeholder: string = 'Enter definition content...';
  @Input() disabled: boolean = false;
  @Output() contentChange = new EventEmitter<string>();
  @Output() editorReady = new EventEmitter<any>();

  showEntryPicker = false;

  editor: any = null;

  editorConfig = {
    theme: 'snow',
    placeholder: this.placeholder,
    readOnly: this.disabled,
    modules: {
      toolbar: {
        container: [
          ['bold', 'italic', 'underline'],
          ['blockquote', 'code-block'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          [{ 'align': [] }],
          ['link', 'custom-link'],
          ['clean']
        ],
        handlers: {
          'custom-link': () => {
            this.openEntryPicker();
          }
        }
      }
    }
  };

  ngOnInit() {
    // Initialize editor if content is provided
    if (this.content) {
      this.updateContent(this.content);
    }
  }

  ngOnDestroy() {
    // Quill handles cleanup automatically
  }

  onEditorCreated(editor: any) {
    this.editor = editor;
    this.editorReady.emit(editor);

    // Add custom link button to toolbar
    const toolbar = editor.getModule('toolbar');
    toolbar.addHandler('custom-link', () => {
      this.openEntryPicker();
    });

    // Handle content changes
    editor.on('text-change', () => {
      const content = editor.root.innerHTML;
      this.contentChange.emit(content);
    });
  }

  onContentChanged(content: string) {
    this.content = content;
    this.contentChange.emit(content);
  }

  updateContent(content: string) {
    this.content = content;
    if (this.editor) {
      this.editor.root.innerHTML = content;
    }
  }

  getContent(): string {
    return this.editor ? this.editor.root.innerHTML : this.content;
  }

  setContent(content: string) {
    this.content = content;
    if (this.editor) {
      this.editor.root.innerHTML = content;
    }
  }

  insertLink(entryId: number, entryText: string) {
    if (this.editor) {
      const range = this.editor.getSelection();
      if (range) {
        this.editor.insertText(range.index, entryText, 'user');
        this.editor.formatText(range.index, entryText.length, 'link', `#entry-${entryId}`);
        this.editor.formatText(range.index, entryText.length, 'data-entry-id', entryId.toString());
      }
    }
  }

  private openEntryPicker() {
    this.showEntryPicker = true;
  }

  onEntrySelected(entry: Entry) {
    this.insertLink(entry.id, entry.term.text);
    this.showEntryPicker = false;
  }

  onEntryPickerClosed() {
    this.showEntryPicker = false;
  }
}
