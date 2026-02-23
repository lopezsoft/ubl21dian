# UBL 2.1 DIAN

Core for electronic invoicing pre-validation - DIAN UBL 2.1.

## Latest Release

### Version 3.6.6 (2026-02-23)

**🐛 FIX**: Mejorado el mensaje de error en `Client.php` cuando `curl_error()` retorna vacío.

#### Fixed

- **Client**: Cuando cURL falla y `curl_error()` no tiene descripción textual, el mensaje de error ahora incluye el `errno` de cURL y la URL destino, facilitando el diagnóstico de fallos de conectividad con los servicios DIAN.
  - Antes: `Exception: Exception: Class Lopezsoft\UBL21dian\Client: `
  - Ahora: `Exception: Class Lopezsoft\UBL21dian\Client: cURL errno 7. URL: https://...`

---

### Version 3.6.5 (2025-12-03)

**🐛 FIX**: Corrección de métodos públicos `ConsultarCUDS()` y `ConsultarCUDE()` en `SignDocumentSupport.php`.

#### Fixed

- **ConsultarCUDS()**: Ahora usa `buildDocumentSupportHashString()` con valores truncados a 2 decimales
- **ConsultarCUDE()**: Ahora usa `buildInvoiceHashString()` con valores truncados a 2 decimales
- Agregada validación de `$this->pin` con excepción en ambos métodos
- Agregado tipo de retorno `string` a ambos métodos

#### Technical Details

Los métodos públicos `ConsultarCUDS()` y `ConsultarCUDE()` no estaban aplicando el truncado a 2 decimales, lo que podía generar hashes incorrectos si el usuario los llamaba directamente.

**⚠️ Actualización recomendada** si utiliza los métodos `ConsultarCUDS()` o `ConsultarCUDE()` directamente.

---

### Version 3.6.4 (2025-11-21)

**✅ SOLUCIÓN DEFINITIVA**: Corrección final del método `truncateDecimals()` eliminando completamente el uso de `number_format()` en el resultado.

#### Fixed
- **Truncado definitivo sin redondeo**: Solución basada en manipulación pura de strings
  - Problema en v3.6.2 y v3.6.3: Uso final de `number_format()` que siempre redondea
  - Solución: Algoritmo basado en `rtrim()` + `substr()` + `str_pad()` sin operaciones matemáticas
  - **Garantiza**: Truncado exacto a 2 decimales, nunca redondeo
  - **Resuelve definitivamente error FAD06**: "Valor del CUFE no está calculado correctamente"

#### Changed
- Método `truncateDecimals()` reescrito usando SOLO string manipulation:
  1. `number_format($value, 6, '.', '')` - Conversión inicial con máxima precisión
  2. `rtrim($stringValue, '0')` - Elimina ceros del final
  3. `rtrim($stringValue, '.')` - Elimina punto si es entero
  4. `substr($decimalPart, 0, 2)` - Trunca (NO redondea) a 2 decimales
  5. `str_pad($decimalPart, 2, '0')` - Rellena con ceros si es necesario
  6. **NO** usa `number_format()` en el resultado final

#### Technical Details
```php
// Casos de prueba garantizados:
truncateDecimals(33000)      → "33000.00"  ✅
truncateDecimals(30555.55)   → "30555.55"  ✅
truncateDecimals(12037.046)  → "12037.04"  ✅ (trunca, NO redondea a .05)
truncateDecimals(2444.4)     → "2444.40"   ✅
```

#### Affected Files
- `SignInvoice.php` - CUFE/CUDE con truncado definitivo
- `SignAttachedDocument.php` - CUFE/CUDE con truncado definitivo
- `SignDocumentSupport.php` - CUDS/CUDE/Eventos con truncado definitivo
- `SignPayroll.php` - CUNE con truncado definitivo

**⚠️ Actualización CRÍTICA**: Esta es la solución definitiva después de 4 intentos. Implementa exactamente la especificación DIAN: "con decimales a dos (2) dígitos truncados".

---

### Version 3.6.3 (2025-11-19)

**🐛 HOTFIX**: Corregido bug crítico de precisión flotante en `truncateDecimals()`.

#### Fixed
- **Bug en truncateDecimals()**: La versión anterior causaba errores de precisión con operaciones de punto flotante
  - Problema: `floor(value * 100) / 100` generaba imprecisiones como `3055556.0000000001`
  - Solución: Nueva implementación usando `sprintf()` + `substr()` para truncado exacto basado en strings
  - **Impacto**: CUFEs incorrectos cuando valores no tenían decimales (ej: `33000`) o tenían exactamente 2 decimales

#### Changed
- Método `truncateDecimals()` completamente reescrito en todos los archivos XAdES
- Algoritmo mejorado: String manipulation en lugar de operaciones flotantes
- Proceso: `sprintf('%.10f')` → `substr()` → `number_format()`

#### Example
```php
// ❌ Antes (con bug de precisión flotante)
33000 * 100 / 100 = 33000.0000000001 → CUFE incorrecto

// ✅ Ahora (truncado exacto con strings)  
sprintf('%.10f', 33000) = "33000.0000000000"
substr() = "33000.00" → CUFE correcto
```

**⚠️ Actualización urgente recomendada** si sus documentos contienen valores sin decimales o con exactamente 2 decimales.

---

### Version 3.6.2 (2025-11-18)

**🔧 CORRECCIÓN CRÍTICA**: Implementación de truncado en lugar de redondeo para valores monetarios según especificación DIAN.

#### Fixed
- **Truncado correcto según DIAN**: Cambio de `number_format()` (redondeo) a `truncateDecimals()` (truncado)
  - Especificación DIAN: "con decimales a dos (2) dígitos truncados"
  - Nuevo método `truncateDecimals()` que usa `floor()` para truncar valores sin redondear
  - **Ejemplo**: 12037.046 → 12037.04 (antes redondeaba a 12037.05)
  - **Resuelve error FAD06**: "Valor del CUFE no está calculado correctamente"
  
