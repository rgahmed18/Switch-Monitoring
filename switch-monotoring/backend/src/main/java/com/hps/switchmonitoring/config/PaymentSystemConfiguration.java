package com.hps.switchmonitoring.config;

import java.util.*;

/**
 * Configuration complète des zones, pays, banques et codes de transaction
 * Basée sur les données réelles du domaine payment/banking
 */
public class PaymentSystemConfiguration {

    // ============================================================================
    // ZONES GÉOGRAPHIQUES & PAYS
    // ============================================================================

    public static final Map<String, List<String>> ZONES_AND_COUNTRIES = Map.ofEntries(
        Map.entry("Europe", Arrays.asList(
            "France",
            "Royaume-Uni",
            "Espagne",
            "Allemagne",
            "Grèce"
        )),
        Map.entry("Afrique", Arrays.asList(
            "Maroc",
            "Afrique du Sud",
            "Nigeria",
            "Égypte"
        )),
        Map.entry("Asie", Arrays.asList(
            "Chine",
            "Japon",
            "Singapour",
            "Hong Kong"
        )),
        Map.entry("Amériques", Arrays.asList(
            "États-Unis",
            "Canada",
            "Mexique",
            "Brésil"
        )),
        Map.entry("Moyen-Orient", Arrays.asList(
            "Arabie Saoudite",
            "Émirats Arabes Unis",
            "Israël",
            "Turquie"
        ))
    );

    // ============================================================================
    // BANQUES PAR PAYS
    // ============================================================================

