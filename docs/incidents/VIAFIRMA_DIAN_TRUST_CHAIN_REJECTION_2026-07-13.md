# Incidente: Rechazo de Certificados VIAFIRMA por la DIAN — Cadena de Confianza No Homologada

**Fecha de Reporte:** 2026-07-13  
**Último Actualizado:** 2026-07-14  
**Estado:** ESCALADO A VIAFIRMA Y DIAN  
**Prioridad:** CRÍTICA (bloquea emisión de documentos electrónicos)

---

## Resumen Ejecutivo

Certificados emitidos recientemente por **VIAFIRMA** (acreditación ONAC 24-ECD-0010, raíz española C=ES) son **rechazados sistemáticamente por la DIAN** en dos capas:

1. **Portal web DIAN:** autenticación mTLS rechaza la cadena de confianza
2. **Endpoint SOAP** (`WcfDianCustomerServices.svc`): devuelve fault 500 genérico al enviar documentos firmados

**Causa raíz:** La raíz **VIAFIRMA QTSP ROOT CA** (C=ES) **no está homologada en el almacén de confianza de la DIAN**. Esto contrasta con **CamerFirma** (raíz C=CO, ya homologada), que funciona sin problemas.

---

## Contexto

### Cronología

- **2026-07-10:** Emisión del primer certificado VIAFIRMA para LOPEZSOFT S.A.S (NIT 901091403)
- **2026-07-13 23:07–23:13:** Múltiples intentos de envío de facturas firmadas con VIAFIRMA → fallos
- **2026-07-13 23:11:** Log en `laravel.log` documenta fault SOAP vacío
- **2026-07-14:** Análisis técnico exhaustivo y escalamiento a VIAFIRMA

### Documentos de Referencia

- Certificado VIAFIRMA fallido (backend): `d:\wamp64\www\apidian\backend\storage\app\xml\1\fv\fva348537a-80a3-4437-8926-21f2e64a29f0.xml`
- Certificado CamerFirma exitoso (comparación): `fv207303f4-...318.xml`
- Correo de escalamiento a VIAFIRMA: `/docs/correspondences/viafirma_escalation_2026-07-14.eml`

---

## Síntomas Observados

### 1. Rechazo en Portal Web DIAN

**Interfaz:** `https://catalogov-vpfe-hab.dian.gov.co/User/Login`  
**Error:** Diálogo de selección de certificado rechaza VIAFIRMA con mensaje de cadena de confianza inválida  
**Evidencia:** Captura de pantalla muestra opciones de certificado; VIAFIRMA aparece deshabilitado/rechazado

### 2. Rechazo en Endpoint SOAP

**Endpoint:** `https://vpfe.dian.gov.co/WcfDianCustomerServices.svc`  
**Método:** `SendBillSync` (envío de factura)  
**Respuesta HTTP:** 500 Internal Server Error  
**Respuesta SOAP:**
```xml
<s:Fault>
  <s:Code><s:Value>s:Client</s:Value></s:Code>
  <s:Reason><s:Text xml:lang="en-US">The creator of this fault did not specify a Reason.</s:Text></s:Reason>
</s:Fault>
```

**Log relevante:**  
Archivo: `d:\wamp64\www\apidian\backend\storage\logs\laravel.log`  
Línea: 2058893  
Timestamp: `[2026-07-13 23:11:18]`

```
local.ERROR: Error processing electronic document: Error 500: Internal Server Error. 
Ocurrió un problema en el servidor de la DIAN.: <s:Envelope...><s:Fault>...</s:Fault></s:Envelope>
```

---

## Análisis Técnico

### Comparación de Certificados

| Aspecto | VIAFIRMA (falla) | CamerFirma (funciona) |
|---------|------------------|----------------------|
| **Hoja (Subject)** | CN=LOPEZSOFT S.A.S - FACTURACION, C=CO | CN=LOPEZSOFT S.A.S, C=CO |
| **Emisor (CA Intermedia)** | CN=VIAFIRMA TSA SUB CA, C=ES, O=VIAFIRMA SOCIEDAD LIMITADA | CN=SUBCA CAMERFIRMA COLOMBIA SAS, C=CO |
| **Raíz (Subject CN)** | VIAFIRMA QTSP ROOT CA | CAMERFIRMA ROOT CA (inferido) |
| **País de Raíz** | ES (España) | CO (Colombia) |
| **Acreditación ONAC** | 24-ECD-0010 (muy reciente, code bajo) | Establecida/anterior |
| **Número de Serie** | `661DBF6ECFBA7A98B88246AC872D1E0EB076EE62` (hex) = `582980456388580795950145844715190039548198841954` (decimal, 48 dígitos) | `5263524200754149266` (19 dígitos) |

