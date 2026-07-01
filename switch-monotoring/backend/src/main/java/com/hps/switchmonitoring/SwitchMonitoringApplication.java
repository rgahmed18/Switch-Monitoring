package com.hps.switchmonitoring;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SwitchMonitoringApplication {

  public static void main(String[] args) {
    SpringApplication.run(SwitchMonitoringApplication.class, args);
  }
}
