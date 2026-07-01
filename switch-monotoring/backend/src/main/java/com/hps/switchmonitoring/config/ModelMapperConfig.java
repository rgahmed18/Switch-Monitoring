package com.hps.switchmonitoring.config;

import org.modelmapper.ModelMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration pour ModelMapper
 * Expose ModelMapper comme un Bean Spring pour l'injection de dépendances
 */
@Configuration
public class ModelMapperConfig {

  @Bean
  public ModelMapper modelMapper() {
    ModelMapper mapper = new ModelMapper();
    // Configuration optionnelle
    mapper.getConfiguration()
        .setSkipNullEnabled(true)
        .setAmbiguityIgnored(true);
    return mapper;
  }
}
