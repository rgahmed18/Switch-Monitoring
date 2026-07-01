package com.hps.switchmonitoring.config;

import com.hps.switchmonitoring.api.dto.AlertEvent;
import com.hps.switchmonitoring.api.dto.SocketLogEvent;
import com.hps.switchmonitoring.api.dto.TransactionEvent;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.KafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.listener.ConcurrentMessageListenerContainer;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration Kafka pour le projet Switch Monitoring
 * Définit les topics, les sérialiseurs/désérialiseurs et les containers de listeners
 */
@Configuration
@EnableKafka
public class KafkaConfig {

  @Value("${spring.kafka.bootstrap-servers}")
  private String bootstrapServers;

  @Value("${kafka.partitions:3}")
  private int partitions;

  @Value("${kafka.replication-factor:1}")
  private short replicationFactor;

  // ==================== TOPICS ====================

  /**
   * Topic pour les événements de transactions des canaux (ATM, POS, ECOM)
   */
  @Bean
  public NewTopic channelTransactionsTopic() {
    return TopicBuilder.name("channel-transactions")
        .partitions(partitions)
        .replicas(replicationFactor)
        .config("retention.ms", "604800000") // 7 jours
        .config("segment.ms", "86400000") // 1 jour
        .config("compression.type", "gzip")
        .build();
  }

  /**
   * Topic pour les événements d'alertes
   */
  @Bean
  public NewTopic alertEventsTopic() {
    return TopicBuilder.name("alert-events")
        .partitions(partitions)
        .replicas(replicationFactor)
        .config("retention.ms", "604800000") // 7 jours
        .build();
  }

  /**
   * Topic pour les logs de communication socket
   */
  @Bean
  public NewTopic socketLogsTopic() {
    return TopicBuilder.name("socket-logs")
        .partitions(partitions)
        .replicas(replicationFactor)
        .config("retention.ms", "2592000000") // 30 jours
        .build();
  }

  /**
   * Topic pour les transformations de données (SLA, analytics)
   */
  @Bean
  public NewTopic processingEventsTopic() {
    return TopicBuilder.name("processing-events")
        .partitions(partitions)
        .replicas(replicationFactor)
        .config("retention.ms", "432000000") // 5 jours
        .build();
  }

  // ==================== DEAD LETTER QUEUE TOPICS ====================

  /**
   * Dead Letter Queue pour les transactions échouées
   */
  @Bean
  public NewTopic channelTransactionsDlqTopic() {
    return TopicBuilder.name("channel-transactions-dlq")
        .partitions(1)
        .replicas(replicationFactor)
        .config("retention.ms", "1209600000") // 14 jours (plus long pour debug)
        .config("cleanup.policy", "delete")
        .build();
  }

  /**
   * Dead Letter Queue pour les alertes échouées
   */
  @Bean
  public NewTopic alertEventsDlqTopic() {
    return TopicBuilder.name("alert-events-dlq")
        .partitions(1)
        .replicas(replicationFactor)
        .config("retention.ms", "1209600000") // 14 jours
        .build();
  }

  /**
   * Dead Letter Queue pour les logs socket échoués
   */
  @Bean
  public NewTopic socketLogsDlqTopic() {
    return TopicBuilder.name("socket-logs-dlq")
        .partitions(1)
        .replicas(replicationFactor)
        .config("retention.ms", "1209600000") // 14 jours
        .build();
  }

  /**
   * Dead Letter Queue pour les événements de traitement échoués
   */
  @Bean
  public NewTopic processingEventsDlqTopic() {
    return TopicBuilder.name("processing-events-dlq")
        .partitions(1)
        .replicas(replicationFactor)
        .config("retention.ms", "1209600000") // 14 jours
        .build();
  }

  // ==================== PRODUCER CONFIG ====================