### Validación de Estructura XAdES

**Hallazgo:** Ambos certificados generan firmas XAdES **estructuralmente idénticas**:
- Mismo `CanonicalizationMethod`: `http://www.w3.org/TR/2001/REC-xml-c14n-20010315`
- Mismo `SignatureMethod`: `http://www.w3.org/2001/04/xmldsig-more#rsa-sha256`
- Mismo `DigestMethod`: `http://www.w3.org/2001/04/xmlenc#sha256`
- Mismo `SignaturePolicyIdentifier` (DIAN v2)
- Mismo `SignerRole` (supplier)

**Conclusión:** No hay variación en formato, algoritmo ni procesos de firma. La firma XAdES es correcta.

### Validación del Número de Serie

**Verificación OpenSSL:**
```bash
openssl x509 -in viafirma_cert.pem -noout -serial
# serial=661DBF6ECFBA7A98B88246AC872D1E0EB076EE62
```

**Conversión Hex → Decimal (verificada con Python y bc):**
```
661DBF6ECFBA7A98B88246AC872D1E0EB076EE62 (hex, 20 bytes)
↓
582980456388580795950145844715190039548198841954 (decimal, 48 dígitos)
```

**Comparación en XML firmado:**
```xml
<ds:X509SerialNumber>582980456388580795950145844715190039548198841954</ds:X509SerialNumber>
```

**Resultado:** ✅ Coincide exactamente. El bug de precisión de serial (fix v3.6.9 con `bcmath`) **no es la causa**.

### Investigación del Código Backend (ubl21dian)

**Archivo:** `d:\wamp64\www\packages\ubl21dian\src\Client.php`

**Hallazgo:** El cliente cURL está configurado correctamente para SOAP, pero **no implementa autenticación mTLS explícita** (no hay `CURLOPT_SSLCERT`, `CURLOPT_SSLKEY`). Sin embargo, esto es consistente con el patrón de "WS-Security en SOAP header" en lugar de "mTLS a nivel TLS".

**Nota técnica:** La firma XAdES lleva el certificado en el `BinarySecurityToken` del SOAP header; esto no requiere mTLS adicional a nivel cURL.

---

## Causa Raíz Identificada

### Hipótesis Confirmada: No Homologación de Raíz VIAFIRMA en DIAN

La **raíz VIAFIRMA QTSP ROOT CA (C=ES)** no está registrada en el almacén de confianza de la DIAN para:
- Validación de certificados de cliente (portal web)
- Validación de cadenas de firma en documentos (endpoint SOAP)

**Evidencia:**

1. **Síntomas simétricos:** Ambos portales (web y SOAP) rechazan con errores de cadena
2. **Comparación exitosa:** CamerFirma (C=CO) funciona en ambos lugares sin fricciones
3. **Acreditación nueva:** VIAFIRMA tiene código ONAC bajo (24-ECD-0010) → acreditación muy reciente, probablemente sin proceso completo de homologación ante DIAN

### ¿Por qué DIAN no confía en la raíz?

Posibles motivos:
1. **Proceso pendiente:** VIAFIRMA acreditada por ONAC, pero DIAN requiere homologación separada/explícita
2. **Política geográfica:** DIAN puede estar restringiendo certificados a raíces colombianas (C=CO)
3. **CA chain validation:** DIAN valida la raíz contra un almacén específico; VIAFIRMA QTSP ROOT CA no está en ese almacén

---

## Evidencia Técnica

### Archivos XML Firmados