    public static final Map<String, List<String>> BANKS_BY_COUNTRY = Map.ofEntries(
        // FRANCE
        Map.entry("France", Arrays.asList(
            "BNP Paribas",
            "Crédit Agricole",
            "Société Générale",
            "BPCE",
            "La Banque Postale",
            "Banque de France",
            "Natixis"
        )),
        
        // ROYAUME-UNI
        Map.entry("Royaume-Uni", Arrays.asList(
            "HSBC",
            "Barclays",
            "Lloyds Bank",
            "Standard Chartered",
            "RBS",
            "Santander UK",
            "NatWest"
        )),
        
        // ESPAGNE
        Map.entry("Espagne", Arrays.asList(
            "Banco Santander",
            "BBVA",
            "CaixaBank",
            "Banco Bilbao",
            "IberCaja",
            "Sabadell"
        )),
        
        // ALLEMAGNE
        Map.entry("Allemagne", Arrays.asList(
            "Deutsche Bank",
            "Commerzbank",
            "KfW",
            "DZ Bank",
            "WestLB",
            "Bundesbank"
        )),
        
        // GRÈCE
        Map.entry("Grèce", Arrays.asList(
            "Piraeus Bank",
            "National Bank of Greece",
            "Alpha Bank",
            "Eurobank",
            "Attica Bank",
            "TT Hellenic Bank"
        )),
        
        // MAROC
        Map.entry("Maroc", Arrays.asList(
            "Attijawafa Bank",
            "BCP",
            "Bank of Africa",
            "CIH Bank",
            "Crédit Agricole Maroc",
            "Banque Centrale"
        )),
        
        // AFRIQUE DU SUD
        Map.entry("Afrique du Sud", Arrays.asList(
            "Standard Bank",
            "FirstRand",
            "Absa Group",
            "Nedbank",
            "Capitec Bank",
            "South African Reserve Bank"
        )),
        
        // NIGERIA
        Map.entry("Nigeria", Arrays.asList(
            "Zenith Bank",
            "Access Bank",
            "United Bank for Africa (UBA)",
            "First Bank of Nigeria",
            "Guaranty Trust Bank",
            "Central Bank of Nigeria"
        )),
        
        // ÉGYPTE
        Map.entry("Égypte", Arrays.asList(
            "National Bank of Egypt",
            "Banque Misr",
            "Commercial International Bank (CIB)",
            "Banque Al-Ahli",
            "Suez Canal Bank",
            "Central Bank of Egypt"
        )),
        
        // CHINE
        Map.entry("Chine", Arrays.asList(
            "ICBC",
            "China Construction Bank (CCB)",
            "Agricultural Bank of China (ABC)",
            "Bank of China",
            "Bank of Communications",
            "China Merchants Bank"
        )),
        
        // JAPON
        Map.entry("Japon", Arrays.asList(
            "Bank of Tokyo-Mitsubishi UFJ",
            "Sumitomo Mitsui Banking Corporation",
            "Mizuho Financial Group",
            "Nomura Holdings",
            "Japan Post Bank",
            "Bank of Japan"
        )),
        
        // SINGAPOUR
        Map.entry("Singapour", Arrays.asList(
            "DBS Bank",
            "OCBC Bank",
            "UOB",
            "Citibank",
            "HSBC",
            "Monetary Authority of Singapore"
        )),
        
        // HONG KONG
        Map.entry("Hong Kong", Arrays.asList(
            "HSBC Hong Kong",
            "Bank of China",
            "Standard Chartered HK",
            "Hang Seng Bank",
            "DBS Bank HK",
            "Hong Kong Monetary Authority"
        )),
        
        // ÉTATS-UNIS
        Map.entry("États-Unis", Arrays.asList(
            "JPMorgan Chase",
            "Bank of America",
            "Citigroup",
            "Wells Fargo",
            "Goldman Sachs",
            "Morgan Stanley",
            "Federal Reserve"
        )),
        
        // CANADA
        Map.entry("Canada", Arrays.asList(
            "RBC Royal Bank",
            "TD Bank",
            "Scotiabank",
            "BMO",
            "CIBC",
            "National Bank of Canada",
            "Bank of Canada"
        )),
        
        // MEXIQUE
        Map.entry("Mexique", Arrays.asList(
            "Banco Santander México",
            "BBVA México",
            "Scotiabank Inverlat",
            "Banco del Bajío",
            "Banco Azteca",
            "Bank of Mexico"
        )),
        
        // BRÉSIL
        Map.entry("Brésil", Arrays.asList(
            "Banco do Brasil",
            "Itaú Unibanco",
            "Banco Bradesco",
            "Caixa Econômica",
            "Banco Santander Brasil",
            "Central Bank of Brazil"
        )),
        
        // ARABIE SAOUDITE
        Map.entry("Arabie Saoudite", Arrays.asList(
            "Saudi National Bank",
            "Al Rajhi Bank",
            "Riyad Bank",
            "SABB",
            "Banque Saudi Fransi",
            "Saudi Central Bank"
        )),
        
        // ÉMIRATS ARABES UNIS
        Map.entry("Émirats Arabes Unis", Arrays.asList(
            "First Abu Dhabi Bank",
            "Dubai Islamic Bank",
            "ADIB",
            "Abu Dhabi Commercial Bank",
            "Mashreq Bank",
            "Central Bank of UAE"
        )),
        
        // ISRAËL
        Map.entry("Israël", Arrays.asList(
            "Bank Leumi",
            "Bank Hapoalim",
            "Mizrahi Tefahot Bank",
            "Israel Discount Bank",
            "Bank of Israel",
            "Bank of Achievement"
        )),
        
        // TURQUIE
        Map.entry("Turquie", Arrays.asList(
            "Ziraat Bankası",
            "Halkbank",
            "Garanti BBVA",
            "İşbank",
            "Akbank",
            "Central Bank of the Republic of Turkey"
        ))
    );

    // ============================================================================
    // TYPES DE TRANSACTIONS (MTI - Message Type Indicator)
    // ============================================================================

    public static final Map<String, String> MTI_TYPES = Map.ofEntries(
        Map.entry("0100", "Demande d'autorisation"),
        Map.entry("0110", "Réponse d'autorisation"),
        Map.entry("0120", "Transaction financière"),
        Map.entry("0130", "Réponse financière"),
        Map.entry("0200", "Avis financier"),
        Map.entry("0210", "Réponse avis financier"),
        Map.entry("0220", "Demande d'annulation"),
        Map.entry("0230", "Réponse d'annulation"),
        Map.entry("0240", "Demande de remboursement"),
        Map.entry("0250", "Réponse de remboursement"),
        Map.entry("0260", "Demande de dépôt"),
        Map.entry("0270", "Réponse de dépôt"),
        Map.entry("0280", "Inquiry request"),
        Map.entry("0290", "Inquiry response"),
        Map.entry("0420", "Reversal request"),
        Map.entry("0430", "Reversal response"),
        Map.entry("0800", "Network management"),
        Map.entry("0810", "Network management response")
    );

