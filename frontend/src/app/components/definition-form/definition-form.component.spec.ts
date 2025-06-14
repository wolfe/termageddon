import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DefinitionFormComponent } from './definition-form.component';

describe('DefinitionFormComponent', () => {
  let component: DefinitionFormComponent;
  let fixture: ComponentFixture<DefinitionFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DefinitionFormComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DefinitionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
