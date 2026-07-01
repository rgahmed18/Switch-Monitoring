import { Injectable, signal } from '@angular/core';
import { BankProject, BankType, BankStatus } from '../models';

const INITIAL_BANKS: BankProject[] = [

  // ══════════════════════════════════════════════════════════════
  // ZONE AFRIQUE
  // ══════════════════════════════════════════════════════════════

  // ── Maroc ────────────────────────────────────────────────────
  { id: 1,  name: 'Attijariwafa Bank',                      code: 'AWB',   country: 'Maroc',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-01-01' },
  { id: 2,  name: 'Banque Marocaine du Commerce Extérieur', code: 'BMCE',  country: 'Maroc',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-01-15' },
  { id: 3,  name: 'Crédit du Maroc',                        code: 'CDM',   country: 'Maroc',          type: 'ACQUIRER', status: 'ACTIVE',   createdAt: '2023-02-01' },
  { id: 4,  name: 'Société Générale Maroc',                 code: 'SGM',   country: 'Maroc',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-03-01' },
  { id: 5,  name: 'CIH Bank',                               code: 'CIH',   country: 'Maroc',          type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2023-03-15' },
  { id: 6,  name: 'Banque Populaire du Maroc',              code: 'BPM',   country: 'Maroc',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-04-01' },
  { id: 48, name: 'Banque Centrale Populaire',              code: 'BCP',   country: 'Maroc',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-01-01' },
  { id: 49, name: 'Bank of Africa',                         code: 'BOA',   country: 'Maroc',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-01-01' },
  { id: 50, name: 'Crédit Agricole Maroc',                  code: 'CAGM',  country: 'Maroc',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-01-01' },
  { id: 51, name: 'Banque Centrale',                        code: 'BCM',   country: 'Maroc',          type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-01-01' },

  // ── Côte d'Ivoire ────────────────────────────────────────────
  { id: 7,  name: "Société Ivoirienne de Banque",           code: 'SIB',   country: "Côte d'Ivoire",  type: 'ISSUER',   status: 'INACTIVE', createdAt: '2023-04-15' },

  // ── Tunisie ──────────────────────────────────────────────────
  { id: 9,  name: 'Banque Internationale Arabe de Tunisie', code: 'BIAT',  country: 'Tunisie',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-05-15' },

  // ── Sénégal ──────────────────────────────────────────────────
  { id: 10, name: 'Ecobank Sénégal',                        code: 'ECO',   country: 'Sénégal',        type: 'ISSUER',   status: 'INACTIVE', createdAt: '2023-06-01' },

  // ── Afrique du Sud ───────────────────────────────────────────
  { id: 42, name: 'Standard Bank',                          code: 'STDB',  country: 'Afrique du Sud', type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-12-01' },
  { id: 43, name: 'FirstRand',                              code: 'FRNSA', country: 'Afrique du Sud', type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-12-01' },
  { id: 44, name: 'Absa Group',                             code: 'ABSA',  country: 'Afrique du Sud', type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-12-01' },
  { id: 45, name: 'Nedbank',                                code: 'NEDBK', country: 'Afrique du Sud', type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-12-01' },
  { id: 46, name: 'Capitec Bank',                           code: 'CAPTC', country: 'Afrique du Sud', type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2023-12-01' },
  { id: 47, name: 'South African Reserve Bank',             code: 'SARB',  country: 'Afrique du Sud', type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2023-12-01' },

  // ── Nigeria ──────────────────────────────────────────────────
  { id: 52, name: 'Zenith Bank',                            code: 'ZENTH', country: 'Nigeria',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-02-01' },
  { id: 53, name: 'Access Bank',                            code: 'ACCB',  country: 'Nigeria',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-02-01' },
  { id: 54, name: 'United Bank for Africa',                 code: 'UBA',   country: 'Nigeria',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-02-01' },
  { id: 55, name: 'First Bank of Nigeria',                  code: 'FBNIG', country: 'Nigeria',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-02-01' },
  { id: 56, name: 'Guaranty Trust Bank',                    code: 'GTB',   country: 'Nigeria',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-02-01' },
  { id: 57, name: 'Central Bank of Nigeria',                code: 'CBN',   country: 'Nigeria',        type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-02-01' },

  // ── Égypte ───────────────────────────────────────────────────
  { id: 58, name: 'National Bank of Egypt',                 code: 'NBE',   country: 'Égypte',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-03-01' },
  { id: 59, name: 'Banque Misr',                            code: 'BMISR', country: 'Égypte',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-03-01' },
  { id: 60, name: 'Commercial International Bank',          code: 'CIBEG', country: 'Égypte',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-03-01' },
  { id: 61, name: 'Banque Al-Ahli',                         code: 'BAHLI', country: 'Égypte',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-03-01' },
  { id: 62, name: 'Suez Canal Bank',                        code: 'SUEZB', country: 'Égypte',         type: 'ACQUIRER', status: 'ACTIVE',   createdAt: '2024-03-01' },
  { id: 63, name: 'Central Bank of Egypt',                  code: 'CBE',   country: 'Égypte',         type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-03-01' },

  // ══════════════════════════════════════════════════════════════
  // ZONE EUROPE
  // ══════════════════════════════════════════════════════════════

  // ── France ───────────────────────────────────────────────────
  { id: 8,  name: 'BNP Paribas',                            code: 'BNP',   country: 'France',         type: 'ACQUIRER', status: 'ACTIVE',   createdAt: '2023-05-01' },
  { id: 11, name: 'Crédit Agricole',                        code: 'CRDAGR',country: 'France',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-07-01' },
  { id: 12, name: 'Société Générale',                       code: 'SGFR',  country: 'France',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-07-01' },
  { id: 13, name: 'BPCE',                                   code: 'BPCE',  country: 'France',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-07-01' },
  { id: 14, name: 'La Banque Postale',                      code: 'BPOST', country: 'France',         type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2023-07-01' },
  { id: 15, name: 'Banque de France',                       code: 'BDF',   country: 'France',         type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2023-07-01' },
  { id: 16, name: 'Natixis',                                code: 'NATXS', country: 'France',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-07-01' },

  // ── Royaume-Uni ──────────────────────────────────────────────
  { id: 17, name: 'HSBC',                                   code: 'HSBC',  country: 'Royaume-Uni',    type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-08-01' },
  { id: 18, name: 'Barclays',                               code: 'BRCLY', country: 'Royaume-Uni',    type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-08-01' },
  { id: 19, name: 'Lloyds Bank',                            code: 'LLOYD', country: 'Royaume-Uni',    type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-08-01' },
  { id: 20, name: 'Standard Chartered',                     code: 'STCH',  country: 'Royaume-Uni',    type: 'ACQUIRER', status: 'ACTIVE',   createdAt: '2023-08-01' },
  { id: 21, name: 'RBS',                                    code: 'RBS',   country: 'Royaume-Uni',    type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-08-01' },
  { id: 22, name: 'Santander UK',                           code: 'SANUK', country: 'Royaume-Uni',    type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-08-01' },
  { id: 23, name: 'NatWest',                                code: 'NATWST',country: 'Royaume-Uni',    type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-08-01' },

  // ── Espagne ──────────────────────────────────────────────────
  { id: 24, name: 'Banco Santander',                        code: 'BSANT', country: 'Espagne',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-09-01' },
  { id: 25, name: 'BBVA',                                   code: 'BBVA',  country: 'Espagne',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-09-01' },
  { id: 26, name: 'CaixaBank',                              code: 'CAIXA', country: 'Espagne',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-09-01' },
  { id: 27, name: 'Banco Bilbao',                           code: 'BILBAO',country: 'Espagne',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-09-01' },
  { id: 28, name: 'IberCaja',                               code: 'IBCAJ', country: 'Espagne',        type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2023-09-01' },
  { id: 29, name: 'Sabadell',                               code: 'SABDL', country: 'Espagne',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-09-01' },

  // ── Allemagne ────────────────────────────────────────────────
  { id: 30, name: 'Deutsche Bank',                          code: 'DEUTB', country: 'Allemagne',      type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-10-01' },
  { id: 31, name: 'Commerzbank',                            code: 'CRZBNK',country: 'Allemagne',      type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-10-01' },
  { id: 32, name: 'KfW',                                    code: 'KFW',   country: 'Allemagne',      type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2023-10-01' },
  { id: 33, name: 'DZ Bank',                                code: 'DZBNK', country: 'Allemagne',      type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-10-01' },
  { id: 34, name: 'WestLB',                                 code: 'WSTLB', country: 'Allemagne',      type: 'BOTH',     status: 'INACTIVE', createdAt: '2023-10-01' },
  { id: 35, name: 'Bundesbank',                             code: 'BDESB', country: 'Allemagne',      type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2023-10-01' },

  // ── Grèce ────────────────────────────────────────────────────
  { id: 36, name: 'Piraeus Bank',                           code: 'PIRAE', country: 'Grèce',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-11-01' },
  { id: 37, name: 'National Bank of Greece',                code: 'NBG',   country: 'Grèce',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-11-01' },
  { id: 38, name: 'Alpha Bank',                             code: 'ALPHA', country: 'Grèce',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-11-01' },
  { id: 39, name: 'Eurobank',                               code: 'EUROB', country: 'Grèce',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2023-11-01' },
  { id: 40, name: 'Attica Bank',                            code: 'ATTIC', country: 'Grèce',          type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2023-11-01' },
  { id: 41, name: 'TT Hellenic Bank',                       code: 'TTHEL', country: 'Grèce',          type: 'ISSUER',   status: 'INACTIVE', createdAt: '2023-11-01' },

  // ══════════════════════════════════════════════════════════════
  // ZONE AMÉRIQUES
  // ══════════════════════════════════════════════════════════════

  // ── Etats-Unis ───────────────────────────────────────────────
  { id: 64, name: 'JPMorgan Chase',                         code: 'JPMCH', country: 'Etats-Unis',     type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-04-01' },
  { id: 65, name: 'Bank of America',                        code: 'BOFA',  country: 'Etats-Unis',     type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-04-01' },
  { id: 66, name: 'Citigroup',                              code: 'CITGRP',country: 'Etats-Unis',     type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-04-01' },
  { id: 67, name: 'Wells Fargo',                            code: 'WELSFG',country: 'Etats-Unis',     type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-04-01' },
  { id: 68, name: 'Goldman Sachs',                          code: 'GSACH', country: 'Etats-Unis',     type: 'ACQUIRER', status: 'ACTIVE',   createdAt: '2024-04-01' },
  { id: 69, name: 'Morgan Stanley',                         code: 'MGNSTL',country: 'Etats-Unis',     type: 'ACQUIRER', status: 'ACTIVE',   createdAt: '2024-04-01' },
  { id: 70, name: 'Federal Reserve',                        code: 'FEDRSV',country: 'Etats-Unis',     type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-04-01' },

  // ── Canada ───────────────────────────────────────────────────
  { id: 71, name: 'RBC Royal Bank',                         code: 'RBC',   country: 'Canada',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-04-01' },
  { id: 72, name: 'TD Bank',                                code: 'TDBNK', country: 'Canada',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-04-01' },
  { id: 73, name: 'Scotiabank',                             code: 'SCOTAB',country: 'Canada',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-04-01' },
  { id: 74, name: 'BMO',                                    code: 'BMO',   country: 'Canada',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-04-01' },
  { id: 75, name: 'CIBC',                                   code: 'CIBC',  country: 'Canada',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-04-01' },
  { id: 76, name: 'National Bank of Canada',                code: 'NBCAN', country: 'Canada',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-04-01' },
  { id: 77, name: 'Bank of Canada',                         code: 'BKCAN', country: 'Canada',         type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-04-01' },

  // ── Mexique ──────────────────────────────────────────────────
  { id: 78, name: 'Banco Santander México',                 code: 'SANTMX',country: 'Mexique',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-05-01' },
  { id: 79, name: 'BBVA México',                            code: 'BBVAMX',country: 'Mexique',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-05-01' },
  { id: 80, name: 'Scotiabank Inverlat',                    code: 'SCINVL',country: 'Mexique',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-05-01' },
  { id: 81, name: 'Banco del Bajio',                        code: 'BAJIO', country: 'Mexique',        type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-05-01' },
  { id: 82, name: 'Banco Azteca',                           code: 'BAZTEC',country: 'Mexique',        type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-05-01' },
  { id: 83, name: 'Bank of Mexico',                         code: 'BANXCO',country: 'Mexique',        type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-05-01' },

  // ── Brésil ───────────────────────────────────────────────────
  { id: 84, name: 'Banco do Brasil',                        code: 'BDOBR', country: 'Brésil',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-05-01' },
  { id: 85, name: 'Itaú Unibanco',                          code: 'ITAU',  country: 'Brésil',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-05-01' },
  { id: 86, name: 'Banco Bradesco',                         code: 'BRADSC',country: 'Brésil',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-05-01' },
  { id: 87, name: 'Caixa Econômica',                        code: 'CAIXBR',country: 'Brésil',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-05-01' },
  { id: 88, name: 'Banco Santander Brasil',                 code: 'SNTBR', country: 'Brésil',         type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-05-01' },
  { id: 89, name: 'Central Bank of Brazil',                 code: 'BCBRAZ',country: 'Brésil',         type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-05-01' },

  // ══════════════════════════════════════════════════════════════
  // ZONE ASIE
  // ══════════════════════════════════════════════════════════════

  // ── Chine ────────────────────────────────────────────────────
  { id: 90, name: 'ICBC',                                   code: 'ICBC',  country: 'Chine',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-06-01' },
  { id: 91, name: 'China Construction Bank',                code: 'CCB',   country: 'Chine',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-06-01' },
  { id: 92, name: 'Agricultural Bank of China',             code: 'AGBCH', country: 'Chine',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-06-01' },
  { id: 93, name: 'Bank of China',                          code: 'BOCHN', country: 'Chine',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-06-01' },
  { id: 94, name: 'Bank of Communications',                 code: 'BOCOM', country: 'Chine',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-06-01' },
  { id: 95, name: 'China Merchants Bank',                   code: 'CMBCH', country: 'Chine',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-06-01' },

  // ── Japon ────────────────────────────────────────────────────
  { id: 96,  name: 'Bank of Tokyo-Mitsubishi UFJ',          code: 'MUFG',  country: 'Japon',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-06-01' },
  { id: 97,  name: 'Sumitomo Mitsui Banking Corporation',   code: 'SMBC',  country: 'Japon',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-06-01' },
  { id: 98,  name: 'Mizuho Financial Group',                code: 'MIZUH', country: 'Japon',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-06-01' },
  { id: 99,  name: 'Nomura Holdings',                       code: 'NOMUR', country: 'Japon',          type: 'ACQUIRER', status: 'ACTIVE',   createdAt: '2024-06-01' },
  { id: 100, name: 'Japan Post Bank',                       code: 'JPOSTB',country: 'Japon',          type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-06-01' },
  { id: 101, name: 'Bank of Japan',                         code: 'BOJ',   country: 'Japon',          type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-06-01' },

  // ── Singapour ────────────────────────────────────────────────
  { id: 102, name: 'DBS Bank',                              code: 'DBS',   country: 'Singapour',      type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-07-01' },
  { id: 103, name: 'OCBC Bank',                             code: 'OCBC',  country: 'Singapour',      type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-07-01' },
  { id: 104, name: 'UOB',                                   code: 'UOB',   country: 'Singapour',      type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-07-01' },
  { id: 105, name: 'Citibank Singapore',                    code: 'CTISG', country: 'Singapour',      type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-07-01' },
  { id: 106, name: 'HSBC Singapore',                        code: 'HSBCSG',country: 'Singapour',      type: 'ACQUIRER', status: 'ACTIVE',   createdAt: '2024-07-01' },
  { id: 107, name: 'Monetary Authority of Singapore',       code: 'MAS',   country: 'Singapour',      type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-07-01' },

  // ── Hong Kong ────────────────────────────────────────────────
  { id: 108, name: 'HSBC Hong Kong',                        code: 'HSBCHK',country: 'Hong Kong',      type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-07-01' },
  { id: 109, name: 'Bank of China (HK)',                    code: 'BOCHK', country: 'Hong Kong',      type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-07-01' },
  { id: 110, name: 'Standard Chartered HK',                 code: 'SCHK',  country: 'Hong Kong',      type: 'ACQUIRER', status: 'ACTIVE',   createdAt: '2024-07-01' },
  { id: 111, name: 'Hang Seng Bank',                        code: 'HSNBK', country: 'Hong Kong',      type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-07-01' },
  { id: 112, name: 'DBS Bank HK',                           code: 'DBSHK', country: 'Hong Kong',      type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-07-01' },
  { id: 113, name: 'Hong Kong Monetary Authority',          code: 'HKMA',  country: 'Hong Kong',      type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-07-01' },

  // ══════════════════════════════════════════════════════════════
  // ZONE MOYEN-ORIENT
  // ══════════════════════════════════════════════════════════════

  // ── Arabie Saoudite ──────────────────────────────────────────
  { id: 114, name: 'Saudi National Bank',                   code: 'SNBSA', country: 'Arabie Saoudite',   type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-08-01' },
  { id: 115, name: 'Al Rajhi Bank',                         code: 'ALRAJ', country: 'Arabie Saoudite',   type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-08-01' },
  { id: 116, name: 'Riyad Bank',                            code: 'RIYAD', country: 'Arabie Saoudite',   type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-08-01' },
  { id: 117, name: 'SABB',                                  code: 'SABB',  country: 'Arabie Saoudite',   type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-08-01' },
  { id: 118, name: 'Banque Saudi Fransi',                   code: 'SFRNS', country: 'Arabie Saoudite',   type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-08-01' },
  { id: 119, name: 'Saudi Central Bank',                    code: 'SAMA',  country: 'Arabie Saoudite',   type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-08-01' },

  // ── Emirats Arabes Unis ──────────────────────────────────────
  { id: 120, name: 'First Abu Dhabi Bank',                  code: 'FAB',   country: 'Emirats Arabes Unis', type: 'BOTH',   status: 'ACTIVE',   createdAt: '2024-08-01' },
  { id: 121, name: 'Dubai Islamic Bank',                    code: 'DIB',   country: 'Emirats Arabes Unis', type: 'BOTH',   status: 'ACTIVE',   createdAt: '2024-08-01' },
  { id: 122, name: 'ADIB',                                  code: 'ADIB',  country: 'Emirats Arabes Unis', type: 'BOTH',   status: 'ACTIVE',   createdAt: '2024-08-01' },
  { id: 123, name: 'Abu Dhabi Commercial Bank',             code: 'ADCB',  country: 'Emirats Arabes Unis', type: 'BOTH',   status: 'ACTIVE',   createdAt: '2024-08-01' },
  { id: 124, name: 'Mashreq Bank',                          code: 'MASHRQ',country: 'Emirats Arabes Unis', type: 'ACQUIRER', status: 'ACTIVE', createdAt: '2024-08-01' },
  { id: 125, name: 'Central Bank of UAE',                   code: 'CBUAE', country: 'Emirats Arabes Unis', type: 'ISSUER', status: 'ACTIVE',   createdAt: '2024-08-01' },

  // ── Turquie ──────────────────────────────────────────────────
  { id: 126, name: 'Ziraat Bankası',                        code: 'ZIRAT', country: 'Turquie',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-09-01' },
  { id: 127, name: 'Halkbank',                              code: 'HALKB', country: 'Turquie',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-09-01' },
  { id: 128, name: 'Garanti BBVA',                          code: 'GARANT',country: 'Turquie',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-09-01' },
  { id: 129, name: 'İşbank',                                code: 'ISBNK', country: 'Turquie',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-09-01' },
  { id: 130, name: 'Akbank',                                code: 'AKBNK', country: 'Turquie',          type: 'BOTH',     status: 'ACTIVE',   createdAt: '2024-09-01' },
  { id: 131, name: 'Central Bank of the Republic of Turkey',code: 'TCMB',  country: 'Turquie',          type: 'ISSUER',   status: 'ACTIVE',   createdAt: '2024-09-01' },
];

@Injectable({ providedIn: 'root' })
export class BankProjectStoreService {
  private readonly _projects = signal<BankProject[]>([...INITIAL_BANKS]);

  /** Read-only signal  -  components consume this */
  readonly projects = this._projects.asReadonly();

  getAll(): BankProject[] { return this._projects(); }

  getByCode(code: string): BankProject | undefined {
    return this._projects().find(b => b.code.trim().toUpperCase() === code.trim().toUpperCase());
  }

  getName(code: string): string {
    return this.getByCode(code)?.name ?? code;
  }

  add(form: { name: string; code: string; country: string; type: BankType }): BankProject {
    const next: BankProject = {
      id: Math.max(0, ...this._projects().map(b => b.id ?? 0)) + 1,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      country: form.country,
      type: form.type,
      status: 'ACTIVE',
      createdAt: new Date().toISOString().split('T')[0],
    };
    this._projects.update(list => [...list, next]);
    return next;
  }

  update(edited: BankProject): void {
    this._projects.update(list => list.map(b => b.id === edited.id ? edited : b));
  }

  toggleStatus(id: number): void {
    this._projects.update(list =>
      list.map(b => b.id === id
        ? { ...b, status: (b.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') as BankStatus }
        : b
      )
    );
  }

  remove(id: number): void {
    this._projects.update(list => list.filter(b => b.id !== id));
  }
}
