package com.hps.switchmonitoring.service.emv;

import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 *
 * Service d'analyse EMV complète.
 *
 * Orchestre le parsing de tous les champs chip_ de AUTHO_ACTIVITY_ADM :
 *   - chip_tvr  → TvrParser
 *   - chip_aip  → AIP (Application Interchange Profile)
 *   - chip_cvm_results → CVM (Cardholder Verification Method)
 *   - chip_atc  → ATC velocity check (Application Transaction Counter)
 *   - external_cvv_result_code → CVV externe
 *   - chip_arpc_response_code → réponse ARPC de l'émetteur
 */
@Service
public class ChipAnalysisService {

    // ─── Records publics (réponse sérialisable JSON) ─────────────────────────

    public record AipAnalysis(
        boolean sdaSupported,
        boolean ddaSupported,
        boolean cvmSupported,
        boolean terminalRiskManagement,
        boolean issuerAuthSupported,
        boolean cdaSupported,
        boolean onDeviceCvm,
        String rawHex
    ) {}

    public record CvmAnalysis(
        String  methodCode,
        String  methodLabel,
        boolean applyIfFails,
        String  conditionCode,
        String  result,
        boolean success
    ) {}

    public record AtcAnalysis(
        int     value,
        boolean suspiciousLow,
        String  assessment
    ) {}

    public record ArpcAnalysis(
        String rawCode,
        String interpretation
    ) {}

    public record ChipDiagnostic(
        boolean            hasChipData,
        TvrParser.TvrAnalysis tvr,
        AipAnalysis        aip,
        CvmAnalysis        cvm,
        AtcAnalysis        atc,
        ArpcAnalysis       arpc,
        String             externalCvvResult,
        String             cryptogramType,
        String             overallRisk,
        List<String>       recommendations
    ) {}

    // ─── Point d'entrée ──────────────────────────────────────────────────────

    public ChipDiagnostic analyze(AutohoActivityAdmEntity e) {
        boolean hasChip = e.getChipApplicationCryptogram() != null
                       && !e.getChipApplicationCryptogram().isBlank();

        TvrParser.TvrAnalysis tvr = TvrParser.parse(e.getChipTvr());
        AipAnalysis           aip = parseAip(e.getChipAip());
        CvmAnalysis           cvm = parseCvm(e.getChipCvmResults());
        AtcAnalysis           atc = parseAtc(e.getChipAtc());
        ArpcAnalysis         arpc = parseArpc(e.getChipArpcResponseCode());
        String              cvvEx = interpretCvvResult(e.getExternalCvvResultCode());
        String         cryptoType = decodeCryptogramType(e.getChipCryptogramInfoData());

        String overall = computeOverall(tvr, cvm, atc, e.getExternalCvvResultCode());
        List<String> recs = buildRecommendations(tvr, cvm, atc, e.getExternalCvvResultCode(), arpc);

        return new ChipDiagnostic(
            hasChip, tvr, aip, cvm, atc, arpc,
            cvvEx, cryptoType, overall,
            Collections.unmodifiableList(recs)
        );
    }

    // ─── AIP : Application Interchange Profile (2 bytes = 4 hex chars) ───────

    private AipAnalysis parseAip(String hex) {
        if (hex == null || hex.length() < 2) {
            return new AipAnalysis(false, false, false, false, false, false, false, "");
        }
        try {
            int b1 = Integer.parseInt(hex.trim().substring(0, 2).toUpperCase(), 16);
            return new AipAnalysis(
                (b1 & 0x40) != 0,  // SDA
                (b1 & 0x20) != 0,  // DDA
                (b1 & 0x10) != 0,  // CVM supported
                (b1 & 0x08) != 0,  // Terminal Risk Management
                (b1 & 0x04) != 0,  // Issuer Authentication
                (b1 & 0x01) != 0,  // CDA
                (b1 & 0x02) != 0,  // On-device CVM
                hex.trim()
            );
        } catch (NumberFormatException ex) {
            return new AipAnalysis(false, false, false, false, false, false, false, hex);
        }
    }

    // ─── CVM : Cardholder Verification Method (3 bytes = 6 hex chars) ────────

