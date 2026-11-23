<?php

namespace Lopezsoft\UBL21dian\Exceptions;

use Exception;
use Throwable;

/**
 * Error de verificación del certificado TLS al conectar con los servicios web de la DIAN.
 *
 * Extiende Exception para que los consumidores que ya capturan Exception sigan funcionando.
 */
class SslCertificateException extends Exception
{
    /**
     * Código de error de cURL que originó la excepción (0 cuando la falla es de configuración local).
     *
     * @var int
     */
    private int $curlErrno;

    /**
     * @param string $message
     * @param int $curlErrno
     * @param Throwable|null $previous
     */
    public function __construct(string $message, int $curlErrno = 0, ?Throwable $previous = null)
    {
        parent::__construct($message, $curlErrno, $previous);
        $this->curlErrno = $curlErrno;
    }

    /**
     * Código de error de cURL (60, 77, 51) o 0 si el CA bundle configurado no es válido.
     *
     * @return int
     */
    public function getCurlErrno(): int
    {
        return $this->curlErrno;
    }
}
