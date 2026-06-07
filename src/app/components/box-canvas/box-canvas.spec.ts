import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxCanvas } from './box-canvas';

describe('BoxCanvas', () => {
  let component: BoxCanvas;
  let fixture: ComponentFixture<BoxCanvas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxCanvas],
    }).compileComponents();

    fixture = TestBed.createComponent(BoxCanvas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
