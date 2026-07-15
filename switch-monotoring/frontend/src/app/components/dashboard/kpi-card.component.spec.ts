import { KpiCardComponent } from './kpi-card.component';

describe('KpiCardComponent', () => {
  let component: KpiCardComponent;

  beforeEach(() => {
    component = new KpiCardComponent();
  });

  it('devrait utiliser "default" comme variant par defaut', () => {
    expect(component.variant).toBe('default');
  });

  it('variantStyles devrait fournir une classe pour chaque variant', () => {
    expect(component.variantStyles['default']).toContain('border-border');
    expect(component.variantStyles['success']).toContain('border-success');
    expect(component.variantStyles['warning']).toContain('border-warning');
    expect(component.variantStyles['danger']).toContain('border-destructive');
  });

  it('iconVariantStyles devrait fournir une couleur d\'icone par variant', () => {
    expect(component.iconVariantStyles['success']).toBe('text-success');
    expect(component.iconVariantStyles['danger']).toBe('text-destructive');
  });

  it('devrait accepter les inputs title/value/subtitle/trend', () => {
    component.title = 'Volume total';
    component.value = '1 234';
    component.subtitle = '+12%';
    component.trend = { value: '5%', positive: true };

    expect(component.title).toBe('Volume total');
    expect(component.value).toBe('1 234');
    expect(component.trend?.positive).toBeTrue();
  });
});
