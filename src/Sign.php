<?php

namespace Lopezsoft\UBL21dian;

use Lopezsoft\UBL21dian\Traits\DIANTrait;

/**
 * Sign.
 */
abstract class Sign
{
    use DIANTrait;

    /**
     * Abstract loadXML.
     *
     * @var void
     */
    abstract protected function loadXML();

    /**
     * Construct.
     *
     * @param string $pathCertificate
     * @param string $passwords
     * @param string $xmlString
     */
    public function __construct($pathCertificate = null, $passwords = null, $xmlString = null)
    {
        $this->pathCertificate = $pathCertificate;
        $this->passwors = $passwords;
        $this->xmlString = $xmlString;

        $this->readCerts();
        $this->identifiersReferences();

        if (!is_null($xmlString)) {
            $this->sign();
        }

        return $this;
    }

    /**
     * Get document.
     *
     * @return DOMDocument
     */
    public function getDocument()
    {
        return $this->domDocument;
    }

    /**
     * Sign.
     *
     * @param string $string
     *
     * @return XAdESDIAN
     */
    public function sign($string = null)
    {
        if (null != $string) {
            $this->xmlString = $string;
        }

        if (!is_null($this->xmlString)) {
            $this->loadXML();
            $this->xml = $this->domDocument->saveXML();
        }

        return $this;
    }
}
