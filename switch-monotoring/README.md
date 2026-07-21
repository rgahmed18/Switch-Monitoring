# HPS Switch Monitor — V5

Plateforme de supervision temps réel des transactions de paiement (ATM / POS / ECOM) développée pour HPS.
Affiche en direct les flux ISO 8583 transitant par le switch, avec analytique, alertes et gestion des utilisateurs.

---

## Démarrage en 7 étapes

> Suivre cet ordre à chaque fois que vous lancez le projet pour la première fois sur une machine.

**Étape 1 — Lancer l'infrastructure Kafka**

```bash
docker compose up -d
```

Attend que les 3 conteneurs soient `Up` :
```bash
docker compose ps
```

---

**Étape 2 — Démarrer le backend Spring Boot**

Dans IntelliJ IDEA :
```
Run → Edit Configurations → SwitchMonitoringApplication
  → Active profiles : local
  → Run
```

Attendre la ligne dans les logs :
```
Started SwitchMonitoringApplication in X seconds
```

---

**Étape 3 — Démarrer le frontend Angular**

```bash
cd frontend
ng serve
```

Attendre :
```
Application bundle generation complete.
```

---

**Étape 4 — Ouvrir l'application**

```
http://localhost:4200
```

---

**Étape 5 — Se connecter avec le compte admin initial**

```
Email    : admin@hps.local
Password : Admin@2025!
```

