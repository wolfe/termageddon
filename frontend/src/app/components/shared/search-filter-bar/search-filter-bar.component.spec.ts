import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { fakeAsync, tick } from '@angular/core/testing';
import { SearchFilterBarComponent } from './search-filter-bar.component';

describe('SearchFilterBarComponent', () => {
  let component: SearchFilterBarComponent;
  let fixture: ComponentFixture<SearchFilterBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFilterBarComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchFilterBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should debounce search input', fakeAsync(() => {
    vi.spyOn(component.search, 'emit');

    // Simulate rapid typing
    component.searchTerm = 'a';
    component.onSearchInput();

    component.searchTerm = 'ab';
    component.onSearchInput();

    component.searchTerm = 'abc';
    component.onSearchInput();

    // Should not emit immediately
    expect(component.search.emit).not.toHaveBeenCalled();

    // Wait for debounce time (300ms)
    tick(300);

    // Should emit only once with the latest value
    expect(component.search.emit).toHaveBeenCalledTimes(1);
    expect(component.search.emit).toHaveBeenCalledWith('abc');
  }));

  it('should emit search immediately on Enter key', () => {
    vi.spyOn(component.search, 'emit');

    component.searchTerm = 'test';
    const event = new KeyboardEvent('keypress', { key: 'Enter' });

    component.onKeyPress(event);

    expect(component.search.emit).toHaveBeenCalledTimes(1);
    expect(component.search.emit).toHaveBeenCalledWith('test');
  });

  it('should emit searchTermChange immediately', () => {
    vi.spyOn(component.searchTermChange, 'emit');

    component.searchTerm = 'test';
    component.onSearchInput();

    expect(component.searchTermChange.emit).toHaveBeenCalledTimes(1);
    expect(component.searchTermChange.emit).toHaveBeenCalledWith('test');
  });

  it('should handle clear correctly', fakeAsync(() => {
    vi.spyOn(component.search, 'emit');
    vi.spyOn(component.searchTermChange, 'emit');
    vi.spyOn(component.cleared, 'emit');

    component.onClear();

    // searchTermChange and cleared should emit immediately
    expect(component.searchTermChange.emit).toHaveBeenCalledWith('');
    expect(component.cleared.emit).toHaveBeenCalledTimes(1);

    // search should emit after debounce
    tick(300);
    expect(component.search.emit).toHaveBeenCalledWith('');
  }));
});