    // ============================================================================
    // TYPES DE TRANSACTIONS (TRANSACTION CODES)
    // ============================================================================

    public static final Map<String, String> TRANSACTION_TYPES = Map.ofEntries(
        // RESERVES & RELEASES
        Map.entry("RH", "HOLD RESERVE"),
        Map.entry("RR", "RELEASE H RSV C"),
        Map.entry("RS", "DIRECT D RESERVE"),
        Map.entry("RT", "RELEASE DD RSV C"),
        
        // FEES & CHARGES
        Map.entry("P8", "Additional Stat"),
        Map.entry("C8", "Magazine Fees"),
        Map.entry("MS", "PAYMENT VOUCHER"),
        Map.entry("F5", "LOAD FEE NBC"),
        Map.entry("F6", "RELOAD FEE NBC"),
        Map.entry("N1", "LOAD NBANK CUSTM"),
        Map.entry("N2", "RELOAD NBANK CST"),
        Map.entry("F7", "LOAD FEE BC"),
        Map.entry("F8", "RELOAD FEE BC"),
        Map.entry("N3", "LOAD BANK CUSTM"),
        Map.entry("N4", "RELOAD BANK CSTM"),
        
        // ADJUSTMENTS
        Map.entry("06", "PRIN DR ADJ"),
        Map.entry("07", "PRIN CR ADJ"),
        
        // TRANSFERS & VOUCHERS
        Map.entry("T1", "PPD DEBIT TRSF"),
        Map.entry("T2", "PPD CR TRSF"),
        Map.entry("T3", "PPD Transfer Fee"),
        Map.entry("UL", "UNLOAD"),
        Map.entry("28", "Ticket COPY REQ"),
        
        // ACCOUNT MANAGEMENT
        Map.entry("X8", "OTHER REG.INTERE"),
        Map.entry("AM", "ACCT.MNGMT FEE"),
        Map.entry("MC", "MERGE CASH"),
        Map.entry("WD", "COST TXN WD"),
        
        // INTEREST & CHARGES
        Map.entry("7I", "SH/A Mis crc int"),
        Map.entry("BI", "COST TXN BI"),
        Map.entry("PC", "COST TXN PC"),
        
        // INSTALLMENTS & LOANS
        Map.entry("8T", "EPP INSTAL"),
        Map.entry("7T", "TRX LOAN"),
        Map.entry("6I", "INST MTH INTRST"),
        
        // CASH & CONVERSIONS
        Map.entry("CB", "CASH BACK"),
        Map.entry("5C", "CASH LOAN CONV"),
        Map.entry("SA", "AUTO FINANCE"),
        Map.entry("5N", "CHEQUE LOAN CONV"),
        Map.entry("5S", "E-COM LOAN CONV"),
        Map.entry("5F", "FEE LOAN CONV"),
        Map.entry("5E", "INTRST LOAN CONV"),
        Map.entry("5T", "PUR LOAN CONV"),
        Map.entry("5H", "TAX LOAN CONV"),
        Map.entry("5R", "TRSF LOAN CONV"),
        Map.entry("5G", "O/S BAL LN CONV"),
        
        // LOAN FEES
        Map.entry("RF", "LOAN REMT FEE"),
        Map.entry("TS", "PT TRANSFER"),
        Map.entry("EF", "LOAN ENROL FEE"),
        Map.entry("FF", "LOAN FIN FEE"),
        Map.entry("HF", "LOAN HAND FEE"),
        Map.entry("IF", "LOAN INS FEE"),
        Map.entry("BF", "LOAN INTERBK FEE"),
        Map.entry("TF", "LOAN INTRABK FEE"),
        Map.entry("EP", "LOAN PAYOFF PEN"),
        
        // INSTALLMENT FEES
        Map.entry("8F", "INST MONTH FEE"),
        Map.entry("8S", "LOP INSTAL"),
        Map.entry("8P", "BAL CONV INSTAL"),
        Map.entry("7P", "ACCT LOAN"),
        Map.entry("8C", "CARD INSTAL"),
        Map.entry("7C", "CARD LOAN"),
        Map.entry("8N", "ADD LOP INSTAL"),
        
        // PERSONAL LOANS
        Map.entry("7S", "PERS CASH LOAN"),
        Map.entry("7N", "PERS NCASH LOAN"),
        Map.entry("FB", "FEE BACK TRX"),
        
        // CARD MANAGEMENT
        Map.entry("B2", "Lost/Stolen card"),
        Map.entry("CR", "Card Replacement"),
        Map.entry("21", "Card Fees"),
        Map.entry("33", "Card Misc Debit"),
        Map.entry("34", "Card Misc Debit"),
        Map.entry("35", "Card Misc Debit"),
        Map.entry("36", "Card Misc Debit"),
        Map.entry("37", "Card Misc Debit"),
        Map.entry("38", "Card Misc Credit"),
        Map.entry("39", "Card Misc Credit"),
        
        // TAXES & FUND
        Map.entry("81", "Fund Tax"),
        
        // BANKING FEES
        Map.entry("BA", "B W Bull Ele Fee"),
        Map.entry("B1", "Processing fees"),
        Map.entry("B3", "Collect fees"),
        Map.entry("B4", "Auth Fees"),
        Map.entry("B5", "B V PICK-UP C FE"),
        Map.entry("26", "Ticket COPY REQ"),
        Map.entry("32", "Misc Fees"),
        
        // MERCHANT FEES
        Map.entry("41", "Discount"),
        Map.entry("42", "Equipment Fees"),
        Map.entry("45", "Mer Dupli Stat"),
        Map.entry("54", "Merc Misc Debit"),
        Map.entry("55", "Merc Misc Debit"),
        Map.entry("56", "Merc Misc Debit"),
        Map.entry("57", "Merc Misc Credit"),
        Map.entry("40", "Merc Incent Pymt"),
        Map.entry("48", "Merc Misc Debit"),
        Map.entry("49", "Merc Misc Credit"),
        
        // DEPOSITS
        Map.entry("6A", "Cheque deposit"),
        Map.entry("6D", "Cash deposit"),
        Map.entry("6E", "PWC"),
        Map.entry("6F", "RELOAD"),
        Map.entry("6G", "DEPOSIT RELOAD"),
        
        // CHEQUE & TRANSFERS
        Map.entry("61", "Cheque"),
        Map.entry("62", "CH Transfer"),
        Map.entry("2D", "CASH TRF"),
        
        // INTEREST & CHARGES
        Map.entry("63", "Debtor interest"),
        Map.entry("64", "Creditor Interes"),
        Map.entry("65", "Automat Deposit"),
        Map.entry("66", "Overdrawn Fees"),
        Map.entry("67", "Late Payment Fee"),
        Map.entry("72", "Early Settlement"),
        Map.entry("68", "Cheque Fees"),
        
        // CHARGES & FEES
        Map.entry("PF", "Periodic Fees"),
        Map.entry("P0", "POS Rental"),
        Map.entry("P1", "POS Destroyed"),
        Map.entry("P2", "Pos Repairs/Main"),
        Map.entry("P3", "Mer Pick-Up Card"),
        
        // SPECIAL FEES
        Map.entry("0A", "Reg Fees"),
        Map.entry("0C", "CHGBK FEE"),
        Map.entry("0E", "INV FEE"),
        Map.entry("0F", "FAITH COLLECTION"),
        Map.entry("0G", "COPY REQ FEE"),
        
        // CORE TRANSACTION TYPES
        Map.entry("01", "Purchase"),
        Map.entry("02", "Chargeback"),
        Map.entry("03", "Cash Adv"),
        Map.entry("04", "Withdrawal"),
        Map.entry("05", "Unique Trans"),
        Map.entry("09", "CREDIT VOUCHER"),
        Map.entry("10", "PIN FEES"),
        
        // CONVERSION & FEES
        Map.entry("22", "Cash Fees"),
        Map.entry("23", "Conversion Fees"),
        Map.entry("24", "Insurance Fees"),
        Map.entry("25", "Assistance fees"),
        Map.entry("27", "Dupli Stat"),
        Map.entry("29", "Withdrawal Fees"),
        
        // LEGAL & SETTLEMENT
        Map.entry("73", "Litigation"),
        Map.entry("74", "Write Off"),
        Map.entry("76", "SH/A Misc Debit"),
        Map.entry("77", "SH/A Misc credit"),
        
        // LOANS & INSTALLMENTS
        Map.entry("79", "Loan"),
        Map.entry("80", "Instalment"),
        Map.entry("82", "Interest Install"),
        Map.entry("83", "Redemption"),
        Map.entry("87", "Early Clos Bal"),
        Map.entry("88", "PURSHASE FEES"),
        
        // BANKING SERVICES
        Map.entry("B6", "B Copy Req Fees"),
        Map.entry("B7", "B Chargeback Fee"),
        Map.entry("B8", "Bnk Reversal Fee"),
        Map.entry("B9", "B W Bull Man Fee"),
        
        // PAYMENT & PENALTIES
        Map.entry("C2", "Pymt inc fees"),
        Map.entry("C3", "Penalty fees"),
        Map.entry("C6", "Statement fee"),
        Map.entry("C7", "Postal charge"),
        Map.entry("C9", "Ren Fees"),
        
        // CUSTOMER SERVICE
        Map.entry("D5", "Cust Service Fee"),
        Map.entry("D6", "WRITE/OFF INTER."),
        
        // BALANCE & INQUIRIES
        Map.entry("30", "Balance Inquiry"),
        Map.entry("31", "No suffi Funds"),
        
        // INTEREST RATES
        Map.entry("Y1", "PURCH.BONI.INTER"),
        Map.entry("Y2", "CASH BONI.INTERE"),
        Map.entry("Y3", "OTHER BONI.INTER"),
        Map.entry("Y4", "PURCH LATE INTER"),
        Map.entry("Y5", "CASH LATE INTERE"),
        Map.entry("Y6", "OTHER LATE INTER"),
        Map.entry("Y7", "PURCH.LATE SUS.I"),
        Map.entry("Y8", "CASH LATE SUS.IN"),
        Map.entry("Y9", "OTHER LATE SUS I"),
        
        // NSF & COLLECTION
        Map.entry("A2", "COLL FEE DB IN"),
        Map.entry("A3", "NSF FEE DB IN"),
        
        // REGISTERED INTEREST
        Map.entry("Z1", "PUR.REG.SUS.INTE"),
        Map.entry("Z2", "CASH REG.SUS.INT"),
        Map.entry("Z3", "OTHER REG.SUS.IN"),
        
        // LOYALTY & REWARDS
        Map.entry("LP", "LOYALTY PENALTY"),
        Map.entry("MR", "MEMBERSHI REWARD"),
        
        // GLOBAL RATES
        Map.entry("X1", "GLOBAL REG INTER"),
        Map.entry("X2", "GLOBAL BONIF INT"),
        Map.entry("X3", "GLOBAL LATE INT"),
        Map.entry("X4", "GLOBAL LATE SUSP"),
        Map.entry("X5", "GOBAL REG.SUSPEN"),
        Map.entry("X6", "PURCHASE REG.INT"),
        Map.entry("X7", "CASH REG.INTERES"),
        
        // FEES & CHARGES
        Map.entry("F0", "PLASTIC FEES"),
        Map.entry("F1", "Photo Fees"),
        Map.entry("FP", "Loan payoff"),
        Map.entry("FM", "HOLD RESERVE"),
        Map.entry("FR", "Status rs fee"),
        
        // MERCHANT SERVICES
        Map.entry("MK", "MARKUP FEES"),
        
        // DCC & TAX
        Map.entry("DM", "DCC Merch Margin"),
        Map.entry("GT", "Government tax"),
        
        // SKIP PAYMENT
        Map.entry("SP", "SKIP PMT FEE")
    );

