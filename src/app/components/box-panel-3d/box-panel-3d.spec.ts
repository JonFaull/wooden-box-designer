import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxPanel3d } from './box-panel-3d';

describe('BoxPanel3d', () => {
  let component: BoxPanel3d;
  let fixture: ComponentFixture<BoxPanel3d>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxPanel3d],
    }).compileComponents();

    fixture = TestBed.createComponent(BoxPanel3d);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
