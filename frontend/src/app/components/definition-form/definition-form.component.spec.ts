import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DefinitionFormComponent } from './definition-form.component';
import { Entry } from '../../models';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('DefinitionFormComponent', () => {
  let component: DefinitionFormComponent;
  let fixture: ComponentFixture<DefinitionFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [DefinitionFormComponent],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
}).compileComponents();

    fixture = TestBed.createComponent(DefinitionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('insertLink', () => {
    it('should insert link with proper HTML format and data attributes', () => {
      // Mock editor with required methods
      const mockEditor = {
        getSelection: jasmine.createSpy('getSelection').and.returnValue({ index: 0, length: 0 }),
        insertText: jasmine.createSpy('insertText'),
        formatText: jasmine.createSpy('formatText'),
        setSelection: jasmine.createSpy('setSelection'),
        root: {
          querySelectorAll: jasmine.createSpy('querySelectorAll').and.returnValue([]),
        },
      };

      component.editor = mockEditor;

      const entryId = 123;
      const entryText = 'Test Entry';

      component.insertLink(entryId, entryText);

      // Verify that insertText was called with proper parameters
      expect(mockEditor.insertText).toHaveBeenCalledWith(0, `${entryText} 📖`, 'user');

      // Verify that formatText was called
      expect(mockEditor.formatText).toHaveBeenCalledWith(
        0,
        `${entryText} 📖`.length,
        'link',
        `/entry/${entryId}`
      );

      // Verify that setSelection was called
      expect(mockEditor.setSelection).toHaveBeenCalledWith(`${entryText} 📖`.length);
    });

    it('should not insert link if editor is not available', () => {
      component.editor = null;

      const entryId = 123;
      const entryText = 'Test Entry';

      // Should not throw error
      expect(() => component.insertLink(entryId, entryText)).not.toThrow();
    });

    it('should not insert link if no selection is available', () => {
      const mockEditor = {
        getSelection: jasmine.createSpy('getSelection').and.returnValue(null),
        insertText: jasmine.createSpy('insertText'),
        formatText: jasmine.createSpy('formatText'),
        setSelection: jasmine.createSpy('setSelection'),
      };

      component.editor = mockEditor;

      const entryId = 123;
      const entryText = 'Test Entry';

      component.insertLink(entryId, entryText);

      // Verify that insertText was not called
      expect(mockEditor.insertText).not.toHaveBeenCalled();
      expect(mockEditor.formatText).not.toHaveBeenCalled();
      expect(mockEditor.setSelection).not.toHaveBeenCalled();
    });
  });

  describe('entry link selector', () => {
    it('should open entry link selector when openEntryLinkSelector is called', () => {
      expect(component.showEntryLinkSelector).toBeFalse();

      // Access private method through component instance
      (component as any).openEntryLinkSelector();

      expect(component.showEntryLinkSelector).toBeTrue();
    });

    it('should close entry link selector when onEntryLinkSelectorClosed is called', () => {
      component.showEntryLinkSelector = true;

      component.onEntryLinkSelectorClosed();

      expect(component.showEntryLinkSelector).toBeFalse();
    });

    it('should insert link and close selector when entry is selected', () => {
      spyOn(component, 'insertLink');
      component.showEntryLinkSelector = true;

      const mockEntry: Partial<Entry> = {
        id: 123,
        term: {
          id: 1,
          text: 'Test Term',
          text_normalized: 'test term',
          is_official: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        perspective: {
          id: 1,
          name: 'Test Perspective',
          description: 'Test Description',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        active_draft: undefined,
        is_official: false,
      };

      component.onEntrySelected(mockEntry as Entry);

      expect(component.insertLink).toHaveBeenCalledWith(mockEntry.id!, mockEntry.term!.text);
      expect(component.showEntryLinkSelector).toBeFalse();
    });
  });

  describe('editor configuration', () => {
    it('should include link in toolbar container', () => {
      const toolbarContainer = component.editorConfig.modules.toolbar.container;
      const hasLink = toolbarContainer.some(
        group => Array.isArray(group) && group.includes('link' as any)
      );
      expect(hasLink).toBeTrue();
    });

    it('should include custom-link in toolbar container', () => {
      const toolbarContainer = component.editorConfig.modules.toolbar.container;
      const hasCustomLink = toolbarContainer.some(
        group => Array.isArray(group) && group.includes('custom-link' as any)
      );
      expect(hasCustomLink).toBeTrue();
    });
  });
});