    // ============================================================================
    // CODES DE RÉPONSE ISO 8583
    // ============================================================================

    public static final Map<String, String> ISO8583_RESPONSE_CODES = Map.ofEntries(
        Map.entry("00", "Approuvée - Transaction réussie"),
        Map.entry("01", "Refuser l'émission - Contactez la banque émettrice"),
        Map.entry("02", "Transaction invalide - Type de transaction invalide"),
        Map.entry("03", "Commencement invalide - Numérotation commerciale invalide"),
        Map.entry("04", "Carte invalide - Numéro de carte non exécurisé"),
        Map.entry("05", "Déclinée - Problème général"),
        Map.entry("08", "Approuvée (honor with identification)"),
        Map.entry("10", "Partial approval"),
        Map.entry("12", "Montant invalide"),
        Map.entry("13", "Montant invalide - Argent saisie invalide"),
        Map.entry("14", "Numéro de compte invalide"),
        Map.entry("15", "Numérique indisponible - Établissement indisponible"),
        Map.entry("19", "Re-envoyer la transaction"),
        Map.entry("21", "Pas d'opération numérique"),
        Map.entry("25", "Pas compatible à la norme"),
        Map.entry("28", "Pas accessible - Désaccord d'accès"),
        Map.entry("29", "Transaction non mutable"),
        Map.entry("30", "Erreur de format - Exécution partager message long"),
        Map.entry("31", "Banque non reconnue"),
        Map.entry("32", "Transaction incomplète"),
        Map.entry("33", "Carte expiré - Dépassé les délais"),
        Map.entry("34", "Suspicion de fraude"),
        Map.entry("35", "Marchand refusé"),
        Map.entry("36", "Numérique restreinte - Nombre de tentatives restreint"),
        Map.entry("37", "Appellation expiré"),
        Map.entry("38", "Dépassement du taux de sécurité"),
        Map.entry("39", "Compte non trouvé"),
        Map.entry("40", "Carte perdue - Carte signalé comme perdu"),
        Map.entry("41", "Carte volée - Carte signalé comme volée"),
        Map.entry("42", "Aucune compte d'enregistrement"),
        Map.entry("43", "Carte perdue/Volée - Transaction interdite"),
        Map.entry("51", "Provision insuffisante - Fond insuffisant"),
        Map.entry("52", "Pas de compte de chèque"),
        Map.entry("53", "Pas de compte d'épargne"),
        Map.entry("54", "Compte fermé"),
        Map.entry("55", "PIN incorrect - Mauvais code PIN"),
        Map.entry("56", "Aucune réclamation pour la carte"),
        Map.entry("57", "Transaction non autorisée au titulaire"),
        Map.entry("58", "Accès interdit au terminal"),
        Map.entry("59", "Fraude suspecte"),
        Map.entry("60", "Marchand contacté pour retirer la carte"),
        Map.entry("61", "Limite dépassée - Autorisant retrait dépassé"),
        Map.entry("62", "Montant dépassé"),
        Map.entry("63", "Violation de sécurité"),
        Map.entry("64", "Montant original incorrect"),
        Map.entry("65", "Dépassement du nombre de retrait"),
        Map.entry("66", "Appel non autorisé"),
        Map.entry("67", "Message inutile"),
        Map.entry("68", "Timeout - Délai dépassé"),
        Map.entry("69", "Timeout - Concentrateur indisponible"),
        Map.entry("70", "Timeout - Émetteur indisponible - Banque émettrice impossible à rejoindre"),
        Map.entry("71", "Aucune réponse"),
        Map.entry("72", "Aucune information disponible"),
        Map.entry("73", "Code d'authentification invalide"),
        Map.entry("74", "Clé d'authentification invalide"),
        Map.entry("75", "Tentative d'authentification dépassée"),
        Map.entry("76", "Problème authentification"),
        Map.entry("77", "Pas d'émetteur pour signaler fraude"),
        Map.entry("78", "Demande non autorisée"),
        Map.entry("79", "Émetteur refusé l'inscription"),
        Map.entry("80", "Problème visa/mastercard"),
        Map.entry("81", "Transaction urgente"),
        Map.entry("82", "Délai de mise à jour dépassé"),
        Map.entry("83", "Impossible de localiser le tiers"),
        Map.entry("84", "Problème de routing"),
        Map.entry("85", "Montant incompatible"),
        Map.entry("86", "Délai commande dépassé"),
        Map.entry("87", "Message en attente reçu"),
        Map.entry("88", "Message non reconnue"),
        Map.entry("89", "Historique invalide"),
        Map.entry("90", "Problème cut-through"),
        Map.entry("91", "Émetteur indisponible - Banque émettrice impossible à rejoindre"),
        Map.entry("92", "Routage indisponible"),
        Map.entry("93", "Violation règle de transaction"),
        Map.entry("94", "Doubler transaction"),
        Map.entry("95", "Anomalie système"),
        Map.entry("96", "Erreur système - Dysfonctionnement du système")
    );

