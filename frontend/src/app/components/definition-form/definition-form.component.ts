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
  private searchDebounce: any;
  private selectedTermForDialog: Term | null = null;

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
    'customLink customTermLink | removeformat | help',
    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
    default_target: '_blank',
    target_list: false,
    setup: (editor: any) => {
      this.setupLinkDialog(editor);
      this.setupTermLinkDialog(editor);
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

  setupTermLinkDialog(editor: any): void {
    const vocabularyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 19h-6a1 1 0 0 1 -1 -1v-14a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1z" /><path d="M10 5h-4" /><path d="M10 7h-4" /><path d="M14 11h6" /><path d="M14 15h6" /><path d="M20 11v8" /></svg>`;
    editor.ui.registry.addIcon('vocabulary', vocabularyIcon);

    editor.ui.registry.addButton('customTermLink', {
      icon: 'vocabulary',
      tooltip: 'Link to a term definition',
      onAction: () => {
        const selection = editor.selection;
        const text = selection.getContent({ format: 'text' });

        // --- State Management ---
        this.selectedTermForDialog = null;
        let termCache: Term[] = [];
        let definitionCache: Definition[] = [];
        let domainItems: { text: string, value: string }[] = [{ text: 'Select a term first', value: '' }];
        let definitionPreviewHtml = '';
        let termPage = 1;
        let hasMoreTerms = true;
        let isTermLoading = false;
        // --- End State ---

        const attachClickHandlers = (api: any) => {
          const panel = api.getEl()?.querySelector('.term-results-panel');
          if (panel) {
            // Infinite scroll for terms
            panel.addEventListener('scroll', () => {
              if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 10 && hasMoreTerms && !isTermLoading) {
                isTermLoading = true;
                termPage++;
                const currentQuery = api.getData().term_query;
                this.glossaryService.getTerms(termPage, currentQuery).subscribe(response => {
                  termCache.push(...response.results);
                  hasMoreTerms = response.next !== null;
                  
                  const currentData = api.getData();
                  api.redial(getDialogConfig(currentData));
                  isTermLoading = false;
                });
              }
            });

            panel.querySelectorAll('.term-item').forEach((item: HTMLElement) => {
              item.addEventListener('click', () => {
                const termId = parseInt(item.dataset['id']!, 10);
                this.selectedTermForDialog = termCache.find(t => t.id === termId) || null;
                
                // Get current form data to preserve it
                const currentData = api.getData();

                api.block('Loading domains...');
                this.glossaryService.getDefinitions(1, { term__id: termId.toString(), status: 'approved', page_size: '100' }).subscribe(response => {
                  definitionCache = response.results;
                  domainItems = definitionCache.map(def => ({ text: def.domain.name, value: def.domain.id.toString() }));
                  
                  if (domainItems.length > 0) {
                    domainItems.unshift({ text: 'Select a domain', value: '' });
                  } else {
                    domainItems = [{ text: 'No approved definitions', value: '' }];
                  }

                  definitionPreviewHtml = '';
                  api.unblock();
                  api.redial(getDialogConfig(currentData)); // Pass current data
                });
              });
            });
          }
        };

        const getDialogConfig = (data: any = { term_query: '', domain_id: '' }) => {
          const termHtml = termCache.map(term => 
            `<div 
              class="term-item ${this.selectedTermForDialog?.id === term.id ? 'selected' : ''}" 
              data-id="${term.id}"
            >${term.text}</div>`
          ).join('');

          return {
            title: 'Link to Definition',
            size: 'large',
            body: {
              type: 'panel',
              items: [
                { type: 'input', name: 'term_query', label: 'Search for a term', placeholder: 'Start typing to search...' },
                { type: 'htmlpanel', html: `<div class="term-results-panel">${termHtml}</div>` },
                { type: 'listbox', name: 'domain_id', label: 'Select Domain', items: domainItems, disabled: !this.selectedTermForDialog },
                { type: 'htmlpanel', html: `<div class="definition-preview-panel">${definitionPreviewHtml}</div>` }
              ]
            },
            buttons: [
              { type: 'cancel', text: 'Cancel' },
              { type: 'submit', name: 'submit', text: 'Insert Link', primary: true, disabled: true }
            ],
            initialData: data,
            onPostRender: (api: any) => attachClickHandlers(api),
            onChange: (api: any, details: any) => {
              const data = api.getData();
              if (details.name === 'term_query') {
                clearTimeout(this.searchDebounce);
                this.searchDebounce = setTimeout(() => {
                  termPage = 1; // Reset pagination
                  hasMoreTerms = true;
                  isTermLoading = true;
                  this.glossaryService.getTerms(termPage, data.term_query).subscribe(response => {
                    termCache = response.results;
                    hasMoreTerms = response.next !== null;
                    this.selectedTermForDialog = null;
                    domainItems = [{ text: 'Select a term first', value: '' }];
                    definitionPreviewHtml = '';
                    api.redial(getDialogConfig(data));
                    isTermLoading = false;
                  });
                }, 500);
              } else if (details.name === 'domain_id') {
                const domainId = data.domain_id;
                const definition = definitionCache.find(d => d.domain.id.toString() === domainId);
                definitionPreviewHtml = definition ? definition.definition_text : '';
                api.redial(getDialogConfig(data));
                api.setEnabled('submit', !!domainId);
              }
            },
            onSubmit: (api: any) => {
              const data = api.getData();
              if (this.selectedTermForDialog && data.domain_id) {
                const linkText = text || this.selectedTermForDialog.text;
                const link = `<a href="/term/${this.selectedTermForDialog.id}" data-domain-id="${data.domain_id}">${linkText}</a>`;
                editor.execCommand('mceInsertContent', false, link);
              }
              api.close();
            }
          };
        };

        // First, load the initial set of terms
        isTermLoading = true;
        this.glossaryService.getTerms(termPage, '').subscribe(response => {
          termCache = response.results;
          hasMoreTerms = response.next !== null;
          isTermLoading = false;
          // Then, open the dialog with the populated term list
          editor.windowManager.open(getDialogConfig());
        });
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