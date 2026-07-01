package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.api.dto.CreateAlertRequest;
import com.hps.switchmonitoring.domain.AlertEventEntity;
import com.hps.switchmonitoring.service.AlertService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/alerts")
public class AlertController {

  private final AlertService alertService;

  public AlertController(AlertService alertService) {
    this.alertService = alertService;
  }

  @GetMapping
  public List<AlertEventEntity> getLatestAlerts() {
    return alertService.getLatestAlerts();
  }

  @PostMapping
  public AlertEventEntity createAlert(@Valid @RequestBody CreateAlertRequest request) {
    return alertService.createAlert(request);
  }
}
