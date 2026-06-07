import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxCanvasFlat } from './box-canvas-flat';

describe('BoxCanvasFlat', () => {
  let component: BoxCanvasFlat;
  let fixture: ComponentFixture<BoxCanvasFlat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxCanvasFlat],
    }).compileComponents();

    fixture = TestBed.createComponent(BoxCanvasFlat);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
