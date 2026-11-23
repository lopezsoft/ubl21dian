<?php

namespace Lopezsoft\UBL21dian;

use DOMDocument;
use Exception;
use Lopezsoft\UBL21dian\Exceptions\SslCertificateException;
use Lopezsoft\UBL21dian\Templates\Template;

/**
 * Client.
 *
 * Verificación TLS (CERT-02): activa por defecto (VERIFYPEER=true, VERIFYHOST=2).
 * Orden de precedencia para cada opción:
 *   1. Argumento del constructor ($caBundle / $verifySsl).
 *   2. Propiedades del template ($template->caBundle / $template->sslVerify).
 *   3. Valores globales de Client::configureSsl().
 *   4. Variables de entorno UBL21DIAN_CA_BUNDLE / UBL21DIAN_SSL_VERIFY.
 *   5. CA del sistema (curl.cainfo / openssl.cafile de php.ini) con verificación activa.
 */
class Client
{
    /**
     * Variable de entorno con la ruta al CA bundle (archivo PEM o directorio de certificados).
     */
    public const ENV_CA_BUNDLE = 'UBL21DIAN_CA_BUNDLE';

    /**
     * Variable de entorno para desactivar la verificación TLS (solo con el valor 'false').
     */
    public const ENV_SSL_VERIFY = 'UBL21DIAN_SSL_VERIFY';

    /**
     * Códigos de cURL asociados a la verificación del certificado del servidor.
     *  - 60: CURLE_PEER_FAILED_VERIFICATION / CURLE_SSL_CACERT (CA desconocida o cadena incompleta).
     *  - 77: CURLE_SSL_CACERT_BADFILE (no se pudo leer el CA bundle).
     *  - 51: verificación del par fallida en versiones antiguas de libcurl (< 7.62).
     */
    public const CURL_CERTIFICATE_ERRORS = [60, 77, 51];

    /**
     * Verificación TLS global (null = resolver desde entorno).
     *
     * @var bool|null
     */
    private static ?bool $defaultVerifySsl = null;

    /**
     * CA bundle global (null = resolver desde entorno).
     *
     * @var string|null
     */
    private static ?string $defaultCaBundle = null;

    /**
     * Curl.
     *
     * @var resource
     */
    private $curl;

    /**
     * to.
     *
     * @var string
     */
    private $to;

    /**
     * Response.
     *
     * @var string
     */
    private $response;

    /**
     * HTTP Status Code.
     *
     * @var int
     */
    private int $httpStatusCode;

