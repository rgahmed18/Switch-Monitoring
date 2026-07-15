import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavigationBarComponent } from './navigation-bar.component';

describe('NavigationBarComponent', () => {
  let fixture: ComponentFixture<NavigationBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigationBarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationBarComponent);
  });

  it('devrait se creer sans erreur', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('devrait rendre tous les liens de navigation attendus', () => {
    fixture.detectChanges();

    const links: HTMLAnchorElement[] = fixture.nativeElement.querySelectorAll('a.nav-item');
    const hrefs = Array.from(links).map(a => a.getAttribute('routerLink') ?? a.getAttribute('href'));

    expect(links.length).toBe(8);
  });

  it('devrait afficher le logo Switch Monitor', () => {
    fixture.detectChanges();

    const logo: HTMLElement = fixture.nativeElement.querySelector('.logo-text');
    expect(logo.textContent).toContain('Switch Monitor');
  });
});
