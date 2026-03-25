# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [2.0.0] - 2026-03-25

### Added

#### Firma XAdES por Tipo de Documento
- `XmlSigner` — Firma XAdES para Invoice, CreditNote, DebitNote, Event con namespaces auto-detectados
- `PayrollSigner` — Firma XAdES para NominaIndividual y NominaIndividualDeAjuste con workaround de namespace `xmlns:sts`
- `AttachedDocumentSigner` — Firma XAdES para AttachedDocument (documento adjunto)
- `DocumentSupportSigner` — Firma XAdES para DocumentoSoporte con `xmlns:sts` URN
- `AdjustmentNoteSigner` — Firma XAdES para NotaAjuste con `xmlns:sts` URL
- `BaseXmlSigner` — Clase base Template Method con hooks para especialización

#### Cálculos Hash DIAN
- `calculateCufe()` — CUFE SHA384 para facturas electrónicas
- `calculateCude()` — CUDE SHA384 para notas crédito/débito
- `calculateCuds()` — CUDS SHA384 para documento soporte
- `calculateCune()` — CUNE SHA384 para nómina electrónica
- `calculateCudeEvent()` — CUDE-Event SHA384 para eventos (ApplicationResponse)
- `softwareSecurityCode()` — SHA384 del código de seguridad del software
- `injectUuid()`, `injectCune()`, `injectCudeEvent()` — Inyección de UUID en XML

#### QR Code Data
- `getQRDataInvoice()` — Generación de string QR para facturas
- `getQRDataPayroll()` — Generación de string QR para nómina

#### Comandos SOAP (14 operaciones completas)
- `SendBillAttachmentAsyncCommand` — Envío asíncrono de documentos adjuntos
- `GetStatusEventCommand` — Consulta de estado de eventos
- Corrección de `SendTestSetAsyncCommand` (reimplementado desde cero)
- Corrección de `SendBillAsyncCommand` (argumentos invertidos)

#### Configuración por Tipo de Documento
- `DOCUMENT_TYPE_CONFIG` — 9 tipos de documento con namespaces, XPath y configuración auto-detectada
- `detectDocumentType()` / `detectDocumentTypeFromDom()` — Detección automática del tipo de documento desde XML

#### Soporte Multi-Algoritmo
- `ISignatureAlgorithm` — Interfaz para SHA256 y SHA512 (SHA1 deprecado en xml-crypto v6)
- `setAlgorithm()` en `BaseXmlSigner`

#### Tests (217 tests en 8 suites)
- `tests/soap/templates.test.ts` — 32 tests de templates SOAP
- `tests/security/Certificate.test.ts` — 3 tests de certificados
- `tests/ubl/DianExtensions.test.ts` — 83 tests de extensiones DIAN (CUFE, CUDE, CUDS, CUNE, QR, SSC)
- `tests/security/SoapSigner.test.ts` — 23 tests de firma SOAP WS-Security
- `tests/security/XAdES.test.ts` — 27 tests de firma XAdES UBL
- `tests/security/PayrollSigner.test.ts` — 26 tests de firma nómina y signers especializados
- `tests/commands/Commands.test.ts` — 19 tests de comandos
- `tests/e2e/DianClient.e2e.test.ts` — 7 tests E2E con mock HTTP

### Fixed
- **C14N Algorithm** — XAdES corregido de Exc-C14N (`xml-exc-c14n#`) a C14N estándar (`xml-c14n-20010315`) para paridad con PHP
- **SendTestSetAsyncCommand** — Reimplementado (era copia de SendNominaSyncCommand)
- **SendBillAsyncCommand** — Argumentos `action`/`toValue` invertidos en `sign()`
- **SoapSigner debug files** — Eliminados 3 `fs.writeFileSync` que escribían XML firmados al disco
- **Certificate.test.ts** — Actualizado para API actual de `Certificate`
- **GetExchangeEmailsCommand** — Tipo genérico corregido
- **Response path parsing** — Unificado sin prefijo de namespace
- **fast-xml-parser** — Configurado `numberParseOptions` para evitar conversión `"00"` → `0`

### Changed
- `package.json` version bump de 1.1.1 a 2.0.0
- `DianExtensions.ts` — De archivo vacío a 620+ líneas con toda la lógica DIAN
- `models.ts` — De archivo vacío a 200+ líneas con 9 tipos de documento y detección
- `README.md` — Reescrito con ejemplos correctos de API, imports y uso de nómina

### Removed
- Dependencia `xml2js` no utilizada
- Script `start:dev` vestigial de NestJS
- Interfaces duplicadas en `interfaces.ts`
- Casts `as any` innecesarios en `DianClient.ts`

## [1.1.1] - 2026-03-20

### Added
- Estructura inicial del SDK con comandos SOAP básicos
- `SoapSigner` para firma WS-Security
- `XmlSigner` con firma XAdES básica (sin CUFE/CUDE)
- `PayrollSigner` para firma de nómina básica
- 15 templates SOAP para operaciones DIAN
- `Certificate` para manejo de certificados P12/PFX
- `DianClient` como facade principal
- `SoapClient` para comunicación HTTP con la DIAN
