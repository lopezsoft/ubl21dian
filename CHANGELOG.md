# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.6.5] - 2025-12-03

### Fixed
- **ConsultarCUDS()**: Corregido para usar `buildDocumentSupportHashString()` con valores truncados a 2 decimales
- **ConsultarCUDE()**: Corregido para usar `buildInvoiceHashString()` con valores truncados a 2 decimales
- Ambos métodos públicos ahora aplican correctamente el truncado según especificación DIAN

### Changed
- Agregada validación de `$this->pin` con excepción en `ConsultarCUDS()` y `ConsultarCUDE()`
- Agregado tipo de retorno `string` a ambos métodos

### Technical Details
- Los métodos públicos `ConsultarCUDS()` y `ConsultarCUDE()` no estaban aplicando el truncado a 2 decimales
- Esto podía generar CUDS/CUDE incorrectos si el usuario llamaba directamente a estos métodos
- Ahora reutilizan los métodos auxiliares `buildDocumentSupportHashString()` y `buildInvoiceHashString()` que ya incluyen truncado

## [3.6.4] - 2025-11-21

### Fixed
- **SOLUCIÓN DEFINITIVA**: Corrección final del método `truncateDecimals()` eliminando completamente `number_format()` del resultado
- El problema en v3.6.2 y v3.6.3 era que `number_format()` siempre redondea, incluso después de truncar
- Resuelve definitivamente el error **FAD06** de la DIAN: "Valor del CUFE no está calculado correctamente"

### Changed
- Método `truncateDecimals()` reescrito usando SOLO manipulación de strings:
  1. `number_format($value, 6, '.', '')` - Conversión inicial con máxima precisión
  2. `rtrim($stringValue, '0')` - Elimina ceros del final
  3. `rtrim($stringValue, '.')` - Elimina punto si es entero
  4. `substr($decimalPart, 0, 2)` - Trunca (NO redondea) a 2 decimales
  5. `str_pad($decimalPart, 2, '0')` - Rellena con ceros si es necesario
  6. **NO** usa `number_format()` en el resultado final

### Technical Details
- Casos de prueba garantizados:
  - `truncateDecimals(33000)` → `"33000.00"` ✅
  - `truncateDecimals(30555.55)` → `"30555.55"` ✅
  - `truncateDecimals(12037.046)` → `"12037.04"` ✅ (trunca, NO redondea a .05)
  - `truncateDecimals(2444.4)` → `"2444.40"` ✅
- Aplicado en: SignInvoice, SignAttachedDocument, SignDocumentSupport, SignPayroll

## [3.6.3] - 2025-11-19

### Fixed
- **Bug crítico en truncateDecimals()**: Corregido problema de precisión de punto flotante
  - Versión anterior usaba `floor(value * 100) / 100` que causaba errores de precisión
  - Nueva implementación usa `sprintf()` y `substr()` para truncado exacto basado en strings
  - Ejemplo: `33000` ahora se trunca correctamente a `33000.00` sin errores de precisión
  - Resuelve CUFEs incorrectos cuando los valores no tienen decimales o tienen exactamente 2 decimales

### Changed
- Método `truncateDecimals()` reescrito en todos los archivos XAdES
- Ahora usa manipulación de strings en lugar de operaciones de punto flotante
- Algoritmo: `sprintf('%.10f')` → `substr()` → `number_format()`

### Technical Details
- Problema: `30555.56 * 100` podía resultar en `3055556.0000000001` por precisión flotante
- Solución: Convertir a string con 10 decimales, truncar string, formatear resultado
- Aplicado en: SignInvoice, SignAttachedDocument, SignDocumentSupport, SignPayroll

## [3.6.2] - 2025-11-18

### Fixed
- **CORRECCIÓN CRÍTICA**: Implementación de truncado en lugar de redondeo para valores monetarios
  - Según especificación DIAN: "con decimales a dos (2) dígitos truncados"
  - Nuevo método `truncateDecimals()` que trunca valores usando `floor()` en lugar de redondear
  - Aplicado en **todos los archivos XAdES**: `SignInvoice.php`, `SignAttachedDocument.php`, `SignDocumentSupport.php`, `SignPayroll.php`
  - **Impacto**: Valores como 12037.046 ahora se truncan a 12037.04 (antes redondeaba a 12037.05)
  - Resuelve error **FAD06** de la DIAN: "Valor del CUFE no está calculado correctamente"

### Changed
- Todos los métodos que calculan CUFE/CUDE/CUDS/CUNE ahora usan truncado estricto
- Actualización de comentarios en métodos helper indicando uso de truncado según especificación DIAN

### Technical Details
- `truncateDecimals(float $value, int $decimals = 2)`: Multiplica por 10^decimales, aplica `floor()`, divide
- Ejemplo: `floor(12037.046 * 100) / 100 = floor(1203704.6) / 100 = 1203704 / 100 = 12037.04`
- Cumplimiento total con especificación técnica DIAN para generación de CUFE

