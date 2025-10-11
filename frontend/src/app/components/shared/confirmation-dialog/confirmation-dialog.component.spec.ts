import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit confirmed event when confirm is clicked', () => {
    spyOn(component.confirmed, 'emit');
    
    component.onConfirm();
    
    expect(component.confirmed.emit).toHaveBeenCalled();
  });

  it('should emit cancelled event when cancel is clicked', () => {
    spyOn(component.cancelled, 'emit');
    
    component.onCancel();
    
    expect(component.cancelled.emit).toHaveBeenCalled();
  });

  it('should emit cancelled event when backdrop is clicked', () => {
    spyOn(component.cancelled, 'emit');
    const mockEvent = {
      target: 'backdrop',
      currentTarget: 'backdrop'
    } as any;
    
    component.onBackdropClick(mockEvent);
    
    expect(component.cancelled.emit).toHaveBeenCalled();
  });

  it('should not emit cancelled event when content is clicked', () => {
    spyOn(component.cancelled, 'emit');
    const mockEvent = {
      target: 'content',
      currentTarget: 'backdrop'
    } as any;
    
    component.onBackdropClick(mockEvent);
    
    expect(component.cancelled.emit).not.toHaveBeenCalled();
  });

  it('should have default values', () => {
    expect(component.isOpen).toBe(false);
    expect(component.data.title).toBe('Confirm Action');
    expect(component.data.message).toBe('Are you sure you want to proceed?');
    expect(component.data.confirmText).toBe('Confirm');
    expect(component.data.cancelText).toBe('Cancel');
    expect(component.data.type).toBe('warning');
  });

  it('should accept custom input values', () => {
    component.isOpen = true;
    component.data = {
      title: 'Custom Title',
      message: 'Custom Message',
      confirmText: 'Yes',
      cancelText: 'No',
      type: 'danger'
    };

    expect(component.isOpen).toBe(true);
    expect(component.data.title).toBe('Custom Title');
    expect(component.data.message).toBe('Custom Message');
    expect(component.data.confirmText).toBe('Yes');
    expect(component.data.cancelText).toBe('No');
    expect(component.data.type).toBe('danger');
  });
});
