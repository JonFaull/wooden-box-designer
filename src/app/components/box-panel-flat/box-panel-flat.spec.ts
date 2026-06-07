import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxPanelFlat } from './box-panel-flat';

describe('BoxPanelFlat', () => {
  let component: BoxPanelFlat;
  let fixture: ComponentFixture<BoxPanelFlat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxPanelFlat],
    }).compileComponents();

    fixture = TestBed.createComponent(BoxPanelFlat);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
