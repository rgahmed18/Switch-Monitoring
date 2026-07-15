import { AnalysisComparisonComponent } from './analysis-comparison.component';

describe('AnalysisComparisonComponent', () => {
  let component: AnalysisComparisonComponent;

  beforeEach(() => {
    component = new AnalysisComparisonComponent();
  });

  it('devrait reinitialiser toutes les donnees si le filtre ne retourne aucune transaction (pas de valeurs figees)', () => {
    // Bug reel corrige : un early-return sans reset laissait comparisonData,
    // bestPerformer, variance... figes sur le dernier resultat non-vide.
    component.transactions = [{ channel: 'POS' }, { channel: 'ATM' }];
    component.ngOnChanges();
    expect(component.comparisonData.length).toBeGreaterThan(0);

    component.transactions = [];
    component.ngOnChanges();

    expect(component.comparisonData).toEqual([]);
    expect(component.detailedComparison).toEqual([]);
    expect(component.maxValue).toBe(0);
    expect(component.totalValue).toBe(0);
    expect(component.bestPerformer).toBe('');
    expect(component.worstPerformer).toBe('');
    expect(component.variance).toBe(0);
  });

  describe('groupement par canal', () => {
    it('devrait pre-initialiser GAB/POS/E-Commerce meme sans transaction dans un groupe', () => {
      component.transactions = [{ channel: 'POS' }];
      component.comparisonType = 'channel';

      component.ngOnChanges();

      const labels = component.comparisonData.map(d => d.label);
      expect(labels).toContain('GAB');
      expect(labels).toContain('E-Commerce');
    });

    it('devrait normaliser ATM/WITHDRAWAL vers GAB', () => {
      component.transactions = [{ channel: 'ATM' }, { channel: 'WITHDRAWAL' }];
      component.comparisonType = 'channel';

      component.ngOnChanges();

      const gab = component.comparisonData.find(d => d.label === 'GAB')!;
      expect(gab.value).toBe(2);
    });
  });

  describe('groupement par statut', () => {
    it('devrait classer approuve via status ou actionCode 000/00', () => {
      component.transactions = [
        { status: 'APPROVED' },
        { actionCode: '000' },
        { actionCode: '051' },
      ];
      component.comparisonType = 'status';

      component.ngOnChanges();

      const approved = component.comparisonData.find(d => d.label === 'Approuve')!;
      const refused = component.comparisonData.find(d => d.label === 'Refuse')!;
      expect(approved.value).toBe(2);
      expect(refused.value).toBe(1);
    });
  });

  describe('groupement par acquereur', () => {
    it('devrait grouper par acquirerBank et retomber sur Inconnu sinon', () => {
      component.transactions = [{ acquirerBank: 'AWB' }, {}];
      component.comparisonType = 'acquirer';

      component.ngOnChanges();

      const labels = component.comparisonData.map(d => d.label);
      expect(labels).toContain('AWB');
      expect(labels).toContain('Inconnu');
    });
  });

  describe('groupement par mode d\'entree', () => {
    it('devrait classer ECOM comme E-commerce / Web', () => {
      component.transactions = [{ channel: 'ECOM' }];
      component.comparisonType = 'entryMode';

      component.ngOnChanges();

      const ecom = component.comparisonData.find(d => d.label === 'E-commerce / Web')!;
      expect(ecom.value).toBe(1);
    });

    it('devrait classer GAB comme Retrait GAB (Manuel)', () => {
      component.transactions = [{ channel: 'GAB' }];
      component.comparisonType = 'entryMode';

      component.ngOnChanges();

      const gab = component.comparisonData.find(d => d.label === 'Retrait GAB (Manuel)')!;
      expect(gab.value).toBe(1);
    });

    it('devrait classer posEntryMode 05 comme Puce EMV Contact', () => {
      component.transactions = [{ channel: 'POS', posEntryMode: '05' }];
      component.comparisonType = 'entryMode';

      component.ngOnChanges();

      const emv = component.comparisonData.find(d => d.label === 'Puce EMV Contact')!;
      expect(emv.value).toBe(1);
    });
  });

  describe('metriques', () => {
    it('count devrait compter les transactions par groupe', () => {
      component.transactions = [{ channel: 'POS' }, { channel: 'POS' }];
      component.selectedMetric = 'count';
      component.comparisonType = 'channel';

      component.ngOnChanges();

      expect(component.comparisonData.find(d => d.label === 'POS')!.value).toBe(2);
    });

    it('volume devrait sommer les montants du groupe', () => {
      component.transactions = [
        { channel: 'POS', transactionAmount: 100 },
        { channel: 'POS', transactionAmount: 200 },
      ];
      component.selectedMetric = 'volume';
      component.comparisonType = 'channel';

      component.ngOnChanges();

      expect(component.comparisonData.find(d => d.label === 'POS')!.value).toBe(300);
    });

    it('approvalRate devrait calculer le pourcentage d\'approbation du groupe', () => {
      component.transactions = [
        { channel: 'POS', status: 'APPROVED' },
        { channel: 'POS', status: 'DECLINED' },
      ];
      component.selectedMetric = 'approvalRate';
      component.comparisonType = 'channel';

      component.ngOnChanges();

      expect(component.comparisonData.find(d => d.label === 'POS')!.value).toBe(50);
    });

    it('avgLatency devrait exclure les latences hors [0, 30000[', () => {
      component.transactions = [
        { channel: 'POS', latencyMs: 100 },
        { channel: 'POS', latencyMs: 50000 },
      ];
      component.selectedMetric = 'avgLatency';
      component.comparisonType = 'channel';

      component.ngOnChanges();

      expect(component.comparisonData.find(d => d.label === 'POS')!.value).toBe(100);
    });
  });

  describe('formatValue', () => {
    it('devrait formater le volume avec le suffixe MAD', () => {
      component.selectedMetric = 'volume';
      expect(component.formatValue(1234)).toContain('MAD');
    });

    it('devrait formater approvalRate avec 1 decimale et %', () => {
      component.selectedMetric = 'approvalRate';
      expect(component.formatValue(66.666)).toBe('66.7%');
    });

    it('devrait retourner une chaine vide pour une valeur non numerique', () => {
      expect(component.formatValue('abc')).toBe('');
    });
  });

  describe('getChartTitle / getComparisonLabel', () => {
    it('devrait retourner le titre correspondant a la metrique', () => {
      component.selectedMetric = 'approvalRate';
      expect(component.getChartTitle()).toContain('Approbation');
    });

    it('devrait retourner le libelle correspondant au type de comparaison', () => {
      component.comparisonType = 'entryMode';
      expect(component.getComparisonLabel()).toBe('Mode d\'entree');
    });
  });

  describe('meilleure / pire performance', () => {
    it('devrait identifier le meilleur et le pire groupe pour count', () => {
      component.transactions = [
        { channel: 'POS' }, { channel: 'POS' }, { channel: 'ECOM' },
      ];
      component.comparisonType = 'channel';
      component.selectedMetric = 'count';

      component.ngOnChanges();

      expect(component.bestPerformer).toContain('POS');
    });

    it('devrait inverser le tri pour avgLatency (plus bas = meilleur)', () => {
      component.transactions = [
        { channel: 'POS', latencyMs: 100 },
        { channel: 'GAB', latencyMs: 5000 },
      ];
      component.comparisonType = 'channel';
      component.selectedMetric = 'avgLatency';

      component.ngOnChanges();

      expect(component.bestPerformer).toContain('POS');
    });
  });
});
