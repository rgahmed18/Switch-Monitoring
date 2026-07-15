import { Injectable } from '@angular/core';
import { ApiService } from '../api.service';
import { AppStateService } from '../state.service';
import { PaymentSystemConfig } from '../models';
import { Observable, tap, catchError } from 'rxjs';
import { of } from 'rxjs';

/**
 * Service dédié au chargement et à la gestion de la configuration du système de paiement
 * Responsable de:
 * - Charger la configuration complète du backend
 * - Créer les dropdowns et filtres
 * - Gérer les codes ISO 8583
 * - Gérer les MTI codes
 * - Fournir les données de référence pour le filtrage
 */
@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  
  private configCache: PaymentSystemConfig | null = null;
  private cacheExpiry: Date | null = null;
  private readonly CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour cache

  constructor(
    private apiService: ApiService,
    private stateService: AppStateService
  ) {}

  /**
   * Load complete system configuration from backend
   * This includes:
   * - Zones & Countries
   * - Banks by country
   * - ISO 8583 Response Codes
   * - Transaction Types (MTI)
   * - Security Methods
   * - Transaction Statuses
   */
  public loadCompleteConfiguration(): Observable<PaymentSystemConfig> {
    // Check if we have valid cache
    if (this.configCache && this.cacheExpiry && new Date() < this.cacheExpiry) {
      return of(this.configCache);
    }

    // Mark loading start
    this.stateService.setConfigLoading(true);
    this.stateService.setConfigError(null);

    return this.apiService.getCompleteConfiguration().pipe(
      tap((config: PaymentSystemConfig) => {
        // Cache the result
        this.configCache = config;
        this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);
        
        // Update state
        this.stateService.setSystemConfig(config);
        this.stateService.setConfigLoading(false);
      }),
      catchError((error) => {
        const errorMsg = error?.error?.message || 'Failed to load configuration';
        this.stateService.setConfigError(errorMsg);
        this.stateService.setConfigLoading(false);
        
        throw error;
      })
    );
  }

  /**
   * Get zones with caching
   */
  public getZones(): Observable<{ [zone: string]: string[] }> {
    const config = this.stateService.systemConfig();
    if (config?.zones) {
      return of(config.zones);
    }
    return this.apiService.getZonesAndCountries();
  }

  /**
   * Get banks for a specific zone
   */
  public getBanksByZone(zone: string): Observable<any> {
    return this.apiService.getBanksByZone(zone);
  }

  /**
   * Get banks for a specific country
   */
  public getBanksByCountry(country: string): Observable<any> {
    return this.apiService.getBanksByCountry(country);
  }

  /**
   * Get all transaction types (MTI codes)
   */
  public getTransactionTypes(): Observable<{ [mti: string]: string }> {
    const config = this.stateService.systemConfig();
    if (config?.transactionTypes) {
      return of(config.transactionTypes);
    }
    return this.apiService.getTransactionTypes();
  }

  /**
   * Get transaction types for a specific channel
   */
  public getTransactionTypesByChannel(
    channel: 'GAB' | 'POS' | 'ECOM'
  ): Observable<any> {
    return this.apiService.getTransactionTypesByChannel(channel);
  }

  /**
   * Get all ISO 8583 response codes
   */
  public getResponseCodes(): Observable<{ [code: string]: string }> {
    const config = this.stateService.systemConfig();
    if (config?.responseCodes) {
      return of(config.responseCodes);
    }
    return this.apiService.getResponseCodes();
  }

  /**
   * Get description for a specific response code
   */
  public getResponseCodeDescription(code: string): Observable<any> {
    return this.apiService.getResponseCode(code);
  }

  /**
   * Get security methods for a channel
   */
  public getSecurityMethodsByChannel(
    channel: 'GAB' | 'POS' | 'ECOM'
  ): Observable<any> {
    return this.apiService.getSecurityMethodsByChannel(channel);
  }

  /**
   * Get transaction statuses
   */
  public getTransactionStatuses(): Observable<{ [status: string]: string }> {
    const config = this.stateService.systemConfig();
    if (config?.transactionStatuses) {
      return of(config.transactionStatuses);
    }
    return this.apiService.getTransactionStatuses();
  }

  /**
   * Clear cache (useful for manual refresh)
   */
  public clearCache(): void {
    this.configCache = null;
    this.cacheExpiry = null;
  }

  /**
   * Force reload configuration (bypasses cache)
   */
  public forceReloadConfiguration(): Observable<PaymentSystemConfig> {
    this.clearCache();
    return this.loadCompleteConfiguration();
  }

  /**
   * Get channel-specific transaction types for dropdown
   */
  public getChannelTransactionTypeOptions(channel: 'GAB' | 'POS' | 'ECOM'): string[] {
    const refData = this.stateService.referenceData();
    const channelKey = channel.toUpperCase();
    
    // This should be populated from systemConfig
    const config = this.stateService.systemConfig();
    if (config?.transactionTypes) {
      // Filter to show only relevant transaction types
      // Note: In a real system, this would be properly mapped
      return Object.keys(config.transactionTypes).slice(0, 10); // Example filtering
    }
    
    return [];
  }

  /**
   * Get response code color (for UI visualization)
   * Green for 00 (approved), Red for errors, Yellow for warnings
   */
  public getResponseCodeColor(code: string): 'success' | 'danger' | 'warning' | 'secondary' {
    if (code === '00') return 'success'; // Approved
    
    const configs = this.stateService.systemConfig();
    if (!configs?.responseCodes) return 'secondary';
    
    const description = configs.responseCodes[code]?.toLowerCase() || '';
    
    if (description.includes('approuvée') || description.includes('approved')) {
      return 'success';
    } else if (description.includes('refuser') || description.includes('decline') || description.includes('error') || description.includes('erreur')) {
      return 'danger';
    } else if (description.includes('timeout') || description.includes('warning') || description.includes('avertis')) {
      return 'warning';
    }
    
    return 'secondary';
  }

  /**
   * Get response code emoji
   */
  public getResponseCodeEmoji(code: string): string {
    if (code === '00') return '';

    const configs = this.stateService.systemConfig();
    if (!configs?.responseCodes) return '';

    const description = configs.responseCodes[code]?.toLowerCase() || '';

    if (description.includes('approuvée') || description.includes('approved')) {
      return '';
    } else if (description.includes('timeout')) {
      return '';
    } else if (description.includes('fraude') || description.includes('fraud')) {
      return '';
    } else if (description.includes('indisponible') || description.includes('unavailable')) {
      return '';
    }

    return '';
  }

  /**
   * Get formatted response code for display
   */
  public formatResponseCodeForDisplay(code: string): string {
    const configs = this.stateService.systemConfig();
    const description = configs?.responseCodes?.[code] || 'Unknown code';

    return `${code} - ${description}`;
  }

  /**
   * Validate if all required configurations are loaded
   */
  public isConfigurationLoaded(): boolean {
    const config = this.stateService.systemConfig();
    return config !== null && 
      config.zones !== undefined &&
      config.banks !== undefined &&
      config.responseCodes !== undefined;
  }

  /**
   * Get configuration summary for dashboard
   */
  public getConfigurationSummary(): { totalZones: number; totalCountries: number; totalBanks: number; totalCodes: number } {
    const config = this.stateService.systemConfig();
    
    if (!config) {
      return { totalZones: 0, totalCountries: 0, totalBanks: 0, totalCodes: 0 };
    }

    const totalZones = Object.keys(config.zones || {}).length;
    const totalCountries = Object.keys(config.banks || {}).length;
    const totalBanks = Object.values(config.banks || {})
      .reduce((sum, banks) => sum + (banks?.length || 0), 0);
    const totalCodes = Object.keys(config.responseCodes || {}).length;

    return { totalZones, totalCountries, totalBanks, totalCodes };
  }
}