## [3.6.1] - 2025-11-17

### Changed
- **Extensión del fix de formateo a 2 decimales**: Aplicado a todos los archivos de firma XAdES
  - `SignAttachedDocument.php`: CUFE/CUDE con valores formateados a 2 decimales
  - `SignDocumentSupport.php`: CUDS, CUDE y eventos con valores formateados a 2 decimales
  - `SignPayroll.php`: CUNE con valores de nómina formateados a 2 decimales

### Added
- Métodos auxiliares en `SignAttachedDocument.php` para reutilización de código
- Métodos auxiliares en `SignDocumentSupport.php` incluyendo soporte para CUDS y eventos
- Método `buildDocumentSupportHashString()` específico para documentos soporte

### Improved
- Refactorización completa de `SignAttachedDocument.php` siguiendo el mismo patrón de `SignInvoice.php`
- Refactorización completa de `SignDocumentSupport.php` con métodos auxiliares para CUDS y eventos
- Refactorización de `SignPayroll.php` para formateo correcto de valores en CUNE
- Consistencia en formateo de 2 decimales en todos los tipos de documentos electrónicos

## [3.6.0] - 2025-11-17

### Changed
- **BREAKING FIX**: Formateo de valores monetarios y de impuestos a exactamente 2 decimales en cálculo de CUFE/CUDE
  - Los valores de `LineExtensionAmount` y `PayableAmount` ahora se formatean con 2 decimales
  - Los valores de impuestos (`TaxAmount` para IDs 01, 03, 04, etc.) ahora se formatean con 2 decimales
  - Esto previene errores en la generación de CUFE/CUDE cuando los XML contienen valores con hasta 6 decimales
  - **Nota**: Esta corrección puede generar CUFEs diferentes a versiones anteriores si los valores tenían más de 2 decimales

### Added
- Métodos auxiliares privados para centralizar lógica repetida:
  - `getTaxAmount(string $taxId)`: Obtiene el monto de un impuesto específico formateado
  - `getLineExtensionAmount()`: Obtiene el valor base formateado
  - `getPayableAmount()`: Obtiene el valor total a pagar formateado
  - `getBasicDocumentData()`: Obtiene ID, Fecha y Hora del documento
  - `getPartyIdentifications()`: Obtiene NITs de proveedor y cliente
  - `getEventPartyIdentifications()`: Obtiene NITs para eventos (sender/receiver)
  - `getDocumentResponseData()`: Obtiene datos de respuesta de eventos
  - `buildInvoiceHashString()`: Construye la cadena base para CUFE/CUDE
  - `buildEventHashString()`: Construye la cadena base para eventos

### Improved
- Refactorización completa de métodos `cufe()`, `cude()`, `cudeevent()`, `ConsultarCUDEEVENT()` y `getQRData()`
- Eliminación de código duplicado siguiendo principio DRY (Don't Repeat Yourself)
- Mejor mantenibilidad y testabilidad del código
- Código más limpio y autodocumentado con métodos auxiliares reutilizables

## [3.5.1] - 2024

### Fixed
- Ajustes en la nómina de ajustes de eliminación

## [3.5.0] - 2024

### Added
- Calcular y setear el SoftwareSecurityCode
- Calcular y setear CUNE
- Agregar la url de consulta de CUNE en el campo CodigoQR
- Función para obtener la información del QR

## [3.4.0] - 2025

### Added
- GetAcquirer para obtener los datos de la entidad adquirente (Resolución 000202 de 2025)

## [3.2.11] - 2024

### Fixed
- Corregir formato dateTime en XML para SigningTime en facturas DIAN

### Improved
- Mejora en la descripción de errores devueltos por la DIAN

## [3.2.6] - 2024

### Changed
- Ajustes en SignInvoice para generar acuse de recibo

## [3.2.3] - 2024

### Changed
- Ajustes en SignInvoice para permitir obtener el CUFE y QR

## [3.2.0] - 2024

### Added
- Control de errores en las solicitudes

## [3.1.9] - 2024

### Fixed
- Ajustes en la firma de eventos

## [3.1.5 - 3.1.8] - 2024

### Added
- Eventos para el envío de facturas, notas crédito y notas débito

## [2.0] - 2023

### Added
- Pruebas válidas para el envío de notas débito
- Estándar de nombres de documentos

## [1.3] - 2023

### Changed
- Licencia LGPL

## [1.2] - 2023

### Added
- Pruebas válidas para el envío de notas crédito
- Cálculo del CUDE

## [1.1.1] - 2023

### Fixed
- Error de canonización resuelto

## [1.1] - 2023

### Added
- Plantillas principales para consumo de Web Service
- Dependencia curl agregada

## [1.0] - 2023

### Added
- Pruebas válidas con binary security token (SOAP)
- Firma XAdES (XML) con algoritmos sha1, sha256 y sha512