  /**
   * Producer Factory pour les transactions
   */
  @Bean
  public ProducerFactory<String, TransactionEvent> transactionProducerFactory() {
    Map<String, Object> configProps = new HashMap<>();
    configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
    configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
    configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
    configProps.put(ProducerConfig.ACKS_CONFIG, "all"); // Haute durabilité
    configProps.put(ProducerConfig.RETRIES_CONFIG, 3);
    configProps.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, 100);
    configProps.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "gzip");
    configProps.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
    configProps.put(ProducerConfig.LINGER_MS_CONFIG, 100);
    configProps.put(JsonSerializer.ADD_TYPE_INFO_HEADERS, false);
    return new DefaultKafkaProducerFactory<>(configProps);
  }

  /**
   * Producer Factory pour les alertes
   */
  @Bean
  public ProducerFactory<String, AlertEvent> alertProducerFactory() {
    Map<String, Object> configProps = new HashMap<>();
    configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
    configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
    configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
    configProps.put(ProducerConfig.ACKS_CONFIG, "all");
    configProps.put(ProducerConfig.RETRIES_CONFIG, 3);
    configProps.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "gzip");
    configProps.put(JsonSerializer.ADD_TYPE_INFO_HEADERS, false);
    return new DefaultKafkaProducerFactory<>(configProps);
  }

  /**
   * Producer Factory pour les logs socket
   */
  @Bean
  public ProducerFactory<String, SocketLogEvent> socketLogProducerFactory() {
    Map<String, Object> configProps = new HashMap<>();
    configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
    configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
    configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
    configProps.put(ProducerConfig.ACKS_CONFIG, "1");
    configProps.put(ProducerConfig.RETRIES_CONFIG, 1);
    configProps.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "gzip");
    configProps.put(JsonSerializer.ADD_TYPE_INFO_HEADERS, false);
    return new DefaultKafkaProducerFactory<>(configProps);
  }

  // ==================== KAFKA TEMPLATES ====================

  /**
   * KafkaTemplate pour les transactions
   */
  @Bean
  public KafkaTemplate<String, TransactionEvent> transactionKafkaTemplate() {
    return new KafkaTemplate<>(transactionProducerFactory());
  }

  /**
   * KafkaTemplate pour les alertes
   */
  @Bean
  public KafkaTemplate<String, AlertEvent> alertKafkaTemplate() {
    return new KafkaTemplate<>(alertProducerFactory());
  }

  /**
   * KafkaTemplate pour les logs socket
   */
  @Bean
  public KafkaTemplate<String, SocketLogEvent> socketLogKafkaTemplate() {
    return new KafkaTemplate<>(socketLogProducerFactory());
  }

  /**
   * Producer Factory pour les Dead Letter Queues (DLQ)
   * Utilise StringSerializer pour stocker les erreurs en format texte
   */
  @Bean
  public ProducerFactory<String, String> dlqProducerFactory() {
    Map<String, Object> configProps = new HashMap<>();
    configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
    configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
    configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
    configProps.put(ProducerConfig.ACKS_CONFIG, "all");
    configProps.put(ProducerConfig.RETRIES_CONFIG, 3);
    configProps.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "gzip");
    return new DefaultKafkaProducerFactory<>(configProps);
  }

  /**
   * KafkaTemplate pour les Dead Letter Queues
   */
  @Bean
  public KafkaTemplate<String, String> dlqKafkaTemplate() {
    return new KafkaTemplate<>(dlqProducerFactory());
  }

  // ==================== CONSUMER CONFIG ====================

  /**
   * Consumer Factory pour les transactions
   */
  @Bean
  public ConsumerFactory<String, TransactionEvent> transactionConsumerFactory() {
    Map<String, Object> props = new HashMap<>();
    props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
    props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
    props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
    props.put(ConsumerConfig.GROUP_ID_CONFIG, "transaction-consumer-group");
    props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
    props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, true);
    props.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, 1000);
    props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 100);
    props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 30000);
    props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, "com.hps.switchmonitoring.api.dto.TransactionEvent");
    props.put(JsonDeserializer.TRUSTED_PACKAGES, "*");
    return new DefaultKafkaConsumerFactory<>(props);
  }

  /**
   * Consumer Factory pour les alertes
   */
  @Bean
  public ConsumerFactory<String, AlertEvent> alertConsumerFactory() {
    Map<String, Object> props = new HashMap<>();
    props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
    props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
    props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
    props.put(ConsumerConfig.GROUP_ID_CONFIG, "alert-consumer-group");
    props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
    props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, true);
    props.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, 1000);
    props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, "com.hps.switchmonitoring.api.dto.AlertEvent");
    props.put(JsonDeserializer.TRUSTED_PACKAGES, "*");
    return new DefaultKafkaConsumerFactory<>(props);
  }

  /**
   * Consumer Factory pour les logs socket
   */
  @Bean
  public ConsumerFactory<String, SocketLogEvent> socketLogConsumerFactory() {
    Map<String, Object> props = new HashMap<>();
    props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
    props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
    props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
    props.put(ConsumerConfig.GROUP_ID_CONFIG, "socketlog-consumer-group");
    props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
    props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, true);
    props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, "com.hps.switchmonitoring.api.dto.SocketLogEvent");
    props.put(JsonDeserializer.TRUSTED_PACKAGES, "*");
    return new DefaultKafkaConsumerFactory<>(props);
  }

  // ==================== LISTENER CONTAINERS ====================

  /**
   * Container Factory pour les listeners de transactions
   */
  @Bean
  public KafkaListenerContainerFactory<ConcurrentMessageListenerContainer<String, TransactionEvent>> 
  transactionKafkaListenerContainerFactory() {
    ConcurrentKafkaListenerContainerFactory<String, TransactionEvent> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(transactionConsumerFactory());
    factory.setConcurrency(3);
    factory.getContainerProperties().setPollTimeout(3000);
    return factory;
  }

  /**
   * Container Factory pour les listeners d'alertes
   */
  @Bean
  public KafkaListenerContainerFactory<ConcurrentMessageListenerContainer<String, AlertEvent>> 
  alertKafkaListenerContainerFactory() {
    ConcurrentKafkaListenerContainerFactory<String, AlertEvent> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(alertConsumerFactory());
    factory.setConcurrency(2);
    factory.getContainerProperties().setPollTimeout(3000);
    return factory;
  }

  /**
   * Container Factory pour les listeners de logs socket
   */
  @Bean
  public KafkaListenerContainerFactory<ConcurrentMessageListenerContainer<String, SocketLogEvent>> 
  socketLogKafkaListenerContainerFactory() {
    ConcurrentKafkaListenerContainerFactory<String, SocketLogEvent> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(socketLogConsumerFactory());
    factory.setConcurrency(1);
    factory.getContainerProperties().setPollTimeout(3000);
    return factory;
  }

  // ==================== ADMIN ====================

  /**
   * Kafka Admin pour la gestion des topics
   */
  @Bean
  public KafkaAdmin kafkaAdmin() {
    Map<String, Object> configs = new HashMap<>();
    configs.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
    return new KafkaAdmin(configs);
  }
}