> Ce compte est créé par le script `db/init/V0_0_0__Init_Admin_User.sql`.
> Sur une base vide, exécuter ce script avant le premier démarrage (voir section [Base de données](#10-base-de-données)).

---

**Étape 6 — Changer le mot de passe immédiatement**

L'application force le changement de mot de passe à la première connexion (`mustChangePassword: true`).
Définir un mot de passe fort : min. 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial.

---

**Étape 7 — Inviter les autres utilisateurs**

```
http://localhost:4200/admin/users → Inviter un utilisateur
```

Renseigner : email, prénom, nom, rôle (`ADMIN` ou `USER`).
Un lien d'activation valable **48 heures** est envoyé par email.

---

## Sommaire

1. [Stack technique](#1-stack-technique)
2. [Prérequis](#2-prérequis)
3. [Installation rapide](#3-installation-rapide)
4. [Configuration](#4-configuration)
5. [Démarrage](#5-démarrage) — dont [Déploiement Docker complet](#56-déploiement-docker-complet-oracle--backend--frontend)
6. [Pages de l'application](#6-pages-de-lapplication)
7. [Gestion des utilisateurs](#7-gestion-des-utilisateurs)
8. [API Backend](#8-api-backend)
9. [Kafka](#9-kafka)
10. [Base de données](#10-base-de-données)
11. [Sécurité](#11-sécurité)
12. [Profils Spring](#12-profils-spring)

---

## 1. Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Backend | Spring Boot + Java | 3.3.4 / Java 17 |
| Frontend | Angular + PrimeNG + Tailwind CSS | 18 |
| Messaging | Apache Kafka (Confluent) | 7.5.0 |
| Base de données | Oracle XE | 21c |
| Migrations DB | Flyway | — |
| Conteneurs | Docker + Docker Compose | — |

---

## 2. Prérequis

| Outil | Version minimale | Vérification |
|---|---|---|
| Java JDK | 17 | `java -version` |
| Maven | 3.9 | `mvn -version` |
| Node.js | 20 | `node -v` |
| Angular CLI | 17+ | `ng version` |
| Docker Desktop | — | `docker -v` |
| Oracle XE | 21c | Service `OracleServiceXEPDB1` démarré |

> **Oracle XE** doit être démarré **avant** le backend. Vérifier dans `services.msc` que le service `OracleServiceXEPDB1` est en cours d'exécution.

---

## 3. Installation rapide

```bash
# 1. Cloner le dépôt
git clone <url-du-repo>
cd switch-monitoring

# 2. Copier et remplir le fichier de configuration
copy .env.example .env
# Ouvrir .env et renseigner les vraies valeurs (voir section 4)

# 3. Installer les dépendances frontend
cd frontend
npm install
cd ..
```

---

## 4. Configuration

### 4.1 Variables d'environnement

Copier `.env.example` vers `.env` et renseigner chaque valeur. **Ne jamais committer `.env` dans git.**

```env
# ── Oracle Database ───────────────────────────────────────────────
DB_URL=jdbc:oracle:thin:@//localhost:1521/XEPDB1
DB_USERNAME=PFE_SW_MON
DB_PASSWORD=PFE_SW_MON_PWD

# ── Kafka ─────────────────────────────────────────────────────────
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# ── SMTP ──────────────────────────────────────────────────────────
# Gmail : générer un App Password sur :
# myaccount.google.com → Sécurité → Mots de passe des applications
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=ton_email@gmail.com
MAIL_PASSWORD=xxxx_xxxx_xxxx_xxxx
MAIL_FROM=ton_email@gmail.com
MAIL_SMTP_AUTH=true
MAIL_STARTTLS_ENABLE=true
MAIL_STARTTLS_REQUIRED=true

# ── Frontend ──────────────────────────────────────────────────────
# URL autorisée par le backend pour CORS (sans slash final)
FRONTEND_URL=http://localhost:4200
```

Pour changer de fournisseur SMTP, modifier uniquement les variables `MAIL_*` — aucune ligne de code à toucher :

| Fournisseur | MAIL_HOST | MAIL_PORT |
|---|---|---|
| Gmail | smtp.gmail.com | 587 |
| Office 365 | smtp.office365.com | 587 |
| Mailtrap (tests) | sandbox.smtp.mailtrap.io | 2525 |

### 4.2 Configuration IntelliJ IDEA (développement local)

Pour éviter de saisir les variables d'environnement à chaque démarrage, utiliser le profil Spring `local` :

1. Ouvrir **Run/Debug Configurations** de la classe `SwitchMonitoringApplication`
2. Dans le champ **Active profiles**, saisir : `local`
3. Cliquer **Apply → OK**

Le fichier `backend/src/main/resources/application-local.yml` (gitignored) contient toutes les valeurs de développement. Aucune variable d'environnement supplémentaire n'est nécessaire avec cette méthode.

---

## 5. Démarrage

### 5.1 Ordre de démarrage recommandé

```
1. Oracle XE          ← Service Windows (services.msc)
2. docker compose up  ← Kafka + Zookeeper + Kafka UI
3. Backend            ← mvn spring-boot:run  (ou IntelliJ avec profil local)
4. Frontend           ← ng serve
5. (optionnel)        ← docker compose run --rm load-generator
```

### 5.2 Infrastructure Docker (Kafka)

```bash
# Démarrer en arrière-plan
docker compose up -d

# Vérifier que les conteneurs sont UP
docker compose ps

# Arrêter
docker compose down
```

Conteneurs lancés :

| Conteneur | Image | Port exposé |
|---|---|---|
| `zookeeper` | confluentinc/cp-zookeeper:7.5.0 | 2181 |
| `kafka` | confluentinc/cp-kafka:7.5.0 | 9092 (hôte) / 29092 (réseau interne) |
| `kafka-ui` | provectuslabs/kafka-ui:latest | **8088** |

### 5.3 Backend Spring Boot

**Option A — IntelliJ avec profil `local` (recommandé pour le développement)**

```
Run → SwitchMonitoringApplication → Active profiles: local → Run
```

**Option B — Terminal PowerShell**

```powershell
$env:DB_URL="jdbc:oracle:thin:@//localhost:1521/XEPDB1"
$env:DB_USERNAME="PFE_SW_MON"
$env:DB_PASSWORD="PFE_SW_MON_PWD"
$env:KAFKA_BOOTSTRAP_SERVERS="localhost:9092"
$env:MAIL_HOST="smtp.gmail.com"
$env:MAIL_PORT="587"
$env:MAIL_USERNAME="ton_email@gmail.com"
$env:MAIL_PASSWORD="xxxx_xxxx_xxxx_xxxx"
$env:MAIL_FROM="ton_email@gmail.com"
$env:MAIL_SMTP_AUTH="true"
$env:MAIL_STARTTLS_ENABLE="true"
$env:MAIL_STARTTLS_REQUIRED="true"
$env:FRONTEND_URL="http://localhost:4200"

cd backend
mvn spring-boot:run
```

Backend disponible sur : **http://localhost:8080**

### 5.4 Frontend Angular

```bash
cd frontend
ng serve
```

Frontend disponible sur : **http://localhost:4200**

**Build production**

```bash
ng build --configuration production
```

Le build utilise automatiquement `environment.prod.ts` — l'URL de l'API bascule sur `/api/v1` (relatif, pour déploiement derrière un reverse proxy).

### 5.5 Générateur de transactions (optionnel)

```bash
docker compose run --rm load-generator
```

Injecte **100 000 transactions** à **200 tx/s** dans Kafka. Utiliser pour tester le dashboard en charge réelle.

### 5.6 Déploiement Docker complet (Oracle + backend + frontend)

En plus du scénario de développement (§5.1 à 5.4, backend/frontend lancés manuellement), le `docker-compose.yml` sait aussi démarrer **toute la plateforme en conteneurs**, y compris Oracle, le backend et le frontend — utile pour une démonstration ou un déploiement sans installer ni Java, ni Node, ni Oracle sur la machine hôte.

```bash
# Démarrer l'ensemble de la stack (Oracle, Kafka, backend, frontend)
docker compose up -d

# Vérifier que tous les conteneurs sont "Up" (Oracle doit passer "healthy")
docker compose ps
```

Conteneurs lancés dans ce mode :

| Conteneur | Image / build | Port exposé | Rôle |
|---|---|---|---|
| `oracle` | gvenzl/oracle-free:23-slim-faststart | 1521 | Base de données (PDB `FREEPDB1`), exécute automatiquement les scripts de `db/init/` et `db/migration/` au premier démarrage |
| `zookeeper` | confluentinc/cp-zookeeper:7.5.0 | 2181 | Coordination Kafka |
| `kafka` | confluentinc/cp-kafka:7.5.0 | 9092 (hôte) / 29092 (réseau interne) | Broker de messages |
| `kafka-ui` | provectuslabs/kafka-ui:latest | 8088 | Interface web Kafka |
| `backend` | build depuis `backend/Dockerfile` | 8080 | API Spring Boot, attend qu'Oracle soit `healthy` et que Kafka soit démarré |
| `frontend` | build depuis `frontend/Dockerfile` | 4200 (nginx sert le build Angular en production, proxy `/api/v1` vers le backend) | Interface web |

Points clés de ce mode :

- **Variables d'environnement** : les mêmes clés `.env` que le mode développement (§4.1) sont réutilisées — `DB_USERNAME`, `DB_PASSWORD`, `MAIL_*`, `FRONTEND_URL` — avec des valeurs par défaut définies dans `docker-compose.yml` si `.env` est absent.
- **Connexion Oracle du backend conteneurisé** : `jdbc:oracle:thin:@//oracle:1521/FREEPDB1` (nom de service Docker, pas `localhost`) — différent de la connexion `XEPDB1` utilisée en développement local (§10).
- **Initialisation de la base** : au premier démarrage du conteneur `oracle`, les scripts SQL de `backend/src/main/resources/db/init/` et `db/migration/` sont exécutés automatiquement dans l'ordre (montés en lecture seule dans `/container-entrypoint-initdb.d/`) — aucune action manuelle requise, contrairement au mode développement (§10) où Flyway doit être lancé à la main.
- **Redémarrage automatique** : tous les services ont `restart: unless-stopped` — un conteneur qui plante (ex : backend démarré avant qu'Oracle soit prêt) est relancé automatiquement par Docker.
- **Reconstruire après une modification du code** :

```bash
docker compose build backend frontend
docker compose up -d
```

- **Tout arrêter** (les données Oracle/Kafka restent dans les volumes Docker) :

```bash
docker compose down
```

- **Tout arrêter et supprimer les données** (repartir d'une base vide) :

```bash
docker compose down -v
```

---

## 6. Pages de l'application

### URLs de l'application

| URL | Page | Accès requis |
|---|---|---|
| `/login` | Connexion | Public |
| `/activate/:token` | Activation de compte (lien email) | Public |
| `/reset-password/:token` | Réinitialisation de mot de passe | Public |
| `/` | Dashboard temps réel | Connecté |
| `/transactions` | Flux de transactions en direct | Connecté |
| `/analysis` | Analyse des transactions | Connecté |
| `/atm` | Supervision ATM | Connecté |
| `/pos` | Supervision POS | Connecté |
| `/ecom` | Supervision E-commerce | Connecté |
| `/alertes` | Alertes système | Connecté |
| `/data-generator` | Générateur de données de test | Connecté |
| `/admin/users` | Gestion des utilisateurs | Admin uniquement |
| `/admin/projects` | Gestion des projets | Admin uniquement |

### Services annexes

| Service | URL | Description |
|---|---|---|
| Backend API | http://localhost:8080/api/v1 | REST API Spring Boot |
| Kafka UI | http://localhost:8088 | Interface web Kafka |

---

## 7. Gestion des utilisateurs

### Rôles

| Rôle | Accès |
|---|---|
| `ADMIN` | Toutes les pages + gestion des utilisateurs et des projets |
| `USER` | Toutes les pages de supervision (pas d'accès `/admin/*`) |

### Flux d'invitation d'un nouvel utilisateur

```
Admin → /admin/users → Inviter
  ↓
Email envoyé avec lien /activate/:token (valable 48 heures)
  ↓
Utilisateur clique le lien → définit son mot de passe
  ↓
Compte actif — connexion possible
```

Si le serveur SMTP n'est pas configuré, le lien d'activation est affiché directement dans l'interface pour être partagé manuellement.

### Règles de mot de passe

- Minimum 8 caractères
- Au moins : 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial

### Réinitialisation de mot de passe

Un utilisateur peut demander une réinitialisation depuis la page de connexion → **"Mot de passe oublié"**. Un lien valable **1 heure** est envoyé par email.

### Blocage d'un compte

Un administrateur peut bloquer un compte depuis `/admin/users`. L'effet est immédiat : toute requête API émise par cet utilisateur est rejetée avec HTTP 403, même si sa session est déjà ouverte.

---

## 8. API Backend

Base URL : `http://localhost:8080/api/v1`

### Authentification — routes publiques

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Connexion (email + password) |
| GET | `/auth/token-info/:token` | Valider un token d'activation |
| POST | `/auth/activate` | Activer le compte et définir le mot de passe |
| POST | `/auth/forgot-password` | Demander la réinitialisation de mot de passe |
| GET | `/auth/reset-token-info/:token` | Valider un token de réinitialisation |
| POST | `/auth/reset-password` | Appliquer le nouveau mot de passe |

### Administration — ADMIN uniquement

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/admin/invite` | Inviter un nouvel utilisateur |
| GET | `/admin/users` | Lister tous les utilisateurs |
| PUT | `/admin/users/:id/role` | Changer le rôle d'un utilisateur |
| PUT | `/admin/users/:id/status` | Bloquer / débloquer un compte |
| DELETE | `/admin/users/:id` | Supprimer un utilisateur |
| GET | `/admin/projects` | Lister les projets |
| POST | `/admin/projects` | Créer un projet |
| DELETE | `/admin/projects/:id` | Supprimer un projet |

### Supervision — utilisateurs connectés

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/stream/transactions` | Flux SSE — transactions temps réel |
| GET | `/stream/alerts` | Flux SSE — alertes temps réel |
| GET | `/transactions` | Historique paginé des transactions |
| GET | `/alerts` | Historique des alertes |
| GET | `/sla` | Métriques SLA |
| GET | `/analytics/*` | Analytique (volumes, taux, géographie) |
| GET | `/zone-health` | Santé des zones géographiques |

### Simulateur — ADMIN uniquement

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/simulator/reset` | Réinitialiser le simulateur |
| POST | `/simulator/purge-and-regenerate` | Purger et regénérer les données |

> Les endpoints temps réel utilisent **Server-Sent Events (SSE)** — pas de WebSocket.

---

## 9. Kafka

### Topics

| Topic | Rétention | Usage |
|---|---|---|
| `channel-transactions` | 7 jours | Transactions ATM / POS / ECOM |
| `alert-events` | 7 jours | Alertes système |
| `socket-logs` | 30 jours | Logs de communication socket |
| `processing-events` | 5 jours | Métriques SLA & analytics |
| `*-dlq` | 14 jours | Dead Letter Queues (messages en erreur) |

### Kafka UI

Interface web pour visualiser les topics, lire les messages et surveiller les consumer groups.

URL : **http://localhost:8088**

---

## 10. Base de données

### Connexion Oracle XE

```
Host     : localhost
Port     : 1521
Service  : XEPDB1
User     : PFE_SW_MON
Password : PFE_SW_MON_PWD
```

Connexion via SQL*Plus :

```bash
sqlplus PFE_SW_MON/PFE_SW_MON_PWD@//localhost:1521/XEPDB1
```

### Migrations Flyway

Les scripts SQL se trouvent dans `backend/src/main/resources/db/migration/`.
Flyway est **désactivé par défaut** (`flyway.enabled: false`).

Pour exécuter les migrations manuellement :

```bash
cd backend
mvn flyway:migrate -Dflyway.url=jdbc:oracle:thin:@//localhost:1521/XEPDB1 \
                   -Dflyway.user=PFE_SW_MON \
                   -Dflyway.password=PFE_SW_MON_PWD
```

| Script | Description |
|---|---|
| `V3_0_0` | Table principale `AUTHO_ACTIVITY_ADM` |
| `V3_0_1` | Index de performance |
| `V3_0_2` | Vues analytiques |
| `V3_0_3` | Vues BI / intelligence métier |
| `V4_0_0` | Table d'archivage |
| `V5_0_0` | Masquage PAN — conformité PCI-DSS |

---

## 11. Sécurité

| Mécanisme | Détail |
|---|---|
| Hachage mot de passe | BCrypt (force 12) |
| Tokens d'activation / reset | SecureRandom 256 bits, Base64 URL-safe |
| Expiration token activation | 48 heures |
| Expiration token reset | 1 heure |
| Rate limiting — login | 5 tentatives / 15 min par IP — HTTP 429 |
| Rate limiting — mot de passe oublié | 3 tentatives / 1 heure par IP — HTTP 429 |
| Vérification compte bloqué | À chaque requête API (filtre HTTP temps réel) |
| En-têtes de sécurité HTTP | `X-Content-Type-Options`, `X-Frame-Options`, `CSP`, `Referrer-Policy`, `Permissions-Policy` |
| CORS | Restreint à `FRONTEND_URL` uniquement |
| Anti-énumération | Réponse identique que l'email existe ou non |
| Autorisation par rôle | Header `X-User-Role` vérifié côté backend sur chaque appel admin |

### Fichiers exclus du dépôt git

```
.env
.env.*
backend/src/main/resources/application-local.yml
DEVELOPER_NOTES.md
backend/target/
frontend/.angular/
```

---

## 12. Profils Spring

| Profil | Fichier de config | Usage |
|---|---|---|
| *(défaut)* | `application.yml` | Production — toutes les valeurs viennent de variables d'environnement |
| `local` | `application.yml` + `application-local.yml` | Développement — valeurs hardcodées dans `application-local.yml` (gitignored) |

**Activer le profil local**

- IntelliJ : `Run Configuration → Active profiles → local`
- Terminal : `mvn spring-boot:run -Dspring-boot.run.profiles=local`
