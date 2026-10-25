# Архитектура решения (C4 Model)

Архитектура «Умного кредитного кабинета предпринимателя» построена в соответствии с принципами **Cloud-Native**, автономности и микросервисного разделения ответственности.

---

## 1. Контекстная диаграмма (C4 System Context)

```mermaid
flowchart TD
    subgraph Users ["Пользователи"]
        Owner["Предприниматель / Собственник (OWNER)"]
        Accountant["Бухгалтер компании (ACCOUNTANT)"]
        Underwriter["Кредитный аналитик / Андеррайтер Банка (UNDERWRITER)"]
    end

    subgraph System ["Умный кредитный конвейер Альфа-Банка"]
        Conveyor["Цифровой кредитный кабинет и конвейер МСБ"]
    end

    subgraph ExternalServices ["Внешние ведомственные сервисы и банки (Mocks)"]
        FNS["ФНС России (Блокировки, разрывы, персонал)"]
        EGRUL["ФНС ЕГРЮЛ / ЕГРИП (Регистрация, учредители, статус)"]
        BKI["БКИ (Кредитная история, платежи, просрочки)"]
        AlfaCore["АБС Альфа-Банка (Обороты по счетам, выписки)"]
        GovSupport["Минэкономразвития / Корпорация МСП"]
    end

    Owner -->|"Подача заявки, выбор оффера, подписание договора ПЭП"| Conveyor
    Accountant -->|"Загрузка фин. документов (ОСВ), ответы на уточнения"| Conveyor
    Underwriter -->|"Разбор спорных заявок, принятие кредитного решения"| Conveyor

    Conveyor -->|"Запрос налоговых сведений"| FNS
    Conveyor -->|"Проверка легитимности и статуса юрлица"| EGRUL
    Conveyor -->|"Запрос кредитной истории и обязательств"| BKI
    Conveyor -->|"Анализ оборотов за 12 месяцев"| AlfaCore
    Conveyor -->|"Подбор субсидий по ОКВЭД"| GovSupport
```

---

## 2. Диаграмма контейнеров (C4 Containers)

```mermaid
flowchart TD
    subgraph ClientLayer ["Клиентский уровень"]
        SPA["Frontend SPA (React 19 + Tailwind + Zustand)<br/><i>Порт: 3000 (или 80 в Docker)</i><br/>Split-view: Кабинет клиента + АРМ Банка"]
    end

    subgraph ServerLayer ["Серверный уровень (Cloud-Native Go)"]
        Gateway["Reverse Proxy & Static Files (Nginx / Go Handler)"]
        
        subgraph BackendGo ["Go Backend Service (Порт: 8000)"]
            Router["HTTP Router & Middleware (CORS, Auth Headers)"]
            FSM["Finite State Machine (15 состояний, строгие переходы)"]
            ScoringEng["Scoring Engine (500 базовых + дельты, 5 грейдов A-E)"]
            DecisionEng["Decision Engine (Расчет DTI, лимитов, 3 контр-оффера)"]
            AIAdvisor["AI Advisor (Детерминированный рекомендательный движок)"]
            Store["Thread-safe In-Memory Data Store (sync.RWMutex)"]
        end
    end

    subgraph StorageLayer ["Хранилище данных"]
        Uploads["Файловое хранилище документов (PDF, XLSX, ОСВ)"]
    end

    SPA -->|"REST API / JSON (/api/v1)"| Gateway
    Gateway --> Router
    Router --> FSM
    Router --> ScoringEng
    Router --> DecisionEng
    Router --> AIAdvisor
    FSM --> Store
    ScoringEng --> Store
    DecisionEng --> Store
    Router --> Uploads
```

---

## 3. Компоненты бэкенда на Go

1. **`internal/conveyor/engine.go`**:
   - Двухступенчатая математика:
     - **Модуль 1 (Риск-скоринг):** расчет `risk_score` (0..1000), `pd` (вероятность дефолта 0..1), `risk_grade` (A, B, C, D, E), декомпозиция факторов (Waterfall/SHAP).
     - **Модуль 2 (Кредитное решение):** расчет чистого дохода бизнеса (`net_margin = 15%`), допустимой долговой нагрузки (`DTI <= 50%`), расчет лимитов через финансовый аннуитет, формирование матричного кредитного решения и 3 адаптивных контр-офферов.
2. **`internal/conveyor/fsm.go`**:
   - Валидированный конечный автомат (FSM) с защитой от недопустимых переходов (Guards), фиксацией актора действия и формированием неизменяемого аудит-следа (`audit_log`).
3. **`internal/store/store.go`**:
   - Высокопроизводительное in-memory хранилище состояния заявок, компаний, пользователей, документов и запросов уточнений с многопоточной защитой через `sync.RWMutex`.
4. **`internal/handlers/`**:
   - REST API контроллеры для жизненного цикла заявок, пресетов (God-Bar), АРМ андеррайтера, загрузки файлов и взаимодействия с AI-советником.