    // ============================================================================
    // TYPES DE TRANSACTIONS PAR CANAL
    // ============================================================================

    public static final Map<String, List<String>> TRANSACTION_TYPES_BY_CHANNEL = Map.ofEntries(
        Map.entry("ATM", Arrays.asList(
            "WITHDRAWAL",
            "BALANCE_INQUIRY",
            "PIN_CHANGE",
            "DEPOSIT",
            "TRANSFER",
            "CASH_ADVANCE",
            "MINI_STATEMENT",
            "FAST_CASH"
        )),
        Map.entry("POS", Arrays.asList(
            "SALE",
            "VOID",
            "REFUND",
            "PRE_AUTH",
            "COMPLETION",
            "MANUAL_ENTRY",
            "CONTACTLESS",
            "CHIP_READ",
            "RECURRING_PAYMENT",
            "PREAUTHORIZATION_REVERSAL"
        )),
        Map.entry("ECOM", Arrays.asList(
            "PURCHASE",
            "RECURRING",
            "3DS_AUTH",
            "FRAUD_CHECK",
            "INSTALLMENT_PAYMENT",
            "SUBSCRIPTION",
            "ONE_CLICK_PAYMENT",
            "WALLET_PAYMENT",
            "TOKENIZED_PAYMENT",
            "SAVED_CARD_PAYMENT"
        ))
    );