    private CvmAnalysis parseCvm(String hex) {
        if (hex == null || hex.length() < 6) {
            return new CvmAnalysis("UNKNOWN", "Non disponible", false, "N/A", "UNKNOWN", false);
        }
        try {
            String clean = hex.trim().toUpperCase();
            int rawCode  = Integer.parseInt(clean.substring(0, 2), 16);
            int cond     = Integer.parseInt(clean.substring(2, 4), 16);
            int result   = Integer.parseInt(clean.substring(4, 6), 16);

            boolean applyIfFails = (rawCode & 0x40) != 0;
            int code = rawCode & 0x3F;

            String method = switch (code) {
                case 0x00 -> "FAIL_NO_CVM";
                case 0x01 -> "PLAINTEXT_PIN_ONLINE";
                case 0x02 -> "ENCIPHERED_PIN_ONLINE";
                case 0x03 -> "PLAINTEXT_PIN_AND_SIGNATURE";
                case 0x04 -> "ENCIPHERED_PIN_OFFLINE";
                case 0x05 -> "ENCIPHERED_PIN_AND_SIGNATURE";
                case 0x1E -> "SIGNATURE_PAPER";
                case 0x1F -> "NO_CVM_REQUIRED";
                case 0x3F -> "NOT_APPLICABLE";
                default   -> "UNKNOWN_0x" + String.format("%02X", code);
            };

            String methodLabel = switch (method) {
                case "ENCIPHERED_PIN_ONLINE"          -> "PIN chiffré (online)";
                case "PLAINTEXT_PIN_ONLINE"           -> "PIN en clair (online)";
                case "ENCIPHERED_PIN_OFFLINE"         -> "PIN chiffré (offline)";
                case "PLAINTEXT_PIN_AND_SIGNATURE"    -> "PIN + Signature";
                case "ENCIPHERED_PIN_AND_SIGNATURE"   -> "PIN chiffré + Signature";
                case "SIGNATURE_PAPER"                -> "Signature papier";
                case "NO_CVM_REQUIRED"                -> "Sans vérification porteur";
                case "FAIL_NO_CVM"                    -> "Échec - Aucun CVM";
                case "NOT_APPLICABLE"                 -> "Non applicable";
                default                               -> "Inconnu (" + method + ")";
            };

            String cvmResult = switch (result) {
                case 0x00 -> "UNKNOWN";
                case 0x01 -> "FAILED";
                case 0x02 -> "SUCCESSFUL";
                default   -> "UNKNOWN";
            };

            return new CvmAnalysis(method, methodLabel, applyIfFails,
                String.format("0x%02X", cond), cvmResult, result == 0x02);
        } catch (NumberFormatException ex) {
            return new CvmAnalysis("PARSE_ERROR", "Erreur de parsing", false, "N/A", "ERROR", false);
        }
    }

    // ─── ATC : Application Transaction Counter (2 bytes = 4 hex chars) ───────

    private AtcAnalysis parseAtc(String hex) {
        if (hex == null || hex.isBlank()) {
            return new AtcAnalysis(0, false, "Aucune donnée ATC");
        }
        try {
            int value = Integer.parseInt(hex.trim().toUpperCase(), 16);
            // ATC 1-4 avec une carte existante → risque de clonage (replay)
            boolean suspicious = value > 0 && value <= 4;
            String assessment = suspicious
                ? "SUSPECT : ATC très bas, risque de carte clonée ou de replay attack"
                : value == 0
                    ? "ATC à zéro - transaction potentiellement non authentifiée"
                    : "Normal (ATC=" + value + ")";
            return new AtcAnalysis(value, suspicious, assessment);
        } catch (NumberFormatException ex) {
            return new AtcAnalysis(0, false, "Format ATC invalide: " + hex);
        }
    }

    // ─── ARPC : Authorization Response Cryptogram ────────────────────────────

    private ArpcAnalysis parseArpc(String arpc) {
        if (arpc == null || arpc.isBlank()) {
            return new ArpcAnalysis("", "Pas de réponse ARPC (transaction offline ou non EMV)");
        }
        String trimmed = arpc.trim();
        // Les 2 premiers chars du code ARPC encodent la décision
        String interp = switch (trimmed.substring(0, Math.min(2, trimmed.length())).toUpperCase()) {
            case "00" -> "Approuvé par l'émetteur";
            case "01" -> "Refusé par l'émetteur (mise à jour carte recommandée)";
            case "10" -> "Approuvé - mettre à jour les données carte";
            case "11" -> "Refusé - saisir la carte";
            default   -> "Code ARPC non standard : " + trimmed;
        };
        return new ArpcAnalysis(trimmed, interp);
    }

