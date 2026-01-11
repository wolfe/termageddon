import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { Entry } from '../../models';
import { EntryLinkSelectorDialogComponent } from '../shared/entry-link-selector-dialog/entry-link-selector-dialog.component';

@Component({
    selector: 'app-definition-form',
    imports: [CommonModule, FormsModule, QuillModule, EntryLinkSelectorDialogComponent],
    templateUrl: './definition-form.component.html',
    styleUrls: ['./definition-form.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class DefinitionFormComponent implements OnInit, OnDestroy {
  @Input() content: string = '';
  @Input() placeholder: string = 'Enter definition content...';
  @Input() disabled: boolean = false;
  @Output() contentChange = new EventEmitter<string>();
  @Output() editorReady = new EventEmitter<any>();

  showEntryLinkSelector = false;

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
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          [{ align: [] }],
          ['link', 'custom-link'],
          ['clean'],
        ],
        handlers: {
          'custom-link': () => {
            // Quill automatically preserves selection here!
            this.openEntryLinkSelector();
          },
        },
      },
    },
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
    if (!this.editor) return;

    const range = this.editor.getSelection(true); // true = force focus if needed

    if (range) {
      // Insert link text with book icon
      const linkText = `${entryText} 📖`;
      this.editor.insertText(range.index, linkText, 'user');
      this.editor.formatText(range.index, linkText.length, 'link', `/entry/${entryId}`);

      // Add custom data attribute for navigation
      setTimeout(() => {
        const links = this.editor.root.querySelectorAll('a[href^="/entry/"]');
        const lastLink = links[links.length - 1] as HTMLAnchorElement;
        if (lastLink) {
          lastLink.setAttribute('data-entry-id', entryId.toString());
          lastLink.classList.add('entry-link');
        }
      }, 0);

      // Move cursor after inserted link
      this.editor.setSelection(range.index + linkText.length);
    }
  }

  private openEntryLinkSelector() {
    this.showEntryLinkSelector = true;
  }

  onEntrySelected(entry: Entry) {
    this.insertLink(entry.id, entry.term.text);
    this.showEntryLinkSelector = false;
  }

  onEntryLinkSelectorClosed() {
    this.showEntryLinkSelector = false;
  }
}
