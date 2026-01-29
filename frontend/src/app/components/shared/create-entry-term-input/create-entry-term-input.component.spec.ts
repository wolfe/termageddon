import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CreateEntryTermInputComponent } from './create-entry-term-input.component';
import { GlossaryService } from '../../../services/glossary.service';
import { Term } from '../../../models';

describe('CreateEntryTermInputComponent', () => {
  let component: CreateEntryTermInputComponent;
  let fixture: ComponentFixture<CreateEntryTermInputComponent>;
  let mockGlossaryService: MockedObject<GlossaryService>;

  const mockTerm: Term = {
    id: 1,
    text: 'atom',
    text_normalized: 'atom',
    is_official: false,
    created_at: '',
    updated_at: '',
  };

  beforeEach(async () => {
    const glossaryServiceSpy = {
      getTerms: vi.fn().mockName('GlossaryService.getTerms'),
      getTermsFromUrl: vi.fn().mockName('GlossaryService.getTermsFromUrl'),
    };

    await TestBed.configureTestingModule({
      imports: [CreateEntryTermInputComponent],
      providers: [{ provide: GlossaryService, useValue: glossaryServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEntryTermInputComponent);
    component = fixture.componentInstance;
    mockGlossaryService = TestBed.inject(
      GlossaryService
    ) as MockedObject<GlossaryService>;

    mockGlossaryService.getTerms.mockReturnValue(
      of({
        count: 1,
        next: null,
        previous: null,
        results: [mockTerm],
      })
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sync displayText from selectedTermText input', () => {
    component.selectedTermText = 'Some Term';
    component.ngOnChanges({
      selectedTermText: {
        currentValue: 'Some Term',
        firstChange: false,
        isFirstChange: () => false,
        previousValue: '',
      },
    });

    expect(component.displayText).toBe('Some Term');
  });

  it('should sync displayText from selectedTermId when selectedTermText is set', () => {
    component.selectedTermText = 'atom';
    component.ngOnChanges({
      selectedTermText: {
        currentValue: 'atom',
        firstChange: false,
        isFirstChange: () => false,
        previousValue: '',
      },
    });

    expect(component.displayText).toBe('atom');
  });

  it('should emit termSelected when selectTerm is called', () => {
    vi.spyOn(component.termSelected, 'emit');

    component.selectTerm(mockTerm);

    expect(component.termSelected.emit).toHaveBeenCalledWith({
      termId: 1,
      termText: 'atom',
    });
    expect(component.isDropdownOpen).toBe(false);
    expect(component.displayText).toBe('atom');
  });

  it('should emit termSelected with termId null when selectAddNew is called with non-empty text', () => {
    component.displayText = 'New Term';
    vi.spyOn(component.termSelected, 'emit');

    component.selectAddNew();

    expect(component.termSelected.emit).toHaveBeenCalledWith({
      termId: null,
      termText: 'New Term',
    });
    expect(component.isDropdownOpen).toBe(false);
  });

  it('should not emit termSelected when selectAddNew is called with empty displayText', () => {
    component.displayText = '   ';
    vi.spyOn(component.termSelected, 'emit');

    component.selectAddNew();

    expect(component.termSelected.emit).not.toHaveBeenCalled();
  });

  it('should emit cancel when dropdown is open and document is clicked outside', () => {
    fixture.detectChanges();
    component.isDropdownOpen = true;
    vi.spyOn(component.cancel, 'emit');

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(component.cancel.emit).toHaveBeenCalled();
    expect(component.isDropdownOpen).toBe(false);
  });

  it('should open dropdown and not call getTerms when onInputFocus is called with empty displayText', () => {
    component.displayText = '';
    component.onInputFocus();

    expect(component.isDropdownOpen).toBe(true);
    expect(component.terms).toEqual([]);
    expect(mockGlossaryService.getTerms).not.toHaveBeenCalled();
  });

  it('should track terms by id in trackByTermId', () => {
    expect(component.trackByTermId(0, mockTerm)).toBe(1);
  });
});
