import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SocialRow } from './social-row';

describe('SocialRow', () => {
  let component: SocialRow;
  let fixture: ComponentFixture<SocialRow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SocialRow],
    }).compileComponents();

    fixture = TestBed.createComponent(SocialRow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
