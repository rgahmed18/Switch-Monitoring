package com.hps.switchmonitoring.domain;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Classe IdClass pour la clé primaire composée de AUTHO_ACTIVITY_ADM
 * 
 * Clés:
 * - reference_number
 * - internal_stan
 * - external_stan
 * - routing_code
 * - capture_code
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AutohoActivityAdmPk implements Serializable {

  private static final long serialVersionUID = 1L;

  private String referenceNumber;
  private String internalStan;
  private String externalStan;
  private String routingCode;
  private String captureCode;

  @Override
  public int hashCode() {
    int result = referenceNumber != null ? referenceNumber.hashCode() : 0;
    result = 31 * result + (internalStan != null ? internalStan.hashCode() : 0);
    result = 31 * result + (externalStan != null ? externalStan.hashCode() : 0);
    result = 31 * result + (routingCode != null ? routingCode.hashCode() : 0);
    result = 31 * result + (captureCode != null ? captureCode.hashCode() : 0);
    return result;
  }

  @Override
  public boolean equals(Object obj) {
    if (this == obj) return true;
    if (obj == null || getClass() != obj.getClass()) return false;
    
    AutohoActivityAdmPk other = (AutohoActivityAdmPk) obj;
    
    if (referenceNumber == null) {
      if (other.referenceNumber != null) return false;
    } else if (!referenceNumber.equals(other.referenceNumber)) return false;
    
    if (internalStan == null) {
      if (other.internalStan != null) return false;
    } else if (!internalStan.equals(other.internalStan)) return false;
    
    if (externalStan == null) {
      if (other.externalStan != null) return false;
    } else if (!externalStan.equals(other.externalStan)) return false;
    
    if (routingCode == null) {
      if (other.routingCode != null) return false;
    } else if (!routingCode.equals(other.routingCode)) return false;
    
    if (captureCode == null) {
      if (other.captureCode != null) return false;
    } else if (!captureCode.equals(other.captureCode)) return false;
    
    return true;
  }
}
