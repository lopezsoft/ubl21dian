
# DIAN SDK Node

[](https://www.google.com/search?q=https://www.npmjs.com/package/dian-sdk-node)
[](https://opensource.org/licenses/MIT)

Librería para Node.js y TypeScript diseñada para facilitar la integración con los servicios web de la DIAN en Colombia. Permite la firma de documentos electrónicos (facturas, notas, nómina) bajo el estándar XAdES-EPES y la comunicación SOAP con los endpoints de la DIAN.

Este proyecto es una migración y modernización de la librería PHP `lopezsoft/ubl21dian`, aplicando principios de Clean Code, SOLID y Patrones de Diseño para una mayor mantenibilidad y extensibilidad.

## ✨ Características

- **Arquitectura Moderna**: Construida con TypeScript y siguiendo patrones de diseño como Facade, Command y Template Method.
- **Firma XAdES-EPES**: Firma de documentos UBL 2.1 según los requerimientos de la DIAN.
- **Firma SOAP con WS-Security**: Aseguramiento de los mensajes enviados al web service.
- **Soporte Completo para Operaciones DIAN**:
    - Envío de facturas (síncrono y asíncrono).
    - Envío de Nómina Electrónica.
    - Envío de eventos (ApplicationResponse).
    - Consulta de estado de documentos y ZIPs.
    - Consulta de rangos de numeración.
    - Consulta de adquirientes (`GetAcquirer`).
    - ¡Y más\!
- **Fácilmente Extensible**: Añadir nuevas operaciones de la DIAN es tan simple como crear una nueva clase `Command`, sin modificar el código existente.

## 📦 Instalación

```bash
npm install dian-sdk-node
```

## 🚀 Uso Básico

La librería se utiliza a través de la clase `DianClient`, que actúa como una fachada para todas las operaciones. El flujo de trabajo es simple:

1.  **Instanciar** el cliente con la configuración necesaria.
2.  **Inicializarlo** con las credenciales del certificado.
3.  **Ejecutar comandos** para cada operación, pasándole los parámetros requeridos.

### Ejemplo Completo: Enviar una Factura Electrónica

A continuación, un ejemplo completo de cómo firmar y enviar una factura electrónica.

```typescript
import * as fs from 'fs/promises';
import { DianClient, SendBillSyncCommand, ISendBillSyncParams } from 'dian-sdk-node';

async function enviarFactura() {
  try {
    // 1. Configurar el cliente (environment: 1 = PRODUCCION, 2 = HABILITACION)
    const client = new DianClient({ environment: 2 });

    // 2. Inicializar con el certificado digital (.p12)
    const certificate = await fs.readFile('./certificados/certificado_pruebas.p12');
    await client.initialize({
      certificate,
      passwordPsswrd: 'tu_contraseña_del_certificado',
    });
    console.log('Cliente DIAN inicializado correctamente.');

    // 3. Cargar el XML de la factura sin firmar
    const unsignedInvoiceXml = await fs.readFile('./ejemplos/factura-sin-firmar.xml', 'utf-8');

    // 4. Preparar y ejecutar el comando
    const command = new SendBillSyncCommand();
    const params: ISendBillSyncParams = {
      fileName: 'FV-DEMO-001.xml',
      unsignedUblXml: unsignedInvoiceXml,
    };

    console.log('Enviando factura a la DIAN...');
    const dianResponse = await client.execute(command, params);

    // 5. Procesar la respuesta de la DIAN
    console.log('Respuesta de la DIAN:', JSON.stringify(dianResponse, null, 2));

    if (dianResponse.IsValid) {
      console.log('¡Factura enviada y validada con éxito!');
      console.log('CUFE:', dianResponse.XmlDocumentKey);
    } else {
      console.error('Error al validar la factura:', dianResponse.StatusMessage);
    }

  } catch (error) {
    console.error('Ha ocurrido un error en el proceso:', error);
  }
}

enviarFactura();
```

### Ejemplo 2: Consultar el Estado de un Documento

```typescript
import * as fs from 'fs/promises';
import { DianClient, GetStatusCommand } from 'dian-sdk-node';

async function consultarEstado() {
  const client = new DianClient({ environment: 2 });

  const certificate = await fs.readFile('./certificados/certificado_pruebas.p12');
  await client.initialize({
    certificate,
    passwordPsswrd: 'tu_contraseña_del_certificado',
  });

  const command = new GetStatusCommand();
  const dianResponse = await client.execute(command, {
    trackId: 'el-track-id-devuelto-por-la-dian',
  });
  
  console.log('Estado del documento:', dianResponse);
}

consultarEstado();
```

### Ejemplo 3: Enviar Nómina Electrónica

```typescript
import * as fs from 'fs/promises';
import { DianClient, SendNominaSyncCommand } from 'dian-sdk-node';

async function enviarNomina() {
  const client = new DianClient({ environment: 2 });

  const certificate = await fs.readFile('./certificados/certificado_pruebas.p12');
  await client.initialize({
    certificate,
    passwordPsswrd: 'tu_contraseña_del_certificado',
  });

  const unsignedPayrollXml = await fs.readFile('./ejemplos/nomina-sin-firmar.xml', 'utf-8');

  const command = new SendNominaSyncCommand();
  const result = await client.execute(command, {
    unsignedPayrollXml,
  });

  console.log('Resultado nómina:', result);
}

enviarNomina();
```

## 📚 API (Resumen)

### `DianClient`

Es la clase principal y el único punto de entrada a la librería.

- **`new DianClient(options)`**: Crea una nueva instancia del cliente.
    - `options.environment`: `1` para PRODUCCIÓN o `2` para HABILITACIÓN.
- **`initialize(options)`**: Método asíncrono que carga y valida el certificado. **Debe ser llamado antes de ejecutar cualquier comando.**
    - `options.certificate`: `Buffer` con el contenido del archivo `.p12`.
    - `options.passwordPsswrd`: Contraseña del certificado.
- **`execute(command, params)`**: Método asíncrono que ejecuta una operación.
    - `command`: Una instancia de la clase de comando que representa la operación (ej. `new SendBillSyncCommand()`).
    - `params`: Un objeto con los parámetros que requiere ese comando específico.

-----

### **Comandos Disponibles (`/commands`)**

Cada clase representa una operación de la DIAN. Debes instanciar el comando que necesitas y pasarlo al método `execute` del cliente.

| Comando | Descripción | Parámetros (`params`) |
| :--- | :--- | :--- |
| **`SendBillSyncCommand`** | Envía una factura síncronamente. | `{ fileName: string, unsignedUblXml: string }` |
| **`SendBillAsyncCommand`** | Envía una factura asíncronamente. | `{ fileName: string, unsignedUblXml: string }` |
| **`SendNominaSyncCommand`** | Envía un documento de Nómina Electrónica. | `{ unsignedPayrollXml: string }` |
| **`SendEventCommand`** | Envía un evento (ej. acuse de recibo). | `{ unsignedEventXml: string }` |
| **`SendBillAttachmentAsyncCommand`** | Envía un documento adjunto (`AttachedDocument`). | `{ fileName: string, unsignedAttachedDocumentXml: string }` |
| **`SendTestSetAsyncCommand`** | Envía un Set de Pruebas para habilitación. | `{ fileName: string, contentFile: string, testSetId: string }` |
| **`GetStatusCommand`** | Consulta el estado de un documento. | `{ trackId: string }` |
| **`GetStatusZipCommand`** | Consulta el estado de un envío asíncrono (ZIP). | `{ trackId: string }` |
| **`GetNumberingRangeCommand`**| Consulta los rangos de numeración. | `{ accountCode: string, accountCodeT: string, softwareCode: string }` |
| **`GetXmlByDocumentKeyCommand`**| Obtiene el XML de un documento por su CUFE/CUDE. | `{ trackId: string }` |
| **`GetExchangeEmailsCommand`** | Obtiene los correos de intercambio del facturador. | `null` (no requiere) |
| **`GetReferenceNotesCommand`** | Obtiene las notas asociadas a un documento. | `{ trackId: string }` |
| **`GetAcquirerCommand`** | Consulta la información de un adquiriente por su ID. | `{ identificationType: string, identificationNumber: string }` |

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**. Puedes usarlo libremente en tus proyectos comerciales y de código abierto.