    // ============================================================================
    // MÉTHODES DE SÉCURITÉ PAR CANAL
    // ============================================================================

    public static final Map<String, List<String>> SECURITY_METHODS_BY_CHANNEL = Map.ofEntries(
        Map.entry("ATM", Arrays.asList(
            "PIN_ONLINE",
            "PIN_OFFLINE",
            "BIOMETRIC",
            "CHIP_AUTHENTICATION"
        )),
        Map.entry("POS", Arrays.asList(
            "PIN_ONLINE",
            "NFC_CONTACTLESS",
            "SIGNATURE",
            "CHIP_READ",
            "MAGNETIC_STRIPE",
            "BIOMETRIC"
        )),
        Map.entry("ECOM", Arrays.asList(
            "CVV_ONLY",
            "3DS",
            "3DS2",
            "BIOMETRIC",
            "FINGERPRINT",
            "FACE_RECOGNITION",
            "DEVICE_BINDING",
            "CHALLENGE_RESPONSE"
        ))
    );

    // ============================================================================
    // STATUTS DE TRANSACTION
    // ============================================================================

    public static final Map<String, String> TRANSACTION_STATUSES = Map.ofEntries(
        Map.entry("PENDING", "En attente"),
        Map.entry("APPROVED", "Approuvée"),
        Map.entry("DECLINED", "Refusée"),
        Map.entry("FAILED", "Échouée"),
        Map.entry("ERROR", "Erreur"),
        Map.entry("TIMEOUT", "Timeout"),
        Map.entry("FRAUD_BLOCKED", "Bloquée (Fraude)"),
        Map.entry("REVERSED", "Annulée"),
        Map.entry("SETTLED", "Acquittée"),
        Map.entry("CHARGEBACKED", "Rétrocession")
    );
}