    // ─── Cryptogram type (chip_cryptogram_info_data) ─────────────────────────

    private String decodeCryptogramType(String cid) {
        if (cid == null || cid.isBlank()) return "UNKNOWN";
        try {
            int val = Integer.parseInt(cid.trim().toUpperCase(), 16);
            int type = (val >> 6) & 0x03;
            return switch (type) {
                case 0x00 -> "AAC (Application Authentication Cryptogram - Transaction refusée offline)";
                case 0x01 -> "TC (Transaction Certificate - Approuvée offline)";
                case 0x02 -> "ARQC (Authorisation Request Cryptogram - Online requis)";
                default   -> "RFU";
            };
        } catch (NumberFormatException ex) {
            return "Format invalide";
        }
    }

    // ─── CVV externe ─────────────────────────────────────────────────────────

    private String interpretCvvResult(String code) {
        if (code == null || code.isBlank()) return "Non vérifié";
        return switch (code.trim().toUpperCase()) {
            case "M"  -> "CVV correct (Match)";
            case "N"  -> "CVV incorrect (No Match) - Risque fraude";
            case "P"  -> "CVV non traité";
            case "S"  -> "CVV devrait être sur la carte mais absent";
            case "U"  -> "Émetteur n'a pas certifié les données CVV";
            case "X"  -> "Résultat indisponible";
            default   -> "Code inconnu : " + code.trim();
        };
    }

    // ─── Calcul risque global ─────────────────────────────────────────────────

    private String computeOverall(TvrParser.TvrAnalysis tvr, CvmAnalysis cvm,
                                  AtcAnalysis atc, String cvvCode) {
        int score = tvr.riskScore();
        if (atc.suspiciousLow()) score += 25;
        if (cvm != null && !cvm.success() && !"NO_CVM_REQUIRED".equals(cvm.methodCode())) score += 15;
        if ("N".equalsIgnoreCase(cvvCode)) score += 20;
        return score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : score > 0 ? "LOW" : "CLEAN";
    }

    // ─── Recommandations contextuelles ───────────────────────────────────────

    private List<String> buildRecommendations(TvrParser.TvrAnalysis tvr, CvmAnalysis cvm,
                                               AtcAnalysis atc, String cvvCode,
                                               ArpcAnalysis arpc) {
        List<String> recs = new ArrayList<>();

        if (tvr.criticalFlags().contains("CARD_ON_EXCEPTION_FILE"))
            recs.add("CRITIQUE : Carte sur liste d'exception - Bloquer et alerter immédiatement");
        if (tvr.criticalFlags().contains("SDA_FAILED"))
            recs.add("Authentification SDA échouée - Possible carte clonée ou données altérées");
        if (tvr.criticalFlags().contains("DDA_FAILED"))
            recs.add("Authentification DDA échouée - Vérifier l'intégrité de la carte");
        if (tvr.criticalFlags().contains("PIN_TRY_LIMIT_EXCEEDED"))
            recs.add("Tentatives PIN épuisées - Blocage carte recommandé");
        if (tvr.criticalFlags().contains("ISSUER_AUTH_FAILED"))
            recs.add("Authentification émetteur (ARPC) échouée - Vérifier connectivité HSM");

        if (atc.suspiciousLow())
            recs.add("ATC=" + atc.value() + " anormalement bas - Risque de replay attack ou de carte clonée");

        if (cvm != null && !cvm.success() && !"NO_CVM_REQUIRED".equals(cvm.methodCode()))
            recs.add("Vérification porteur (" + cvm.methodLabel() + ") non réussie");

        if ("N".equalsIgnoreCase(cvvCode))
            recs.add("CVV externe invalide - Transaction CNP suspecte");

        if (arpc != null && !arpc.rawCode().isBlank()
                && arpc.rawCode().startsWith("01"))
            recs.add("ARPC indique refus émetteur - Mettre à jour les données carte");

        if (recs.isEmpty())
            recs.add("Aucune anomalie EMV détectée - Transaction conforme");

        return recs;
    }
}
