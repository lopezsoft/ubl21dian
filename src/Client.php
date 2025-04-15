<?php

namespace Lopezsoft\UBL21dian;

use DOMDocument;
use Exception;
use Lopezsoft\UBL21dian\Templates\Template;

/**
 * Client.
 */
class Client
{
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
     * @throws Exception
     */
    public function __construct(Template $template)
    {
        $this->curl = curl_init();

        curl_setopt($this->curl, CURLOPT_URL, $this->to = $template->To);
        curl_setopt($this->curl, CURLOPT_CONNECTTIMEOUT, 30);
        curl_setopt($this->curl, CURLOPT_TIMEOUT, 30);
        curl_setopt($this->curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($this->curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($this->curl, CURLOPT_SSL_VERIFYHOST, false);
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
            throw new Exception('Class '.get_class($this).': '.curl_error($this->curl));
        }

        $this->httpStatusCode = curl_getinfo($this->curl, CURLINFO_HTTP_CODE);

        $this->handleHttpErrors();
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
