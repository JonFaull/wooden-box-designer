import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxCanvasSimple } from './box-canvas-simple';

describe('BoxCanvasSimple', () => {
  let component: BoxCanvasSimple;
  let fixture: ComponentFixture<BoxCanvasSimple>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxCanvasSimple],
    }).compileComponents();

    fixture = TestBed.createComponent(BoxCanvasSimple);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
