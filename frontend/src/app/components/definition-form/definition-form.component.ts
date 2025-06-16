import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorModule, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';
import { GlossaryService, Domain, Definition, Term } from '../../services/glossary.service';

@Component({
  selector: 'app-definition-form',
  standalone: true,
  imports: [CommonModule, FormsModule, EditorModule],
  templateUrl: './definition-form.component.html',
  styleUrls: ['./definition-form.component.scss'],
  providers: [
    { provide: TINYMCE_SCRIPT_SRC, useValue: 'tinymce/tinymce.min.js' }
  ]
})
export class DefinitionFormComponent implements OnInit {
  @Input() term!: Term;
  @Input() definitions: Definition[] = [];
  @Output() definitionSaved = new EventEmitter<Definition>();

  public definitionText = '';
  public selectedDomainId: number | null = null;
  public domains: Domain[] = [];

  public editorConfig = {
    height: 300,
    menubar: false,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount'
    ],
    toolbar: 'undo redo | blocks | ' +
    'bold italic forecolor | alignleft aligncenter ' +
    'alignright alignjustify | bullist numlist outdent indent | ' +
    'customLink | removeformat | help',
    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
    default_target: '_blank',
    target_list: false,
    setup: (editor: any) => {
      this.setupLinkDialog(editor);
    }
  };

  constructor(private glossaryService: GlossaryService) { }

  ngOnInit(): void {
    this.loadDomains();
  }

  loadDomains(): void {
    this.glossaryService.getDomains().subscribe(response => {
      this.domains = response.results;
    });
  }

  onDomainChange(): void {
    const existingDef = this.definitions.find(def => def.domain.id === this.selectedDomainId);

    if (existingDef) {
      this.definitionText = existingDef.definition_text;
    } else {
      this.definitionText = '';
    }
  }

  onSubmit(): void {
    if (!this.term?.id || !this.selectedDomainId || !this.definitionText) {
      // Basic validation
      alert('Please select a domain and provide a definition.');
      return;
    }

    const newDefinition = {
      term: this.term.id,
      domain: this.selectedDomainId,
      definition_text: this.definitionText,
      // Status will be 'proposed' by default on the backend
    };

    this.glossaryService.createDefinition(newDefinition as unknown as Partial<Definition>).subscribe({
      next: (savedDefinition) => {
        this.definitionSaved.emit(savedDefinition);
        // Reset form
        setTimeout(() => {
          this.definitionText = '';
          this.selectedDomainId = null;
        });
      },
      error: (error) => {
        console.error('Error saving definition:', error);
        let errorMessage = 'There was an error saving the definition.';
        // Extract a more specific error message from the backend if available
        if (error.error && error.error.definition_text && Array.isArray(error.error.definition_text)) {
            errorMessage = error.error.definition_text[0];
        } else if (typeof error.error === 'string') {
            errorMessage = error.error;
        }
        alert(errorMessage);
      }
    });
  }

  setupLinkDialog(editor: any): void {
    editor.ui.registry.addButton('customLink', {
      icon: 'link',
      tooltip: 'Insert/edit link',
      onAction: () => {
        const selection = editor.selection.getContent({ format: 'text' });
        const linkNode = editor.selection.getNode().closest('a');
        
        const initialData = {
          url: linkNode ? editor.dom.getAttrib(linkNode, 'href') : '',
          text: selection || (linkNode ? linkNode.innerText : ''),
        };

        editor.windowManager.open({
          title: 'Insert/Edit Link',
          body: {
            type: 'panel',
            items: [
              { type: 'input', name: 'url', label: 'URL', autofocus: true },
              { type: 'input', name: 'text', label: 'Text to display' },
            ]
          },
          initialData: initialData,
          buttons: [
            { type: 'cancel', text: 'Cancel' },
            { type: 'submit', text: 'Save', primary: true, name: 'save' }
          ],
          onSubmit: (api: any) => {
            const data = api.getData();
            if (!data.url) {
              editor.execCommand('unlink');
              api.close();
              return;
            }

            api.block('Validating link...');
            this.glossaryService.validateUrl(data.url).subscribe({
              next: () => {
                api.unblock();
                const text = data.text || data.url;
                
                if (linkNode) { // Editing an existing link
                    editor.dom.setAttrib(linkNode, 'href', data.url);
                    linkNode.innerText = text;
                } else { // Creating a new link
                    editor.execCommand('mceInsertContent', false, `<a href="${data.url}" target="_blank">${text}</a>`);
                }
                api.close();
              },
              error: (err) => {
                api.unblock();
                const detail = err.error?.detail || 'The URL could not be reached.';
                editor.windowManager.alert(`Link validation failed: ${detail}`);
              }
            });
          }
        });
      }
    });
  }
} 