#### Changed
- Aplicado en **TODOS los archivos XAdES**:
  - `SignInvoice.php` - CUFE/CUDE con truncado
  - `SignAttachedDocument.php` - CUFE/CUDE con truncado
  - `SignDocumentSupport.php` - CUDS/CUDE/Eventos con truncado
  - `SignPayroll.php` - CUNE con truncado

#### Technical
- Implementación: `floor(value * 100) / 100` para truncar a 2 decimales
- Cumplimiento total con especificación técnica de generación del CUFE

**⚠️ Importante**: Esta corrección puede cambiar CUFEs/CUDEs existentes, pero es necesaria para cumplir con la especificación de la DIAN.

---

### Version 3.6.1 (2025-11-17)

**Extensión del fix crítico**: Esta versión extiende la corrección de formateo a 2 decimales a TODOS los archivos de firma XAdES.

#### Changed
- **Formateo completo a 2 decimales en todos los tipos de documentos**:
  - `SignAttachedDocument.php` - CUFE/CUDE formateados correctamente
  - `SignDocumentSupport.php` - CUDS, CUDE y eventos formateados correctamente
  - `SignPayroll.php` - CUNE con valores de nómina formateados a 2 decimales

#### Added
- Métodos auxiliares reutilizables en `SignAttachedDocument.php`
- Métodos auxiliares completos en `SignDocumentSupport.php` (CUDS + eventos)
- Método específico `buildDocumentSupportHashString()` para documentos soporte

#### Improved
- Refactorización completa aplicada a todos los archivos XAdES
- Consistencia total en formateo de 2 decimales en todos los tipos de documentos
- Código más limpio y mantenible en toda la librería

---

### Version 3.6.0 (2025-11-17)

**⚠️ BREAKING FIX**: Corrección del cálculo de CUFE/CUDE para cumplir con la especificación de la DIAN (2 decimales exactos en `SignInvoice.php`).

#### Changed
- **Formateo correcto de valores monetarios**: Todos los valores monetarios y de impuestos ahora se formatean con exactamente 2 decimales en el cálculo de CUFE/CUDE
  - `LineExtensionAmount` y `PayableAmount` formateados a 2 decimales
  - Todos los impuestos (`TaxAmount`) formateados a 2 decimales
  - Previene errores cuando los XML contienen valores con hasta 6 decimales

#### Added
- Métodos auxiliares privados para mejorar mantenibilidad y reutilización de código
- Mejor arquitectura interna siguiendo principios SOLID y DRY

#### Improved
- Refactorización completa de generación de CUFE/CUDE
- Código más limpio, testeable y mantenible
- Eliminación de duplicación de código

**Nota**: Si anteriormente usaba valores con más de 2 decimales, el CUFE/CUDE generado será diferente (ahora correcto según especificación DIAN).

---

# Tags
* **3.6.6**: Fix - Mensaje de error cURL enriquecido con errno y URL cuando curl_error() está vacío.
* **3.6.5**: Fix - Corrección métodos públicos ConsultarCUDS() y ConsultarCUDE() con truncado a 2 decimales.
* **3.6.4**: Fix - Solución definitiva de truncateDecimals() eliminando number_format() del resultado.
* **3.6.3**: Hotfix - Bug de precisión flotante en truncateDecimals corregido. Actualización urgente recomendada.
* **3.6.2**: Fix crítico - Truncado (no redondeo) según especificación DIAN. Resuelve error FAD06.
* **3.6.1**: Extensión del fix - Formateo a 2 decimales en TODOS los archivos XAdES (AttachedDocument, DocumentSupport, Payroll).
* **3.6.0**: Fix crítico - Formateo correcto a 2 decimales para CUFE/CUDE. Refactorización de código.
* **3.5.1**: Ajustes en la nómina de ajustes de eliminación.
* **3.5.0**: Calcular y setear SoftwareSecurityCode, CUNE, URL de consulta CUNE en CodigoQR, función para obtener información del QR.
* **3.4.0**: GetAcquirer para obtener datos de entidad adquirente (Resolución 000202 de 2025).
* **3.2.11**: FIX - Formato dateTime en XML para SigningTime. Feature - Mejora descripción errores DIAN.
* **3.2.6**: Ajustes en SignInvoice para generar acuse de recibo.
* **3.2.3**: Ajustes en SignInvoice para obtener CUFE y QR.
* **3.2.0**: Control de errores en las solicitudes.
* **3.1.9**: Ajustes en la firma de eventos.
* **3.1.5-3.1.8**: Eventos para envío de facturas, notas crédito y débito.
* **2.0**: Notas débito y estándar de nombres de documentos.
* **1.3**: Licencia LGPL.
* **1.2**: Notas crédito y cálculo del CUDE.
* **1.1.1**: Solución error canonización.
* **1.1**: Templates para Web Service, require curl.
* **1.0**: Tests válidos con binary security token (SOAP) y firma XAdES (XML) con sha1, sha256, sha512.

# Resources
* [Documentation](https://docs.matias-api.com)
* [CHANGELOG](CHANGELOG.md)

## Installation

```bash
composer require lopezsoft/ubl21dian
```

## Requirements

- PHP >= 8.0
- Extensions: dom, xml, curl, libxml, openssl, xmlwriter, json
- nesbot/carbon ^2.19 || ^3.8

## Authors

* [Lewis Lopez](https://github.com/lopezsoft/)

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- Issues: https://github.com/lopezsoft/ubl21dian/issues
- Source: https://github.com/lopezsoft/ubl21dian

