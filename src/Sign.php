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
     * @return void
     */
    abstract protected function loadXML();

    /**
     * Construct.
     *
     * @param string|null $pathCertificate
     * @param string|null $passwords
     * @param string|null $xmlString
     * @throws \Exception
     */
    public function __construct(string $pathCertificate = null, string $passwords = null, string $xmlString = null)
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
     */
    public function getDocument()
    {
        return $this->domDocument;
    }

    /**
     * Sign.
     *
     * @param string|null $string
     *
     */
    public function sign(string $string = null): Sign
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