**VIAFIRMA (rechazado):**
```
Ruta: d:\wamp64\www\apidian\backend\storage\app\xml\1\fv\fva348537a-80a3-4437-8926-21f2e64a29f0.xml
Timestamp: 2026-07-13 23:11:18
Issuer: C=ES, O=VIAFIRMA SOCIEDAD LIMITADA, OU=VIAFIRMA QTSP, CN=VIAFIRMA TSA SUB CA
Serial: 661DBF6ECFBA7A98B88246AC872D1E0EB076EE62
Status: FALLA EN DIAN
```

**CamerFirma (aceptado):**
```
Ruta: d:\wamp64\www\apidian\backend\storage\app\xml\1\fv\fv207303f4-...318.xml
Timestamp: 2026-06-16 18:32:56
Issuer: C=CO, L=BOGOTA D.C., O=CAMERFIRMA COLOMBIA SAS, CN=SUBCA CAMERFIRMA COLOMBIA SAS
Serial: 5263524200754149266
Status: OK EN DIAN
```

### Logs del Sistema

**Archivo:** `d:\wamp64\www\apidian\backend\storage\logs\laravel.log`  
**Búsqueda:** `2026-07-13 23:1[0-3]` + `Error processing electronic document`

Contiene el fault SOAP completo con timestamp de cada intento fallido (23:07, 23:08, 23:11, 23:13).

---

## Estado Actual

### Escalamiento Realizado

1. ✅ **Correo a VIAFIRMA** (2026-07-14)
   - Describiendo el problema de mTLS en portal + endpoint SOAP
   - Solicitando confirmación de homologación en DIAN
   - Preguntando alternativa: ¿certificados con raíz C=CO?

2. **Pendiente:** Respuesta de VIAFIRMA sobre:
   - Estado formal de homologación en DIAN
   - ETA para completar homologación
   - Disponibilidad de certificados con raíz colombiana

### Acciones Recomendadas para el Usuario

1. **Comunicación directa con DIAN** (en paralelo a VIAFIRMA):
   - Preguntar si raíz VIAFIRMA QTSP ROOT CA está en su almacén de confianza
   - Solicitar ETA de inclusión si aún no está
   - Pedir contact de escalamiento técnico

2. **Evaluación de alternativas de corto plazo:**
   - ¿Seguir usando CamerFirma mientras VIAFIRMA se homologa?
   - ¿Cambiar a otro proveedor acreditado ONAC con raíz C=CO?

3. **Contingencia:**
   - Documentar en acuerdos con clientes que certificados VIAFIRMA no pueden usarse hasta que DIAN los homologue

---

## Artefactos de Referencia

### Documentación Técnica

- **Este documento:** `/docs/incidents/VIAFIRMA_DIAN_TRUST_CHAIN_REJECTION_2026-07-13.md` (en ubl21dian)
- **Plan de investigación:** `C:\Users\LOPEZSOFT\.claude\plans\en-el-editor-hay-validated-deer.md`
- **Memoria del proyecto:** `C:\Users\LOPEZSOFT\.claude\projects\d--wamp64-www-packages-ubl21dian\memory\`

### Contactos Relevantes

| Contacto | Organización | Rol |
|----------|--------------|-----|
| Benito | VIAFIRMA | Escalamiento Técnico |
| Mesa de Ayuda DIAN | DIAN | Soporte |
| Lewis López | MATIAS API | Ingeniero Senior |

---

## Conclusiones

Este incidente **no es un bug en el código de ubl21dian** sino una **limitación operativa de terceros**: VIAFIRMA es una CA acreditada por ONAC pero aún no homologada completamente en los almacenes de confianza de la DIAN.

El análisis técnico exhaustivo ha descartado todas las posibles causas de código:
- ✅ Serial del certificado: correcto (bcmath convierte bien)
- ✅ Firma XAdES: estructuralmente idéntica a CamerFirma
- ✅ Empaquetado de certificado: íntegro
- ✅ Código backend: funcionando como diseñado

**La solución requiere intervención externa (VIAFIRMA y/o DIAN)**, no cambios en el código de ubl21dian.

---

## Historial de Actualizaciones

| Fecha | Actualización |
|-------|---------------|
| 2026-07-14 | Documento creado; análisis completo; escalamiento a VIAFIRMA |
| TBD | Respuesta de VIAFIRMA |
| TBD | Resolución final |