    /**
     * Construct.
     *
     * @param Template $template
     * @param string|null $caBundle Ruta a un CA bundle PEM (o directorio) que sustituye la configuración global.
     * @param bool|null $verifySsl false desactiva explícitamente la verificación TLS (no recomendado).
     * @throws SslCertificateException Si el CA bundle configurado no existe/no es legible o falla la verificación.
     * @throws Exception
     */
    public function __construct(Template $template, ?string $caBundle = null, ?bool $verifySsl = null)
    {
        if (empty($template->To)) {
            $template->To = 'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?wsdl';
        }

        $sslOptions = self::resolveSslOptions(
            $verifySsl ?? $template->sslVerify,
            $caBundle ?? $template->caBundle
        );

        $this->curl = curl_init();

        curl_setopt($this->curl, CURLOPT_URL, $this->to = $template->To);
        curl_setopt($this->curl, CURLOPT_CONNECTTIMEOUT, 30);
        curl_setopt($this->curl, CURLOPT_TIMEOUT, 30);
        curl_setopt($this->curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt_array($this->curl, $sslOptions);
        curl_setopt($this->curl, CURLOPT_POST, true);
        curl_setopt($this->curl, CURLOPT_POSTFIELDS, $template->xml);
        curl_setopt($this->curl, CURLOPT_HTTPHEADER, [
            'Accept: application/xml',
            'Content-type: application/soap+xml',
            'Content-length: '.strlen($template->xml),
        ]);

        $this->exec();

        return $this;
    }

    /**
     * Exec.
     * @throws Exception
     */
    private function exec()
    {
        $this->response = curl_exec($this->curl);

        if ($this->response === false) {
            $errorCode = curl_errno($this->curl);
            if ($errorCode === CURLE_OPERATION_TIMEDOUT) {
               $this->httpStatusCode = 504;
               $this->handleHttpErrors();
            }
            $errorMessage = curl_error($this->curl);
            if (self::isCertificateError($errorCode)) {
                throw new SslCertificateException(
                    self::certificateErrorMessage($errorCode, $errorMessage, (string) $this->to),
                    $errorCode
                );
            }
            if ($errorMessage === '') {
                $errorMessage = sprintf('cURL errno %d. URL: %s', $errorCode, $this->to);
            }
            throw new Exception('Class '.get_class($this).': '.$errorMessage);
        }

        $this->httpStatusCode = curl_getinfo($this->curl, CURLINFO_HTTP_CODE);

        $this->handleHttpErrors();
    }

    /**
     * Define la configuración TLS global para todas las instancias de Client
     * (útil cuando el entorno no expone variables con getenv(), p. ej. con config cacheada).
     * Pasar null en un argumento lo devuelve a la resolución por variables de entorno.
     *
     * @param bool|null $verifySsl false desactiva la verificación (solo entornos controlados).
     * @param string|null $caBundle Ruta a un CA bundle PEM o directorio de certificados.
     */
    public static function configureSsl(?bool $verifySsl = null, ?string $caBundle = null): void
    {
        self::$defaultVerifySsl = $verifySsl;
        self::$defaultCaBundle = self::normalizePath($caBundle);
    }

    /**
     * Resuelve las opciones cURL de verificación TLS.
     *
     * @param bool|null $verifySsl Valor explícito; null aplica configureSsl() y luego UBL21DIAN_SSL_VERIFY.
     * @param string|null $caBundle Valor explícito; null aplica configureSsl() y luego UBL21DIAN_CA_BUNDLE.
     * @return array<int, mixed> Opciones listas para curl_setopt_array().
     * @throws SslCertificateException Si el CA bundle indicado no existe o no es legible.
     */
    public static function resolveSslOptions(?bool $verifySsl = null, ?string $caBundle = null): array
    {
        $verify = $verifySsl ?? self::$defaultVerifySsl ?? self::verifyFromEnvironment();

        if (!$verify) {
            // Opt-out explícito: sin verificación de par ni de nombre de host.
            return [
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => 0,
            ];
        }

        $options = [
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ];

        $bundle = self::normalizePath($caBundle)
            ?? self::$defaultCaBundle
            ?? self::normalizePath(self::readEnvironment(self::ENV_CA_BUNDLE));

        if ($bundle === null) {
            // Sin bundle propio: cURL usa curl.cainfo / openssl.cafile o el almacén del sistema.
            return $options;
        }

        if (is_dir($bundle)) {
            $options[CURLOPT_CAPATH] = $bundle;
            return $options;
        }

        if (!is_file($bundle) || !is_readable($bundle)) {
            throw new SslCertificateException(sprintf(
                'Class %s: El CA bundle configurado no existe o no es legible (%s). '
                .'Verifique la ruta indicada en %s, en Client::configureSsl() o en $template->caBundle.',
                self::class,
                $bundle,
                self::ENV_CA_BUNDLE
            ));
        }

        $options[CURLOPT_CAINFO] = $bundle;

        return $options;
    }

    /**
     * Indica si un código de error de cURL corresponde a la verificación del certificado.
     *
     * @param int $curlErrno
     * @return bool
     */
    public static function isCertificateError(int $curlErrno): bool
    {
        return in_array($curlErrno, self::CURL_CERTIFICATE_ERRORS, true);
    }

    /**
     * Mensaje claro para errores de certificado, con las opciones de configuración del CA bundle.
     *
     * @param int $curlErrno
     * @param string $curlError
     * @param string $url
     * @return string
     */
    public static function certificateErrorMessage(int $curlErrno, string $curlError, string $url): string
    {
        $detail = $curlError !== '' ? $curlError : 'sin descripción';

        return sprintf(
            'Class %s: No fue posible verificar el certificado TLS de %s (cURL errno %d: %s). '
            .'Configure un CA bundle actualizado (p. ej. cacert.pem de https://curl.se/docs/caextract.html) mediante '
            .'la variable de entorno %s=/ruta/cacert.pem, Client::configureSsl(caBundle: ...), $template->caBundle '
            .'o las directivas curl.cainfo / openssl.cafile de php.ini. '
            .'Solo en entornos controlados puede desactivar la verificación con %s=false.',
            self::class,
            $url,
            $curlErrno,
            $detail,
            self::ENV_CA_BUNDLE,
            self::ENV_SSL_VERIFY
        );
    }

    /**
     * Verificación según UBL21DIAN_SSL_VERIFY: solo el valor 'false' (sin distinguir mayúsculas) la desactiva.
     *
     * @return bool
     */
    private static function verifyFromEnvironment(): bool
    {
        $value = self::readEnvironment(self::ENV_SSL_VERIFY);

        return $value === null || strtolower(trim($value)) !== 'false';
    }

    /**
     * Lee una variable de entorno desde getenv(), $_ENV o $_SERVER.
     *
     * @param string $name
     * @return string|null
     */
    private static function readEnvironment(string $name): ?string
    {
        $value = getenv($name);
        if ($value === false) {
            $value = $_ENV[$name] ?? $_SERVER[$name] ?? null;
        }

        return is_string($value) ? $value : null;
    }

    /**
     * Normaliza una ruta: null o cadena vacía se tratan como "no configurado".
     *
     * @param string|null $path
     * @return string|null
     */
    private static function normalizePath(?string $path): ?string
    {
        if ($path === null) {
            return null;
        }
        $path = trim($path);

        return $path === '' ? null : $path;
    }

    /**
     * Handle HTTP errors.
     * @throws Exception
     */
    private function handleHttpErrors(): void
    {
        $additionalMessage = ' Por favor, intente de nuevo en un par de minutos.';
        switch ($this->httpStatusCode) {
            case 500:
                throw new Exception($this->getErrorMessage(500).': '.$this->response);
            case 503:
                throw new Exception($this->getErrorMessage(503).$additionalMessage);
            case 507:
                throw new Exception($this->getErrorMessage(507).$additionalMessage);
            case 508:
                throw new Exception($this->getErrorMessage(508).$additionalMessage);
            case 403:
                throw new Exception($this->getErrorMessage(403).$additionalMessage);
            default:
                if ($this->httpStatusCode >= 400) {
                    throw new Exception($this->getErrorMessage($this->httpStatusCode).$additionalMessage);
                }
        }
    }

    /**
     * Obtener mensaje de error basado en el código de estado HTTP.
     *
     * @param int $httpStatusCode
     * @return string
     */
    private function getErrorMessage(int $httpStatusCode): string
    {
        return match ($httpStatusCode) {
            500 => 'Error 500: Internal Server Error. Ocurrió un problema en el servidor de la DIAN.',
            503 => 'Error 503: Service Unavailable. El servicio de la DIAN no está disponible en este momento.',
            507 => 'Error 507: Insufficient Storage. El servidor de la DIAN no tiene suficiente espacio.',
            508 => 'Error 508: Loop Detected. Se ha detectado un bucle en el servidor de la DIAN.',
            403 => 'Error 403: Site Disabled. El sitio de la DIAN está deshabilitado.',
            504 => 'Error 504: Gateway Timeout. La conexión con la DIAN está tardando más de lo esperado. 
                Por favor, intente nuevamente. Si el problema persiste, contacte a soporte técnico.',
            default => 'Error HTTP ' . $httpStatusCode . ': Ha ocurrido un error en la solicitud a la DIAN.',
        };
    }

    /**
     * Get response.
     *
     * @return string
     */
    public function getResponse(): string
    {
        return $this->response;
    }

    /**
     * Get response to object.
     *
     * @return object
     * @throws Exception
     */
    public function getResponseToObject()
    {
        try {
            $xmlResponse = new DOMDocument();
            $xmlResponse->loadXML($this->response);

            return $this->xmlToObject($xmlResponse);
        } catch (\Exception $e) {
            throw new Exception('Class '.get_class($this).': '.$this->to.' '.$this->response);
        }
    }

    /**
     * XML to object.
     *
     * @param mixed $root
     *
     * @return mixed
     */
    protected function xmlToObject($root)
    {
        $regex = '/.:/';
        $dataXML = [];

        if ($root->hasAttributes()) {
            $attrs = $root->attributes;

            foreach ($attrs as $attr) {
                $dataXML['_attributes'][$attr->name] = $attr->value;
            }
        }

        if ($root->hasChildNodes()) {
            $children = $root->childNodes;

            if (1 == $children->length) {
                $child = $children->item(0);

                if (XML_TEXT_NODE == $child->nodeType) {
                    $dataXML['_value'] = $child->nodeValue;

                    return 1 == count($dataXML) ? $dataXML['_value'] : $dataXML;
                }
            }

            $groups = [];

            foreach ($children as $child) {
                if (!isset($dataXML[preg_replace($regex, '', $child->nodeName)])) {
                    $dataXML[preg_replace($regex, '', $child->nodeName)] = $this->xmlToObject($child);
                } else {
                    if (!isset($groups[preg_replace($regex, '', $child->nodeName)])) {
                        $dataXML[preg_replace($regex, '', $child->nodeName)] = array($dataXML[preg_replace($regex, '', $child->nodeName)]);
                        $groups[preg_replace($regex, '', $child->nodeName)] = 1;
                    }

                    $dataXML[preg_replace($regex, '', $child->nodeName)][] = $this->xmlToObject($child);
                }
            }
        }

        return (object) $dataXML;
    }

    /**
     * @throws Exception
     */
    public function __toString()
    {
        return json_encode($this->getResponseToObject());
    }
}
